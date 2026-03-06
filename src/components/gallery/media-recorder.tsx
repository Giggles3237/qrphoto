"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Video, StopCircle, Play, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

interface MediaRecorderProps {
  type: "audio" | "video";
  onComplete: (url: string) => void;
  onCancel: () => void;
  primaryColor: string;
}

export function MediaRecorder({
  type,
  onComplete,
  onCancel,
  primaryColor,
}: MediaRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [timer, setTimer] = useState(0);

  const mediaRecorderRef = useRef<window.MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const constraints = {
        audio: true,
        video: type === "video" ? { facingMode: "user" } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoPreviewRef.current && type === "video") {
        videoPreviewRef.current.srcObject = stream;
      }

      const options = {
        mimeType: type === "video" ? "video/webm" : "audio/webm",
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: options.mimeType });
        setRecordedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimer(0);
      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      toast.error("Could not access microphone or camera. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const resetRecording = () => {
    setRecordedBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setTimer(0);
  };

  const handleSave = async () => {
    if (!recordedBlob) return;

    setIsUploading(true);
    const formData = new FormData();
    const filename = `recording-${Date.now()}.${type === "video" ? "webm" : "webm"}`;
    formData.append("file", new File([recordedBlob], filename, { type: recordedBlob.type }));

    try {
      // Reusing the admin upload route for simplicity as it handles R2 upload
      // In a production app, you might want a specific public upload route
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      onComplete(data.url);
    } catch (err) {
      toast.error("Failed to upload recording");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="space-y-4 p-4 border rounded-2xl bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium flex items-center gap-2">
          {type === "video" ? <Video className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          Record {type.charAt(0).toUpperCase() + type.slice(1)} Message
        </h3>
        {isRecording && (
          <div className="flex items-center gap-2 text-destructive font-mono text-sm">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            {formatTime(timer)}
          </div>
        )}
      </div>

      <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
        {!isRecording && !previewUrl && (
          <div className="text-center space-y-4">
            <div 
              className="h-16 w-16 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
            >
              {type === "video" ? <Video className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </div>
            <p className="text-sm text-muted-foreground">Ready to record?</p>
            <Button 
              onClick={startRecording}
              className="rounded-full"
              style={{ backgroundColor: primaryColor }}
            >
              Start Recording
            </Button>
          </div>
        )}

        {isRecording && type === "video" && (
          <video 
            ref={videoPreviewRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover mirror"
          />
        )}

        {isRecording && type === "audio" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-1 items-end h-12">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i} 
                  className="w-2 bg-primary rounded-full animate-bounce" 
                  style={{ 
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.1}s`,
                    backgroundColor: primaryColor
                  }} 
                />
              ))}
            </div>
            <p className="text-white text-sm">Recording audio...</p>
          </div>
        )}

        {previewUrl && (
          <div className="w-full h-full">
            {type === "video" ? (
              <video 
                src={previewUrl} 
                controls 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-muted">
                <Play className="h-12 w-12 text-muted-foreground" />
                <audio src={previewUrl} controls className="w-64" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {isRecording ? (
          <Button 
            variant="destructive" 
            onClick={stopRecording} 
            className="flex-1 rounded-full py-6"
          >
            <StopCircle className="h-5 w-5 mr-2" />
            Stop Recording
          </Button>
        ) : previewUrl ? (
          <>
            <Button 
              variant="outline" 
              onClick={resetRecording} 
              className="flex-1 rounded-full py-6"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Retake
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isUploading}
              className="flex-1 rounded-full py-6"
              style={{ backgroundColor: primaryColor }}
            >
              <Save className="h-5 w-5 mr-2" />
              {isUploading ? "Uploading..." : "Use this recording"}
            </Button>
          </>
        ) : (
          <Button 
            variant="ghost" 
            onClick={onCancel} 
            className="flex-1 rounded-full py-6"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
