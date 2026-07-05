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
import {
  Trash2,
  Download,
  Image as ImageIcon,
  Check,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import type { Media } from "@/types";

interface MediaGridProps {
  media: Media[];
  eventId: string;
}

interface DownloadResponse {
  downloadUrl?: string;
  jobId?: string;
  error?: string;
  status?: string;
  fileCount?: number;
  totalFileCount?: number;
  totalBytes?: number;
}

interface DownloadProgress {
  status: string;
  processedFiles: number;
  totalFiles: number;
  percent: number;
  message: string;
}

interface BulkDownloadPart {
  label: string;
  url: string;
  fileRange: string;
}

const BULK_DOWNLOAD_CHUNK_SIZE = 50;

export function MediaGrid({ media, eventId }: MediaGridProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingSelected, setDownloadingSelected] = useState(false);
  const [downloadingMediaId, setDownloadingMediaId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [bulkDownloadParts, setBulkDownloadParts] = useState<BulkDownloadPart[]>(
    []
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedCount = selectedIds.length;
  const downloadableMedia = media.filter((item) => item.status === "ready");
  const bulkMediaCount = downloadableMedia.length;

  function clearSelection() {
    setSelectedIds([]);
    setSelectionMode(false);
  }

  function toggleSelected(mediaId: string) {
    setSelectedIds((current) =>
      current.includes(mediaId)
        ? current.filter((id) => id !== mediaId)
        : [...current, mediaId]
    );
  }

  function openDownloadWindow() {
    const downloadWindow = window.open("", "_blank");

    if (downloadWindow) {
      downloadWindow.document.title = "Preparing download";
      downloadWindow.document.body.innerHTML = `
        <main style="min-height:100vh;display:grid;place-items:center;margin:0;background:#fafafa;color:#111827;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <section style="width:min(420px,calc(100vw - 32px));border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:24px;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">QRPhoto</p>
            <h1 style="margin:0 0 10px;font-size:22px;line-height:1.25;">Preparing download</h1>
            <p id="download-message" style="margin:0 0 18px;color:#4b5563;font-size:14px;">Your ZIP file is being prepared. This tab will start the download automatically when it is ready.</p>
            <div style="height:8px;overflow:hidden;border-radius:999px;background:#e5e7eb;">
              <div id="download-progress-bar" style="height:100%;width:10%;border-radius:999px;background:#111827;transition:width .25s ease;"></div>
            </div>
            <p id="download-percent" style="margin:10px 0 0;color:#6b7280;font-size:13px;">10%</p>
            <div id="download-links" style="display:grid;gap:8px;margin-top:18px;"></div>
          </section>
        </main>
      `;
    }

    return downloadWindow;
  }

  function updateDownloadWindow(
    downloadWindow: Window | null,
    progress: DownloadProgress
  ) {
    if (!downloadWindow || downloadWindow.closed) return;

    try {
      downloadWindow.document.title =
        progress.status === "ready"
          ? "Download ready"
          : progress.status === "failed"
            ? "Download failed"
            : "Preparing download";

      const message = downloadWindow.document.getElementById("download-message");
      const percent = downloadWindow.document.getElementById("download-percent");
      const bar = downloadWindow.document.getElementById("download-progress-bar");

      if (message) {
        message.textContent = progress.message;
      }

      if (percent) {
        percent.textContent = `${progress.percent}%`;
      }

      if (bar instanceof HTMLElement) {
        bar.style.width = `${progress.percent}%`;
        bar.style.background =
          progress.status === "failed" ? "#dc2626" : "#111827";
      }
    } catch {
      // The window may already be navigating to the download URL.
    }
  }

  function chunkMediaIds(mediaIds: string[]) {
    const chunks: string[][] = [];

    for (let index = 0; index < mediaIds.length; index += BULK_DOWNLOAD_CHUNK_SIZE) {
      chunks.push(mediaIds.slice(index, index + BULK_DOWNLOAD_CHUNK_SIZE));
    }

    return chunks;
  }

  function getProgressFromResponse(data: DownloadResponse): DownloadProgress {
    const status = data.status ?? "processing";
    const totalFiles = data.totalFileCount ?? bulkMediaCount;
    const processedFiles =
      status === "ready"
        ? totalFiles
        : Math.min(data.fileCount ?? 0, totalFiles);

    let percent = 10;
    if (status === "pending") {
      percent = 10;
    } else if (status === "processing") {
      percent =
        totalFiles > 0
          ? Math.min(95, Math.max(15, Math.round((processedFiles / totalFiles) * 95)))
          : 35;
    } else if (status === "ready") {
      percent = 100;
    } else if (status === "failed") {
      percent = 100;
    }

    const message =
      status === "ready"
        ? `Download ready (${totalFiles} file${totalFiles === 1 ? "" : "s"})`
        : status === "failed"
          ? "Download failed"
          : totalFiles > 0
            ? `Preparing ${processedFiles} of ${totalFiles} files`
            : "Preparing download";

    return {
      status,
      processedFiles,
      totalFiles,
      percent,
      message,
    };
  }

  async function startDownloadRequest(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    fallbackUrl: string | null,
    setLoading: (value: boolean) => void,
    onProgress?: (progress: DownloadProgress) => void
  ) {
    let downloadWindow: Window | null = null;

    try {
      setLoading(true);
      downloadWindow = openDownloadWindow();

      if (fallbackUrl && downloadWindow) {
        downloadWindow.location.href = fallbackUrl;
        return;
      }

      const res = await fetch(input, init);
      const data = (await res.json()) as DownloadResponse;
      const progress = getProgressFromResponse(data);
      updateDownloadWindow(downloadWindow, progress);
      onProgress?.(progress);

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start download");
      }

      if (typeof data.downloadUrl === "string") {
        updateDownloadWindow(downloadWindow, {
          ...getProgressFromResponse(data),
          status: "ready",
          percent: 100,
          message: "Download ready",
        });
        if (downloadWindow) {
          downloadWindow.location.href = data.downloadUrl;
        } else {
          window.location.href = data.downloadUrl;
        }
      } else if (data.jobId) {
        await pollDownloadJob(data.jobId, downloadWindow, onProgress);
      } else {
        throw new Error("Download did not return a file");
      }
    } catch (error) {
      downloadWindow?.close();
      console.error("Download error:", error);
      const failedProgress = {
        status: "failed",
        processedFiles: 0,
        totalFiles: bulkMediaCount,
        percent: 100,
        message: "Download failed",
      };
      updateDownloadWindow(downloadWindow, failedProgress);
      onProgress?.(failedProgress);
      alert("Download failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(mediaId: string) {
    setDeleting(mediaId);
    try {
      const res = await fetch(`/api/media/${mediaId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDelete(null);
        setSelectedIds((current) => current.filter((id) => id !== mediaId));
        router.refresh();
      }
    } finally {
      setDeleting(null);
    }
  }

  async function handleDownloadAll() {
    const mediaIds = downloadableMedia.map((item) => item.id);
    const chunks = chunkMediaIds(mediaIds);
    let processedFiles = 0;

    setBulkDownloadParts([]);
    setDownloadProgress({
      status: "pending",
      processedFiles: 0,
      totalFiles: bulkMediaCount,
      percent: 10,
      message:
        bulkMediaCount > 0
          ? `Preparing 0 of ${bulkMediaCount} files`
          : "Preparing download",
    });

    if (chunks.length === 0) {
      setDownloadProgress({
        status: "failed",
        processedFiles: 0,
        totalFiles: 0,
        percent: 100,
        message: "No ready photos are available to download",
      });
      alert("No ready photos are available to download yet.");
      return;
    }

    try {
      setDownloadingAll(true);

      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        const startingFile = processedFiles + 1;
        const endingFile = processedFiles + chunk.length;
        const percent = Math.max(
          10,
          Math.round((processedFiles / bulkMediaCount) * 100)
        );
        const preparingProgress = {
          status: "processing",
          processedFiles,
          totalFiles: bulkMediaCount,
          percent,
          message: `Preparing ZIP ${index + 1} of ${chunks.length} (${startingFile}-${endingFile} of ${bulkMediaCount} files)`,
        };
        setDownloadProgress(preparingProgress);

        const res = await fetch(`/api/download/${eventId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaIds: chunk }),
        });
        const data = (await res.json()) as DownloadResponse;

        if (!res.ok || !data.downloadUrl) {
          throw new Error(data.error ?? "Failed to prepare ZIP part");
        }

        processedFiles += chunk.length;
        const readyProgress = {
          status: "processing",
          processedFiles,
          totalFiles: bulkMediaCount,
          percent: Math.min(
            99,
            Math.round((processedFiles / bulkMediaCount) * 100)
          ),
          message: `Prepared ZIP ${index + 1} of ${chunks.length} (${processedFiles} of ${bulkMediaCount} files)`,
        };
        setDownloadProgress(readyProgress);
        setBulkDownloadParts((current) => [
          ...current,
          {
            label: `ZIP ${index + 1}`,
            url: data.downloadUrl!,
            fileRange: `${startingFile}-${endingFile}`,
          },
        ]);
      }

      const completeProgress = {
        status: "ready",
        processedFiles,
        totalFiles: bulkMediaCount,
        percent: 100,
        message:
          chunks.length === 1
            ? "Download ready"
            : `All ${chunks.length} ZIP parts are ready`,
      };
      setDownloadProgress(completeProgress);
    } catch (error) {
      console.error("Download error:", error);
      const failedProgress = {
        status: "failed",
        processedFiles,
        totalFiles: bulkMediaCount,
        percent: 100,
        message:
          processedFiles > 0
            ? `Download failed after preparing ${processedFiles} of ${bulkMediaCount} files`
            : "Download failed",
      };
      setDownloadProgress(failedProgress);
      alert("Download failed. Please try again.");
    } finally {
      setDownloadingAll(false);
    }
  }

  async function handleDownloadSelected() {
    if (selectedIds.length === 0) return;

    if (selectedIds.length === 1) {
      await handleDownloadSingle(selectedIds[0]);
      return;
    }

    await startDownloadRequest(
      `/api/download/${eventId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds: selectedIds }),
      },
      null,
      setDownloadingSelected
    );
  }

  async function handleDownloadSingle(mediaId: string) {
    setDownloadingMediaId(mediaId);
    try {
      const downloadUrl = `/api/media/${mediaId}/url?variant=original&redirect=true`;
      const downloadWindow = openDownloadWindow();
      if (downloadWindow) {
        downloadWindow.location.href = downloadUrl;
      } else {
        window.location.href = downloadUrl;
      }
    } finally {
      setDownloadingMediaId(null);
    }
  }

  async function pollDownloadJob(
    jobId: string,
    downloadWindow: Window | null,
    onProgress?: (progress: DownloadProgress) => void
  ) {
    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/download/${eventId}?jobId=${jobId}`);
          const data = (await res.json()) as DownloadResponse;
          const progress = getProgressFromResponse(data);
          updateDownloadWindow(downloadWindow, progress);
          onProgress?.(progress);

          if (!res.ok) {
            clearInterval(interval);
            reject(new Error(data.error ?? "Failed to check download status"));
            return;
          }

          if (data.status === "ready" && data.downloadUrl) {
            clearInterval(interval);
            const readyProgress = getProgressFromResponse(data);
            updateDownloadWindow(downloadWindow, readyProgress);
            onProgress?.(readyProgress);
            if (downloadWindow && !downloadWindow.closed) {
              downloadWindow.location.href = data.downloadUrl;
            } else {
              window.location.href = data.downloadUrl;
            }
            resolve();
          } else if (data.status === "failed") {
            clearInterval(interval);
            const failedProgress = getProgressFromResponse(data);
            updateDownloadWindow(downloadWindow, failedProgress);
            onProgress?.(failedProgress);
            reject(new Error(data.error ?? "Download failed"));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 2000);
    });
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
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {media.length} photo{media.length !== 1 ? "s" : ""}
          </p>
          {selectionMode && (
            <Badge variant="secondary">
              {selectedCount} selected
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!selectionMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode(true)}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              Select Photos
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSelected}
                disabled={selectedCount === 0 || downloadingSelected}
              >
                <Download className="mr-2 h-4 w-4" />
                {selectedCount <= 1
                  ? "Download Selected"
                  : downloadingSelected
                    ? "Preparing Selected..."
                    : `Download ${selectedCount}`}
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            disabled={downloadingAll || bulkMediaCount === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {downloadingAll ? "Preparing All..." : "Download All"}
          </Button>
        </div>
      </div>

      {downloadProgress && (
        <div className="mb-4 rounded-md border bg-muted/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{downloadProgress.message}</span>
            <span className="shrink-0 text-muted-foreground">
              {downloadProgress.percent}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-background"
            role="progressbar"
            aria-label="Bulk download preparation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={downloadProgress.percent}
          >
            <div
              className={`h-full rounded-full transition-all ${
                downloadProgress.status === "failed"
                  ? "bg-destructive"
                  : "bg-primary"
              }`}
              style={{ width: `${downloadProgress.percent}%` }}
            />
          </div>
          {bulkDownloadParts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {bulkDownloadParts.map((part) => (
                <Button
                  key={part.label}
                  asChild
                  variant="secondary"
                  size="sm"
                >
                  <a
                    href={part.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {part.label}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {part.fileRange}
                    </span>
                  </a>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {media.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const isDownloading = downloadingMediaId === item.id;

          return (
            <div
              key={item.id}
              className={`group relative aspect-square overflow-hidden rounded-lg border bg-muted ${
                isSelected ? "ring-2 ring-primary ring-offset-2" : ""
              }`}
            >
              {item.object_key_thumb ? (
                <img
                  src={`/api/media/${item.id}/url?variant=thumb&redirect=true`}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              {selectionMode && (
                <button
                  type="button"
                  onClick={() => toggleSelected(item.id)}
                  className="absolute left-2 top-2 z-10 rounded-full bg-black/65 p-1 text-white transition hover:bg-black/80"
                  aria-label={isSelected ? "Deselect photo" : "Select photo"}
                >
                  {isSelected ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              )}

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {item.uploader_name && (
                  <span className="mb-1 w-full truncate px-2 text-center text-[10px] font-medium text-white">
                    By {item.uploader_name}
                  </span>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownloadSingle(item.id)}
                    disabled={isDownloading}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {selectionMode && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleSelected(item.id)}
                    >
                      {isSelected ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <CheckSquare className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setConfirmDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {item.status !== "ready" && (
                <div className="absolute right-1 top-1">
                  <Badge
                    variant={item.status === "failed" ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {item.status}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
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
          <div className="mt-4 flex justify-end gap-3">
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
