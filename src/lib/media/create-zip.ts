import archiver from "archiver";
import { PassThrough } from "stream";
import { Upload } from "@aws-sdk/lib-storage";
import { r2Client, R2_BUCKET } from "@/lib/r2/client";
import { getObjectBuffer, listObjects } from "@/lib/r2/operations";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createEventZip(
  eventId: string,
  jobId: string
): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Update job status to processing
    await supabase
      .from("download_jobs")
      .update({ status: "processing" })
      .eq("id", jobId);

    // List all original files for this event
    const prefix = `events/${eventId}/original/`;
    const objects = await listObjects(prefix);

    if (objects.length === 0) {
      await supabase
        .from("download_jobs")
        .update({ status: "failed", error: "No files to download" })
        .eq("id", jobId);
      return;
    }

    // Create archive
    const archive = archiver("zip", { zlib: { level: 5 } });
    const passthrough = new PassThrough();
    archive.pipe(passthrough);

    // Stream each file into the archive
    let totalBytes = 0;
    for (const obj of objects) {
      const buffer = await getObjectBuffer(obj.key);
      const filename = obj.key.split("/").pop() ?? obj.key;
      archive.append(buffer, { name: filename });
      totalBytes += obj.size;
    }

    archive.finalize();

    // Upload the ZIP to R2
    const zipKey = `events/${eventId}/downloads/${jobId}.zip`;

    const upload = new Upload({
      client: r2Client,
      params: {
        Bucket: R2_BUCKET,
        Key: zipKey,
        Body: passthrough,
        ContentType: "application/zip",
      },
    });

    await upload.done();

    // Update job as ready
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await supabase
      .from("download_jobs")
      .update({
        status: "ready",
        object_key: zipKey,
        file_count: objects.length,
        total_bytes: totalBytes,
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", jobId);
  } catch (error) {
    console.error("ZIP creation error:", error);
    await supabase
      .from("download_jobs")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", jobId);
  }
}
