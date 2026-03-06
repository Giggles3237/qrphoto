import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateUploadUrl } from "@/lib/r2/presign";
import {
  generateFileId,
  getExtensionFromMime,
  buildObjectKey,
  validateFileType,
  validateFileSize,
} from "@/lib/utils/file";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { verifyAccessToken } from "@/lib/utils/passcode";
import type { Event } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, contentType, fileSize } = body;

    if (!eventId || !contentType || !fileSize) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, contentType, fileSize" },
        { status: 400 }
      );
    }

    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rateLimitKey = `upload:${ip}:${eventId}`;
    const { allowed, remaining } = checkRateLimit(rateLimitKey, 30, 10 * 60 * 1000);

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
      );
    }

    // Look up event
    const supabase = createAdminClient();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single<Event>();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check upload enabled
    if (!event.upload_enabled) {
      return NextResponse.json(
        { error: "Uploads are currently disabled for this event" },
        { status: 403 }
      );
    }

    // Check date window
    const now = new Date();
    if (event.starts_at && new Date(event.starts_at) > now) {
      return NextResponse.json(
        { error: "This event has not started yet" },
        { status: 403 }
      );
    }
    if (event.ends_at && new Date(event.ends_at) < now) {
      return NextResponse.json(
        { error: "This event has ended" },
        { status: 403 }
      );
    }

    // Check passcode if required
    if (event.privacy_mode === "passcode" && event.passcode_hash) {
      const accessToken = request.cookies.get(`event_access_${eventId}`)?.value;
      if (!accessToken || !verifyAccessToken(accessToken, eventId)) {
        return NextResponse.json(
          { error: "Passcode required" },
          { status: 403 }
        );
      }
    }

    // Validate file type
    if (!validateFileType(contentType, event.allowed_types)) {
      return NextResponse.json(
        {
          error: `File type not allowed. Accepted: ${event.allowed_types.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (!validateFileSize(fileSize, event.max_file_size_mb)) {
      return NextResponse.json(
        { error: `File too large. Maximum: ${event.max_file_size_mb}MB` },
        { status: 400 }
      );
    }

    // Generate presigned URL
    const fileId = generateFileId();
    const ext = getExtensionFromMime(contentType);
    const objectKey = buildObjectKey(eventId, fileId, ext, "original");
    const uploadUrl = await generateUploadUrl(objectKey, contentType);

    return NextResponse.json({
      uploadUrl,
      objectKey,
      fileId,
    });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
