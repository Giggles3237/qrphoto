import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTheme } from "@/lib/brands";
import { verifyAccessToken } from "@/lib/utils/passcode";
import { UploadClient } from "@/components/upload/upload-client";
import type { Event, BrandKey, BrandTheme } from "@/types";

export default async function UploadPage({
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

  if (!event.upload_enabled) {
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

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-serif tracking-tight">{theme.heading_text}</h1>
          <p className="text-muted-foreground font-light">
            {theme.subheading_text}
          </p>
        </div>

        <UploadClient
          eventId={event.id}
          maxFileSizeMb={event.max_file_size_mb}
          allowedTypes={event.allowed_types}
          primaryColor={theme.primary_color}
          shareText={theme.share_text}
        />
      </div>
    </div>
  );
}
