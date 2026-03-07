import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTheme } from "@/lib/brands";
import type { Event, BrandKey, BrandTheme } from "@/types";

export default async function EventLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-4xl font-bold text-muted-foreground">Setup Required</h1>
          <p className="text-muted-foreground">
            Supabase is not configured. Please set up your environment variables
            to view events.
          </p>
        </div>
      </div>
    );
  }

  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", slug)
    .single<Event>();

  if (!event) notFound();

  const theme = resolveTheme(
    event.brand_key as BrandKey,
    event.theme as Partial<BrandTheme>
  );

  const blurValue = theme.background_blur ?? 0;
  const opacityValue = (theme.background_opacity ?? 50) / 100;
  // Convert hex background color to RGB for the overlay with opacity
  const bgColor = theme.background_color || "#FFFFFF";

  return (
    <div
      className="min-h-screen relative"
      style={
        {
          "--event-primary": theme.primary_color,
          "--event-accent": theme.accent_color,
          "--event-bg": bgColor,
          backgroundColor: "var(--event-bg)",
        } as React.CSSProperties
      }
    >
      {/* Background Image Layer */}
      {theme.background_url && (
        <div className="fixed inset-0 z-0">
          <img
            src={theme.background_url}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: `blur(${blurValue}px)` }}
          />
          {/* Subtle overlay to ensure text readability */}
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundColor: bgColor,
              opacity: opacityValue 
            }} 
          />
        </div>
      )}

      <div className="min-h-screen flex flex-col relative z-10">
        {/* Header */}
        <header className="flex flex-col items-center sticky top-0 z-10 pt-8 pb-4 bg-gradient-to-b from-[var(--event-bg)] via-[var(--event-bg)]/95 to-transparent px-4">
          {theme.logo_url && (
            <Link href={`/e/${slug}`} className="transition-transform hover:scale-105 mb-6">
              <div className={`relative overflow-hidden flex items-center justify-center bg-white shadow-md rounded-full h-32 w-32 ${!theme.logo_rounded ? 'p-4' : ''}`}>
                <img
                  src={theme.logo_url}
                  alt="Event logo"
                  className={theme.logo_rounded ? 'h-full w-full object-cover' : 'max-h-full max-w-full object-contain'}
                />
              </div>
            </Link>
          )}
          
          <nav className="flex items-center gap-1 sm:gap-4 text-sm font-medium">
            <Link 
              href={`/e/${slug}`} 
              className="px-3 py-1.5 rounded-full transition-colors hover:bg-muted/50"
              style={{ color: "var(--event-accent)" }}
            >
              Home
            </Link>
            {event.gallery_enabled && (
              <Link 
                href={`/e/${slug}/gallery`} 
                className="px-3 py-1.5 rounded-full transition-colors hover:bg-muted/50"
                style={{ color: "var(--event-accent)" }}
              >
                Gallery
              </Link>
            )}
            {event.guest_book_enabled && (
              <Link 
                href={`/e/${slug}/guest-book`} 
                className="px-3 py-1.5 rounded-full transition-colors hover:bg-muted/50"
                style={{ color: "var(--event-accent)" }}
              >
                Guest Book
              </Link>
            )}
          </nav>
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Footer disclaimer */}
        {theme.disclaimer_text && (
          <footer className="p-4 text-center">
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {theme.disclaimer_text}
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}
