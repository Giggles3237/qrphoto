"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, Copy, Check } from "lucide-react";

interface QRDisplayProps {
  eventId: string;
  eventName: string;
}

export function QRDisplay({ eventId, eventName }: QRDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const eventUrl = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/e/${eventId}`;

  useEffect(() => {
    fetch(`/api/qr/${eventId}?format=png&size=512`)
      .then((res) => res.blob())
      .then((blob) => {
        setQrDataUrl(URL.createObjectURL(blob));
      });
  }, [eventId]);

  async function handleCopy() {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload(format: "png" | "svg") {
    const link = document.createElement("a");
    link.href = `/api/qr/${eventId}?format=${format}&size=1024`;
    link.download = `qr-${eventId}.${format}`;
    link.click();
  }

  return (
    <div className="max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>QR Code</CardTitle>
          <CardDescription>
            Print or display this QR code at your event. Guests scan it to
            upload photos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center p-6 bg-white rounded-lg border">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ${eventName}`}
                className="w-64 h-64"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center">
                <span className="text-muted-foreground">Loading...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded text-sm truncate">
              {eventUrl}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleDownload("png")}
            >
              <Download className="h-4 w-4 mr-2" />
              PNG
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleDownload("svg")}
            >
              <Download className="h-4 w-4 mr-2" />
              SVG
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
