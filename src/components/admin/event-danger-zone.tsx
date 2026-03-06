"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface EventDangerZoneProps {
  eventId: string;
  eventName: string;
}

export function EventDangerZone({ eventId, eventName }: EventDangerZoneProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/events");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete event");
      }
    } catch {
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>
          Permanently delete this event and all associated photos. This cannot
          be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm">
            Type <strong>{eventName}</strong> to confirm deletion:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={eventName}
          />
        </div>

        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={confirmText !== eventName || deleting}
        >
          {deleting ? "Deleting..." : "Delete Event"}
        </Button>
      </CardContent>
    </Card>
  );
}
