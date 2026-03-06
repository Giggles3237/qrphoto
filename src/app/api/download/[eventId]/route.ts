import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDownloadUrl } from "@/lib/r2/presign";
import { createEventZip } from "@/lib/media/create-zip";

export async function POST(
  _request: NextRequest,
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

  // Check if there's already an active job
  const admin = createAdminClient();
  const { data: existingJob } = await admin
    .from("download_jobs")
    .select("*")
    .eq("event_id", eventId)
    .in("status", ["pending", "processing"])
    .single();

  if (existingJob) {
    return NextResponse.json({
      jobId: existingJob.id,
      status: existingJob.status,
    });
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

  // Start ZIP creation (fire and forget for MVP)
  createEventZip(eventId, job.id).catch((err) =>
    console.error("ZIP job failed:", err)
  );

  return NextResponse.json({ jobId: job.id, status: "pending" });
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

  const response: Record<string, unknown> = {
    jobId: job.id,
    status: job.status,
    fileCount: job.file_count,
    totalBytes: job.total_bytes,
    error: job.error,
  };

  if (job.status === "ready" && job.object_key) {
    response.downloadUrl = await generateDownloadUrl(job.object_key, 3600);
  }

  return NextResponse.json(response);
}
