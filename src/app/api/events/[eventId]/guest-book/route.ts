import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("guest_book_entries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const { name, message, media_url, media_type } = await request.json();

  if (!name || (!message && !media_url)) {
    return NextResponse.json(
      { error: "Name and either a message or a recording are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  
  // Verify event exists and guest book is enabled
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("guest_book_enabled")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (!event.guest_book_enabled) {
    return NextResponse.json(
      { error: "Guest book is disabled for this event" },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("guest_book_entries")
    .insert({
      event_id: eventId,
      name,
      message,
      media_url,
      media_type,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const { entryId } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("guest_book_entries")
    .delete()
    .eq("id", entryId)
    .eq("event_id", eventId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
