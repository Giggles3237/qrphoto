import { after, NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDownloadUrl } from "@/lib/r2/presign";
import { createEventZip, createSelectionZip } from "@/lib/media/create-zip";

async function getEventMediaCount(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string
) {
  const { count } = await admin
    .from("media")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  return count ?? 0;
}

function isStaleDownloadJob(job: { updated_at?: string | null }) {
  if (!job.updated_at) return false;

  const updatedAt = Date.parse(job.updated_at);
  if (Number.isNaN(updatedAt)) return false;

  return Date.now() - updatedAt > 90 * 1000;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let mediaIds: string[] = [];
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { mediaIds?: unknown }
      | null;

    if (Array.isArray(body?.mediaIds)) {
      mediaIds = body.mediaIds.filter(
        (value): value is string => typeof value === "string" && value.length > 0
      );
    }
  }

  const admin = createAdminClient();

  if (mediaIds.length > 0) {
    try {
      const result = await createSelectionZip(eventId, mediaIds);
      const downloadUrl = await generateDownloadUrl(result.objectKey, 3600);

      return NextResponse.json({
        status: "ready",
        fileCount: result.fileCount,
        totalFileCount: result.fileCount,
        totalBytes: result.totalBytes,
        downloadUrl,
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to create download",
        },
        { status: 500 }
      );
    }
  }

  // Check if there's already an active job
  const { data: existingJob } = await admin
    .from("download_jobs")
    .select("*")
    .eq("event_id", eventId)
    .in("status", ["pending", "processing"])
    .single();

  if (existingJob && !isStaleDownloadJob(existingJob)) {
    return NextResponse.json({
      jobId: existingJob.id,
      status: existingJob.status,
      fileCount: existingJob.file_count,
      totalBytes: existingJob.total_bytes,
      totalFileCount: await getEventMediaCount(admin, eventId),
    });
  }

  if (existingJob) {
    await admin
      .from("download_jobs")
      .update({
        status: "failed",
        error: "Download job became stale before finishing",
      })
      .eq("id", existingJob.id);
  }

  // Create a new job
  const { data: job, error } = await admin
    .from("download_jobs")
    .insert({ event_id: eventId, status: "pending" })
    .select()
    .single();

  if (error || !job) {
    return NextResponse.json(
      { error: "Failed to create download job" },
      { status: 500 }
    );
  }

  after(async () => {
    await createEventZip(eventId, job.id);
  });

  return NextResponse.json({
    jobId: job.id,
    status: "pending",
    fileCount: 0,
    totalBytes: 0,
    totalFileCount: await getEventMediaCount(admin, eventId),
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = request.nextUrl.searchParams.get("jobId");

  const admin = createAdminClient();

  let query = admin.from("download_jobs").select("*").eq("event_id", eventId);

  if (jobId) {
    query = query.eq("id", jobId);
  } else {
    query = query.order("created_at", { ascending: false }).limit(1);
  }

  const { data: job } = await query.single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (
    (job.status === "pending" || job.status === "processing") &&
    isStaleDownloadJob(job)
  ) {
    await admin
      .from("download_jobs")
      .update({
        status: "failed",
        error: "Download job stopped before finishing. Please try again.",
      })
      .eq("id", job.id);

    return NextResponse.json({
      jobId: job.id,
      status: "failed",
      fileCount: job.file_count,
      totalFileCount: await getEventMediaCount(admin, eventId),
      totalBytes: job.total_bytes,
      error: "Download job stopped before finishing. Please try again.",
    });
  }

  const response: Record<string, unknown> = {
    jobId: job.id,
    status: job.status,
    fileCount: job.file_count,
    totalFileCount: await getEventMediaCount(admin, eventId),
    totalBytes: job.total_bytes,
    error: job.error,
  };

  if (job.status === "ready" && job.object_key) {
    response.downloadUrl = await generateDownloadUrl(job.object_key, 3600);
  }

  return NextResponse.json(response);
}
