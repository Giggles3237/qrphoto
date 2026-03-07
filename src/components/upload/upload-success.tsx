"use client";

import { CheckCircle2, Plus, Facebook, Share2 } from "lucide-react";
import type { Media } from "@/types";

interface UploadSuccessProps {
  count: number;
  onUploadMore: () => void;
  primaryColor: string;
  lastMedia?: Media | null;
}

export function UploadSuccess({
  count,
  onUploadMore,
  primaryColor,
  lastMedia,
}: UploadSuccessProps) {
  const handleShare = async () => {
    const shareData = {
      title: "My Photo from the Event",
      text: "Check out this photo I just uploaded! #WeddingPhotos #QRPhoto",
      url: window.location.href.replace("/upload", "/gallery"),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      // Fallback to Facebook sharer
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}&quote=${encodeURIComponent(shareData.text)}`;
      window.open(fbUrl, "_blank");
    }
  };

  return (
    <div className="text-center py-8 space-y-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-muted/50 p-6 shadow-sm">
      <div className="relative inline-block">
        <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 animate-in zoom-in duration-300" />
        <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-ping" />
      </div>
      
      <div>
        <h3 className="text-2xl font-serif tracking-tight">
          {count} {count === 1 ? "Photo" : "Photos"} Shared!
        </h3>
        <p className="text-muted-foreground mt-2 font-light">
          {lastMedia?.uploader_name 
            ? `Thank you, ${lastMedia.uploader_name}, for sharing your memories.`
            : "Thank you for sharing your photos with us."}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleShare}
          className="inline-flex items-center justify-center gap-3 rounded-full border-2 px-8 py-4 font-medium transition-all hover:bg-muted/50"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          <Facebook className="h-5 w-5" />
          Share to Facebook
        </button>

        <button
          onClick={onUploadMore}
          className="inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 font-medium text-white transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="h-5 w-5" />
          Upload More
        </button>
      </div>
    </div>
  );
}
