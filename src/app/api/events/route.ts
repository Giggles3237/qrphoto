import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEventSchema } from "@/lib/validation/event";
import { hashPasscode } from "@/lib/utils/passcode";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get media counts for each event
    const eventIds = events.map((e) => e.id);
    const { data: mediaCounts } = await supabase
      .from("media")
      .select("event_id")
      .in("event_id", eventIds);

    const countMap: Record<string, number> = {};
    mediaCounts?.forEach((m) => {
      countMap[m.event_id] = (countMap[m.event_id] ?? 0) + 1;
    });

    const eventsWithCounts = events.map((e) => ({
      ...e,
      media_count: countMap[e.id] ?? 0,
    }));

    return NextResponse.json(eventsWithCounts);
  } catch (error) {
    console.error("List events error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { passcode, ...eventData } = parsed.data;

    // Hash passcode if provided
    const insertData: Record<string, unknown> = { ...eventData };
    if (passcode && eventData.privacy_mode === "passcode") {
      insertData.passcode_hash = await hashPasscode(passcode);
    }

    const admin = createAdminClient();
    const { data: event, error } = await admin
      .from("events")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An event with this slug already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
