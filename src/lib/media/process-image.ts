import sharp from "sharp";
import { getObjectBuffer, putBuffer } from "@/lib/r2/operations";
import { buildObjectKey } from "@/lib/utils/file";

interface ProcessResult {
  thumbKey: string;
  webKey: string;
  width: number;
  height: number;
}

export async function processImage(
  originalKey: string,
  eventId: string,
  fileId: string
): Promise<ProcessResult> {
  // Download original from R2
  const originalBuffer = await getObjectBuffer(originalKey);

  // Get metadata
  const metadata = await sharp(originalBuffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  // Generate thumbnail (200x200, cover crop)
  const thumbBuffer = await sharp(originalBuffer)
    .rotate() // Auto-rotate based on EXIF
    .resize(200, 200, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();

  // Generate web-optimized (max 1200px wide, maintain aspect ratio)
  const webBuffer = await sharp(originalBuffer)
    .rotate()
    .resize(1200, null, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  // Build object keys for derived versions
  const thumbKey = buildObjectKey(eventId, fileId, "jpg", "thumb");
  const webKey = buildObjectKey(eventId, fileId, "jpg", "web");

  // Upload derived versions to R2
  await Promise.all([
    putBuffer(thumbKey, thumbBuffer, "image/jpeg"),
    putBuffer(webKey, webBuffer, "image/jpeg"),
  ]);

  return { thumbKey, webKey, width, height };
}
