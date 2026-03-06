"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Upload, AlertCircle } from "lucide-react";

interface UploadZoneProps {
  onFiles: (files: File[]) => void;
  maxFileSizeMb: number;
  allowedTypes: string[];
  primaryColor: string;
}

export function UploadZone({
  onFiles,
  maxFileSizeMb,
  allowedTypes,
  primaryColor,
}: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateAndSubmit = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const validFiles: File[] = [];

      for (const file of Array.from(files)) {
        if (!allowedTypes.includes(file.type)) {
          setError(`${file.name}: File type not supported`);
          continue;
        }
        if (file.size > maxFileSizeMb * 1024 * 1024) {
          setError(`${file.name}: File too large (max ${maxFileSizeMb}MB)`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        onFiles(validFiles);
      }
    },
    [onFiles, maxFileSizeMb, allowedTypes]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      validateAndSubmit(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  const acceptTypes = allowedTypes.join(",");

  return (
    <div className="space-y-4 max-w-sm mx-auto w-full">
      {/* Camera capture button - prominent on mobile */}
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        className="w-full rounded-full py-5 text-white font-medium text-lg flex items-center justify-center gap-3 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        style={{ backgroundColor: primaryColor }}
      >
        <Camera className="h-6 w-6" />
        Take a Photo
      </button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) validateAndSubmit(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-muted"></div>
        <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm font-light">or</span>
        <div className="flex-grow border-t border-muted"></div>
      </div>

      {/* Drop zone / file picker */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl py-10 px-6 text-center cursor-pointer transition-all bg-white/50 backdrop-blur-sm shadow-sm ${
          dragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-white/80"
        }`}
      >
        <div className="bg-muted/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">Choose photos</p>
        <p className="text-sm text-muted-foreground mt-1">or drag & drop here</p>
        <p className="text-xs text-muted-foreground/70 mt-4">
          JPEG, PNG, WebP, HEIC up to {maxFileSizeMb}MB
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) validateAndSubmit(e.target.files);
          e.target.value = "";
        }}
      />

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
