import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTheme } from "@/lib/brands";
import { verifyAccessToken } from "@/lib/utils/passcode";
import { GuestBookClient } from "@/components/gallery/guest-book-client";
import type { Event, GuestBookEntry, BrandKey, BrandTheme } from "@/types";

export default async function GuestBookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", slug)
    .single<Event>();

  if (!event) notFound();

  if (!event.guest_book_enabled) {
    redirect(`/e/${slug}`);
  }

  // Check passcode protection
  if (event.privacy_mode === "passcode" && event.passcode_hash) {
    const cookieStore = await cookies();
    const token = cookieStore.get(`event_access_${slug}`)?.value;
    if (!token || !verifyAccessToken(token, slug)) {
      redirect(`/e/${slug}/passcode`);
    }
  }

  const theme = resolveTheme(
    event.brand_key as BrandKey,
    event.theme as Partial<BrandTheme>
  );

  // Initial entries fetch
  const { data: entries } = await supabase
    .from("guest_book_entries")
    .select("*")
    .eq("event_id", slug)
    .order("created_at", { ascending: false })
    .returns<GuestBookEntry[]>();

  return (
    <div className="flex-1 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-serif tracking-tight text-center">
          {event.name} Guest Book
        </h1>
        <GuestBookClient
          eventId={slug}
          initialEntries={entries ?? []}
          primaryColor={theme.accent_color}
        />
      </div>
    </div>
  );
}
