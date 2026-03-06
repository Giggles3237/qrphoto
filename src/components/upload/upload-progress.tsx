"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import type { UploadState } from "./upload-client";

interface UploadProgressProps {
  fileName: string;
  progress: number;
  state: UploadState;
  error?: string;
  previewUrl?: string;
  onRetry: () => void;
  primaryColor: string;
}

export function UploadProgress({
  fileName,
  progress,
  state,
  error,
  previewUrl,
  onRetry,
  primaryColor,
}: UploadProgressProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-background">
      {/* Preview thumbnail */}
      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            File
          </div>
        )}
      </div>

      {/* Info + progress */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName}</p>

        {state === "uploading" && (
          <div className="mt-1.5">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: primaryColor,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
          </div>
        )}

        {state === "error" && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}

        {state === "idle" && (
          <p className="text-xs text-muted-foreground mt-1">Waiting...</p>
        )}
      </div>

      {/* Status icon */}
      <div className="shrink-0">
        {state === "uploading" && (
          <Loader2
            className="h-5 w-5 animate-spin"
            style={{ color: primaryColor }}
          />
        )}
        {state === "success" && (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        )}
        {state === "error" && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}
