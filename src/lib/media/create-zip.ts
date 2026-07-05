import archiver from "archiver";
import { PassThrough } from "stream";
import { Upload } from "@aws-sdk/lib-storage";
import { r2Client, R2_BUCKET } from "@/lib/r2/client";
import { getObjectStream, listObjects } from "@/lib/r2/operations";
import { createAdminClient } from "@/lib/supabase/admin";

interface MediaZipItem {
  id: string;
  object_key_original: string;
  size_bytes: number | null;
}

interface ZipResult {
  objectKey: string;
  fileCount: number;
  totalBytes: number;
  expiresAt: string;
}

async function uploadZipFromObjects(
  objects: { key: string; size: number }[],
  zipKey: string,
  onProgress?: (progress: {
    fileCount: number;
    totalBytes: number;
  }) => Promise<void> | void
): Promise<{ fileCount: number; totalBytes: number }> {
  const archive = archiver("zip", { zlib: { level: 5 } });
  const passthrough = new PassThrough({ highWaterMark: 1024 * 1024 });
  archive.pipe(passthrough);

  let totalBytes = 0;
  let fileCount = 0;
  const progressUpdates: Promise<void>[] = [];

  archive.on("entry", () => {
    const obj = objects[fileCount];
    fileCount += 1;
    totalBytes += obj?.size ?? 0;

    const update = onProgress?.({ fileCount, totalBytes });
    if (update) {
      progressUpdates.push(Promise.resolve(update));
    }
  });

  archive.on("error", (error) => {
    passthrough.destroy(error);
  });

  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: R2_BUCKET,
      Key: zipKey,
      Body: passthrough,
      ContentType: "application/zip",
    },
  });

  const uploadPromise = upload.done();

  for (const obj of objects) {
    const stream = await getObjectStream(obj.key);
    const filename = obj.key.split("/").pop() ?? obj.key;
    archive.append(stream, { name: filename });
  }

  await archive.finalize();
  await uploadPromise;
  await Promise.all(progressUpdates);

  return {
    fileCount,
    totalBytes,
  };
}

function toZipObject(item: MediaZipItem) {
  return {
    key: item.object_key_original,
    size: item.size_bytes ?? 0,
  };
}

export async function createSelectionZip(
  eventId: string,
  mediaIds: string[]
): Promise<ZipResult> {
  const supabase = createAdminClient();
  const uniqueMediaIds = [...new Set(mediaIds)];

  const { data: media, error } = await supabase
    .from("media")
    .select("id, object_key_original, size_bytes")
    .eq("event_id", eventId)
    .eq("status", "ready")
    .in("id", uniqueMediaIds);

  if (error) {
    throw new Error(error.message);
  }

  const items = (media ?? []) as MediaZipItem[];

  if (items.length === 0) {
    throw new Error("No selected files were found");
  }

  if (items.length !== uniqueMediaIds.length) {
    throw new Error("Some selected files are unavailable");
  }

  const zipKey = `events/${eventId}/downloads/selection-${Date.now()}.zip`;
  const { fileCount, totalBytes } = await uploadZipFromObjects(
    items.map(toZipObject),
    zipKey
  );

  return {
    objectKey: zipKey,
    fileCount,
    totalBytes,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function createEventZip(
  eventId: string,
  jobId: string
): Promise<void> {
  const supabase = createAdminClient();

  try {
    await supabase
      .from("download_jobs")
      .update({ status: "processing" })
      .eq("id", jobId);

    const prefix = `events/${eventId}/original/`;
    const objects = await listObjects(prefix);
    const expectedTotalBytes = objects.reduce((sum, obj) => sum + obj.size, 0);

    if (objects.length === 0) {
      await supabase
        .from("download_jobs")
        .update({ status: "failed", error: "No files to download" })
        .eq("id", jobId);
      return;
    }

    await supabase
      .from("download_jobs")
      .update({ file_count: 0, total_bytes: expectedTotalBytes })
      .eq("id", jobId);

    const zipKey = `events/${eventId}/downloads/${jobId}.zip`;
    const progressInterval = Math.max(1, Math.ceil(objects.length / 20));
    const { fileCount, totalBytes } = await uploadZipFromObjects(
      objects,
      zipKey,
      async ({ fileCount: processedCount }) => {
        if (
          processedCount === objects.length ||
          processedCount % progressInterval === 0
        ) {
          await supabase
            .from("download_jobs")
            .update({ file_count: processedCount })
            .eq("id", jobId);
        }
      }
    );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await supabase
      .from("download_jobs")
      .update({
        status: "ready",
        object_key: zipKey,
        file_count: fileCount,
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
