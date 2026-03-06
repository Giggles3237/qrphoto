import { notFound, redirect } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventForm } from "@/components/admin/event-form";
import { MediaGrid } from "@/components/admin/media-grid";
import { QRDisplay } from "@/components/admin/qr-display";
import { EventDangerZone } from "@/components/admin/event-danger-zone";
import type { Event, Media } from "@/types";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  if (!isSupabaseConfigured()) redirect("/admin/dashboard");
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single<Event>();

  if (!event) notFound();

  const { data: media } = await supabase
    .from("media")
    .select("*")
    .eq("event_id", eventId)
    .order("uploaded_at", { ascending: false })
    .returns<Media[]>();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{event.name}</h1>
        <p className="text-muted-foreground">/e/{event.id}</p>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="media">
            Media ({media?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="qr">QR Code</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <EventForm event={event} mode="edit" />
        </TabsContent>

        <TabsContent value="media" className="mt-6">
          <MediaGrid media={media ?? []} eventId={eventId} />
        </TabsContent>

        <TabsContent value="qr" className="mt-6">
          <QRDisplay eventId={eventId} eventName={event.name} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <EventDangerZone eventId={eventId} eventName={event.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
