import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPasscode, generateAccessToken } from "@/lib/utils/passcode";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const body = await request.json();
  const { passcode } = body;

  if (!passcode) {
    return NextResponse.json(
      { error: "Passcode is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("passcode_hash, privacy_mode")
    .eq("id", eventId)
    .single();

  if (!event || event.privacy_mode !== "passcode" || !event.passcode_hash) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const valid = await verifyPasscode(passcode, event.passcode_hash);

  if (!valid) {
    return NextResponse.json(
      { error: "Incorrect passcode" },
      { status: 403 }
    );
  }

  // Generate access token and set as cookie
  const token = generateAccessToken(eventId);
  const response = NextResponse.json({ success: true });

  response.cookies.set(`event_access_${eventId}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60, // 24 hours
    path: `/e/${eventId}`,
  });

  return response;
}
