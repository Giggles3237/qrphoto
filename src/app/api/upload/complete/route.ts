import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headObject } from "@/lib/r2/operations";
import { processImage } from "@/lib/media/process-image";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, fileId, objectKey, contentType, fileSize } = body;

    if (!eventId || !fileId || !objectKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the object exists in R2
    const head = await headObject(objectKey);
    if (!head) {
      return NextResponse.json(
        { error: "Upload not found in storage" },
        { status: 404 }
      );
    }

    const supabase = createAdminClient();

    // Create media record
    const { data: media, error: insertError } = await supabase
      .from("media")
      .insert({
        event_id: eventId,
        object_key_original: objectKey,
        type: contentType?.startsWith("video/") ? "video" : "image",
        size_bytes: fileSize ?? head.contentLength,
        mime_type: contentType ?? head.contentType,
        status: "processing",
        uploader_fingerprint:
          request.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
      })
      .select()
      .single();

    if (insertError || !media) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create media record" },
        { status: 500 }
      );
    }

    // Process image (generate thumbnails) - synchronous for MVP
    if (media.type === "image") {
      try {
        const result = await processImage(objectKey, eventId, fileId);
        await supabase
          .from("media")
          .update({
            object_key_thumb: result.thumbKey,
            object_key_web: result.webKey,
            width: result.width,
            height: result.height,
            status: "ready",
          })
          .eq("id", media.id);

        return NextResponse.json({
          ...media,
          object_key_thumb: result.thumbKey,
          object_key_web: result.webKey,
          width: result.width,
          height: result.height,
          status: "ready",
        });
      } catch (processError) {
        console.error("Processing error:", processError);
        await supabase
          .from("media")
          .update({ status: "failed" })
          .eq("id", media.id);

        // Still return success - the upload was saved, processing just failed
        return NextResponse.json({ ...media, status: "failed" });
      }
    }

    // For videos, just mark as ready (no processing in MVP)
    await supabase
      .from("media")
      .update({ status: "ready" })
      .eq("id", media.id);

    return NextResponse.json({ ...media, status: "ready" });
  } catch (error) {
    console.error("Upload complete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
