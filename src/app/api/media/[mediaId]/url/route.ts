import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDownloadUrl } from "@/lib/r2/presign";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const variant = request.nextUrl.searchParams.get("variant") ?? "thumb";
  const shouldRedirect = request.nextUrl.searchParams.get("redirect") === "true";

  const supabase = createAdminClient();
  const { data: media } = await supabase
    .from("media")
    .select("*")
    .eq("id", mediaId)
    .single();

  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  let objectKey: string | null = null;
  switch (variant) {
    case "original":
      objectKey = media.object_key_original;
      break;
    case "web":
      objectKey = media.object_key_web ?? media.object_key_original;
      break;
    case "thumb":
    default:
      objectKey = media.object_key_thumb ?? media.object_key_original;
      break;
  }

  if (!objectKey) {
    return NextResponse.json({ error: "Variant not available" }, { status: 404 });
  }

  const url = await generateDownloadUrl(objectKey, 3600);

  if (shouldRedirect) {
    return NextResponse.redirect(url);
  }

  return NextResponse.json({
    url,
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  });
}
