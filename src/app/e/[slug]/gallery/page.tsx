import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTheme } from "@/lib/brands";
import { verifyAccessToken } from "@/lib/utils/passcode";
import { GalleryClient } from "@/components/gallery/gallery-client";
import type { Event, Media, BrandKey, BrandTheme } from "@/types";

export default async function GalleryPage({
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

  if (!event.gallery_enabled) {
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

  // Initial media fetch
  const { data: media } = await supabase
    .from("media")
    .select("*")
    .eq("event_id", slug)
    .eq("status", "ready")
    .order("uploaded_at", { ascending: false })
    .limit(24)
    .returns<Media[]>();

  return (
    <div className="flex-1 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl tracking-tight text-center" style={{ color: "var(--event-accent)", fontFamily: "var(--event-heading-font)" }}>
          {theme.heading_text}
        </h1>
        <GalleryClient
          eventId={slug}
          initialMedia={media ?? []}
          primaryColor={theme.accent_color}
        />
      </div>
    </div>
  );
}
