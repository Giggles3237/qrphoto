"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PhotoGrid } from "./photo-grid";
import { Lightbox } from "./lightbox";
import type { Media } from "@/types";

interface GalleryClientProps {
  eventId: string;
  initialMedia: Media[];
  primaryColor: string;
}

export function GalleryClient({
  eventId,
  initialMedia,
  primaryColor,
}: GalleryClientProps) {
  const [media, setMedia] = useState<Media[]>(initialMedia);
  const [hasMore, setHasMore] = useState(initialMedia.length === 24);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const lastItem = media[media.length - 1];
    const cursor = lastItem?.uploaded_at;

    try {
      const res = await fetch(
        `/api/media?event_id=${eventId}&cursor=${encodeURIComponent(cursor)}&limit=24`
      );
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setMedia((prev) => [...prev, ...data]);
        setHasMore(data.length === 24);
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [eventId, media, loading, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  if (media.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No photos yet.</p>
      </div>
    );
  }

  return (
    <>
      <PhotoGrid
        media={media}
        onSelect={(index) => setSelectedIndex(index)}
      />

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {loading && (
        <div className="text-center py-4">
          <div
            className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"
            style={{ color: primaryColor }}
          />
        </div>
      )}

      {selectedIndex !== null && (
        <Lightbox
          media={media}
          currentIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onNavigate={setSelectedIndex}
        />
      )}
    </>
  );
}
