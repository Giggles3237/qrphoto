import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTheme } from "@/lib/brands";
import { verifyAccessToken } from "@/lib/utils/passcode";
import type { Event, BrandKey, BrandTheme } from "@/types";
import { Camera, Images, MessageSquare } from "lucide-react";

export default async function EventLandingPage({
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

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-md space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-foreground">{theme.heading_text}</h1>
          <p className="text-muted-foreground text-lg px-6 font-light">{theme.subheading_text}</p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs mx-auto pt-6">
          {event.upload_enabled && (
            <Link
              href={`/e/${slug}/upload`}
              className="inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 text-lg font-medium text-white transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              style={{ backgroundColor: "var(--event-accent)", color: "var(--event-primary)" }}
            >
              <Camera className="h-5 w-5" />
              {theme.button_label ?? "Upload Photos"}
            </Link>
          )}

          {event.gallery_enabled && (
            <Link
              href={`/e/${slug}/gallery`}
              className="inline-flex items-center justify-center gap-3 rounded-full border px-8 py-4 text-lg font-medium transition-all hover:bg-muted/50"
              style={{ borderColor: "var(--event-accent)", color: "var(--event-accent)" }}
            >
              <Images className="h-5 w-5" />
              View Gallery
            </Link>
          )}

          {event.guest_book_enabled && (
            <>
              <Link
                href={`/e/${slug}/guest-book`}
                className="inline-flex items-center justify-center gap-3 rounded-full border px-8 py-4 text-lg font-medium transition-all hover:bg-muted/50"
                style={{ borderColor: "var(--event-accent)", color: "var(--event-accent)" }}
              >
                <MessageSquare className="h-5 w-5" />
                Sign Guest Book
              </Link>
              <Link
                href={`/e/${slug}/guest-book`}
                className="inline-flex items-center justify-center gap-3 rounded-full border px-8 py-4 text-lg font-medium transition-all hover:bg-muted/50"
                style={{ borderColor: "var(--event-accent)", color: "var(--event-accent)" }}
              >
                View Guest Book
              </Link>
            </>
          )}
        </div>

        {!event.upload_enabled && !event.gallery_enabled && !event.guest_book_enabled && (
          <p className="text-muted-foreground italic mt-8">
            This event is not currently active.
          </p>
        )}
      </div>
    </div>
  );
}
