"use client";

import { useRef, useEffect, useState } from "react";
import type { Media } from "@/types";

interface PhotoGridProps {
  media: Media[];
  onSelect: (index: number) => void;
}

export function PhotoGrid({ media, onSelect }: PhotoGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {media.map((item, index) => (
        <GridItem
          key={item.id}
          media={item}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  );
}

function GridItem({
  media,
  onClick,
}: {
  media: Media;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSrc(`/api/media/${media.id}/url?variant=thumb&redirect=true`);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [media.id]);

  return (
    <div
      ref={ref}
      onClick={onClick}
      className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer transition-transform hover:scale-[1.02]"
    >
      {src && (
        <img
          src={src}
          alt=""
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
      )}
    </div>
  );
}
