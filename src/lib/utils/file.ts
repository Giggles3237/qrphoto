import { nanoid } from "nanoid";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

export function getExtensionFromMime(mime: string): string {
  return MIME_TO_EXT[mime] ?? "bin";
}

export function generateFileId(): string {
  return nanoid(16);
}

export function buildObjectKey(
  eventId: string,
  fileId: string,
  ext: string,
  variant: "original" | "thumb" | "web" = "original"
): string {
  if (variant === "original") {
    return `events/${eventId}/original/${fileId}.${ext}`;
  }
  return `events/${eventId}/derived/${variant}/${fileId}.jpg`;
}

export function validateFileType(
  mime: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(mime);
}

export function validateFileSize(bytes: number, maxMb: number): boolean {
  return bytes <= maxMb * 1024 * 1024;
}
