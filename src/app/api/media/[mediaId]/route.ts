import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteObject } from "@/lib/r2/operations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const supabase = createAdminClient();

  const { data: media, error } = await supabase
    .from("media")
    .select("*")
    .eq("id", mediaId)
    .single();

  if (error || !media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  return NextResponse.json(media);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get media record first
  const { data: media } = await admin
    .from("media")
    .select("*")
    .eq("id", mediaId)
    .single();

  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // Delete R2 objects
  const deletePromises = [deleteObject(media.object_key_original)];
  if (media.object_key_thumb) deletePromises.push(deleteObject(media.object_key_thumb));
  if (media.object_key_web) deletePromises.push(deleteObject(media.object_key_web));

  try {
    await Promise.allSettled(deletePromises);
  } catch (err) {
    console.error("R2 delete error:", err);
  }

  // Delete DB record
  const { error } = await admin.from("media").delete().eq("id", mediaId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
