"use client";

import { CheckCircle2, Plus } from "lucide-react";

interface UploadSuccessProps {
  count: number;
  onUploadMore: () => void;
  primaryColor: string;
}

export function UploadSuccess({
  count,
  onUploadMore,
  primaryColor,
}: UploadSuccessProps) {
  return (
    <div className="text-center py-6 space-y-4">
      <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
      <div>
        <h3 className="text-xl font-semibold">
          {count} photo{count !== 1 ? "s" : ""} uploaded!
        </h3>
        <p className="text-muted-foreground mt-1">
          Thank you for sharing your photos.
        </p>
      </div>
      <button
        onClick={onUploadMore}
        className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-transform active:scale-[0.98]"
        style={{ backgroundColor: primaryColor }}
      >
        <Plus className="h-5 w-5" />
        Upload More
      </button>
    </div>
  );
}
