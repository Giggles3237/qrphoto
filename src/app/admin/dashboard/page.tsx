import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDays, Image, Upload, AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Setup Required
            </CardTitle>
            <CardDescription>
              Supabase is not configured. To get started:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Create a Supabase project at{" "}
                <a
                  href="https://supabase.com"
                  className="underline text-primary"
                  target="_blank"
                >
                  supabase.com
                </a>
              </li>
              <li>
                Run the SQL schema from{" "}
                <code className="bg-muted px-1 rounded">supabase-schema.sql</code>{" "}
                in the SQL Editor
              </li>
              <li>
                Copy your project URL and keys into{" "}
                <code className="bg-muted px-1 rounded">.env.local</code>
              </li>
              <li>
                Set up a Cloudflare R2 bucket and add those credentials too
              </li>
              <li>Restart the dev server</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ count: eventCount }, { count: mediaCount }, { data: recentMedia }] =
    await Promise.all([
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase.from("media").select("*", { count: "exact", head: true }),
      supabase
        .from("media")
        .select("id, event_id, mime_type, uploaded_at")
        .order("uploaded_at", { ascending: false })
        .limit(5),
    ]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mediaCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Upload</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentMedia?.[0]
                ? new Date(recentMedia[0].uploaded_at).toLocaleDateString()
                : "None"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
          <CardDescription>Latest photos across all events</CardDescription>
        </CardHeader>
        <CardContent>
          {recentMedia && recentMedia.length > 0 ? (
            <div className="space-y-2">
              {recentMedia.map((media) => (
                <div
                  key={media.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="text-sm">
                    <span className="font-medium">{media.event_id}</span>
                    <span className="text-muted-foreground ml-2">
                      {media.mime_type}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(media.uploaded_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No uploads yet. Create an event and start collecting photos!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
