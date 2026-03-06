"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Download, Image as ImageIcon } from "lucide-react";
import type { Media } from "@/types";

interface MediaGridProps {
  media: Media[];
  eventId: string;
}

export function MediaGrid({ media, eventId }: MediaGridProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleDelete(mediaId: string) {
    setDeleting(mediaId);
    try {
      const res = await fetch(`/api/media/${mediaId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDelete(null);
        router.refresh();
      }
    } finally {
      setDeleting(null);
    }
  }

  async function handleDownloadAll() {
    try {
      const res = await fetch(`/api/download/${eventId}`, { method: "POST" });
      const data = await res.json();
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      } else if (data.jobId) {
        // Poll for completion
        pollDownloadJob(data.jobId);
      }
    } catch (error) {
      console.error("Download error:", error);
    }
  }

  async function pollDownloadJob(jobId: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/download/${eventId}?jobId=${jobId}`);
      const data = await res.json();
      if (data.status === "ready" && data.downloadUrl) {
        clearInterval(interval);
        window.open(data.downloadUrl, "_blank");
      } else if (data.status === "failed") {
        clearInterval(interval);
        alert("Download failed. Please try again.");
      }
    }, 2000);
  }

  if (media.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No uploads yet</h3>
        <p className="text-muted-foreground">
          Share the QR code to start collecting photos.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {media.length} photo{media.length !== 1 ? "s" : ""}
        </p>
        <Button variant="outline" size="sm" onClick={handleDownloadAll}>
          <Download className="h-4 w-4 mr-2" />
          Download All
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {media.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-square rounded-lg overflow-hidden border bg-muted"
          >
            {item.object_key_thumb ? (
              <img
                src={`/api/media/${item.id}/url?variant=thumb`}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={() => setConfirmDelete(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {item.status !== "ready" && (
              <div className="absolute top-1 right-1">
                <Badge
                  variant={item.status === "failed" ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  {item.status}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Photo</DialogTitle>
            <DialogDescription>
              This will permanently delete this photo and all its derivatives.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={!!deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
