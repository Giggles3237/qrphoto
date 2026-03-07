"use client";

import { useState, useCallback } from "react";
import { UploadZone } from "./upload-zone";
import { UploadProgress } from "./upload-progress";
import { UploadSuccess } from "./upload-success";

interface UploadClientProps {
  eventId: string;
  maxFileSizeMb: number;
  allowedTypes: string[];
  primaryColor: string;
}

export type UploadState = "idle" | "uploading" | "success" | "error";

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  state: UploadState;
  error?: string;
  previewUrl?: string;
}

export function UploadClient({
  eventId,
  maxFileSizeMb,
  allowedTypes,
  primaryColor,
}: UploadClientProps) {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [uploaderName, setUploaderName] = useState("");
  const [lastUploadedMedia, setLastUploadedMedia] = useState<any>(null);

  const updateUpload = useCallback(
    (id: string, updates: Partial<UploadFile>) => {
      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
      );
    },
    []
  );

  async function uploadFile(file: File, uploadId: string) {
    try {
      // Step 1: Get presigned URL
      updateUpload(uploadId, { state: "uploading", progress: 5 });

      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json();
        throw new Error(data.error || "Failed to prepare upload");
      }

      const { uploadUrl, objectKey, fileId } = await presignRes.json();
      updateUpload(uploadId, { progress: 10 });

      // Step 2: Upload to R2 via presigned URL using XHR for progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = 10 + Math.round((e.loaded / e.total) * 80);
            updateUpload(uploadId, { progress: pct });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      updateUpload(uploadId, { progress: 92 });

      // Step 3: Notify completion
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          fileId,
          objectKey,
          contentType: file.type,
          fileSize: file.size,
          uploaderName: uploaderName.trim() || null,
        }),
      });

      if (!completeRes.ok) {
        throw new Error("Failed to process upload");
      }

      const mediaData = await completeRes.json();
      setLastUploadedMedia(mediaData);
      updateUpload(uploadId, { state: "success", progress: 100 });
      setTotalCompleted((prev) => prev + 1);
    } catch (error) {
      updateUpload(uploadId, {
        state: "error",
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }

  function handleFiles(files: File[]) {
    const newUploads: UploadFile[] = files.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      progress: 0,
      state: "idle" as const,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Start uploads sequentially
    newUploads.reduce((chain, upload) => {
      return chain.then(() => uploadFile(upload.file, upload.id));
    }, Promise.resolve());
  }

  function handleRetry(uploadId: string) {
    const upload = uploads.find((u) => u.id === uploadId);
    if (upload) {
      updateUpload(uploadId, { state: "idle", progress: 0, error: undefined });
      uploadFile(upload.file, uploadId);
    }
  }

  function handleUploadMore() {
    setUploads([]);
  }

  const activeUploads = uploads.filter((u) => u.state === "uploading");
  const hasUploads = uploads.length > 0;
  const allDone =
    hasUploads && uploads.every((u) => u.state === "success" || u.state === "error");
  const successCount = uploads.filter((u) => u.state === "success").length;

  return (
    <div className="space-y-4">
      {(!hasUploads || allDone) && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="uploader-name" className="text-sm font-medium px-1">
              Your Name (Optional)
            </label>
            <input
              id="uploader-name"
              type="text"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              placeholder="e.g. The Johnsons"
              className="w-full rounded-full border border-muted-foreground/20 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 backdrop-blur-sm"
            />
          </div>
          <UploadZone
            onFiles={handleFiles}
            maxFileSizeMb={maxFileSizeMb}
            allowedTypes={allowedTypes}
            primaryColor={primaryColor}
          />
        </div>
      )}

      {hasUploads && (
        <div className="space-y-3">
          {uploads.map((upload) => (
            <UploadProgress
              key={upload.id}
              fileName={upload.file.name}
              progress={upload.progress}
              state={upload.state}
              error={upload.error}
              previewUrl={upload.previewUrl}
              onRetry={() => handleRetry(upload.id)}
              primaryColor={primaryColor}
            />
          ))}
        </div>
      )}

      {allDone && successCount > 0 && (
        <UploadSuccess
          count={totalCompleted}
          onUploadMore={handleUploadMore}
          primaryColor={primaryColor}
          lastMedia={lastUploadedMedia}
        />
      )}

      {activeUploads.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          Uploading {activeUploads.length} file
          {activeUploads.length !== 1 ? "s" : ""}... Please keep this page open.
        </p>
      )}
    </div>
  );
}
