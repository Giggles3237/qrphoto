import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Image, Eye, EyeOff } from "lucide-react";

export default async function EventsPage() {
  if (!isSupabaseConfigured()) {
    redirect("/admin/dashboard");
  }

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  // Get media counts
  const eventIds = events?.map((e) => e.id) ?? [];
  const { data: mediaCounts } = await supabase
    .from("media")
    .select("event_id")
    .in("event_id", eventIds.length > 0 ? eventIds : ["__none__"]);

  const countMap: Record<string, number> = {};
  mediaCounts?.forEach((m) => {
    countMap[m.event_id] = (countMap[m.event_id] ?? 0) + 1;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        <Link href="/admin/events/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </Link>
      </div>

      {events && events.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Privacy</TableHead>
                <TableHead>Uploads</TableHead>
                <TableHead className="text-right">Photos</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="font-medium hover:underline"
                    >
                      {event.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      /e/{event.id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{event.brand_key}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        event.privacy_mode === "public"
                          ? "default"
                          : "outline"
                      }
                    >
                      {event.privacy_mode}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {event.upload_enabled ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Image className="h-3 w-3 text-muted-foreground" />
                      {countMap[event.id] ?? 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(event.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No events yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first event to start collecting photos.
          </p>
          <Link href="/admin/events/new">
            <Button>Create Event</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
