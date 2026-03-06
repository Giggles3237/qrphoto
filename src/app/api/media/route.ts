import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const eventId = searchParams.get("event_id");
  const status = searchParams.get("status");
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") ?? "24", 10);

  const supabase = createAdminClient();

  let query = supabase
    .from("media")
    .select("*")
    .eq("status", status ?? "ready")
    .order("uploaded_at", { ascending: false })
    .limit(limit);

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  if (cursor) {
    query = query.lt("uploaded_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
