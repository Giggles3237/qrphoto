"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCroppedImg } from "@/lib/utils/image-crop";
import { Smartphone, Tablet, Monitor } from "lucide-react";

interface BackgroundCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onClose: () => void;
}

export function BackgroundCropper({
  imageSrc,
  onCropComplete,
  onClose,
}: BackgroundCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adjust Background Crop</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-[400px] relative bg-black rounded-lg overflow-hidden border">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
            showGrid={false}
          />
          
          {/* Device Overlays */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Tablet Marker - 3:4 aspect */}
            <div 
              className={`border border-white/30 transition-opacity duration-300 h-full aspect-[3/4] ${previewMode === 'tablet' ? 'opacity-100 border-dashed border-2' : 'opacity-40'}`}
            >
              {/* Mobile Marker - 9:19.5 aspect */}
              <div className="flex items-center justify-center h-full">
                <div 
                  className={`border border-white/50 h-full aspect-[9/19.5] transition-opacity duration-300 ${previewMode === 'mobile' ? 'opacity-100 border-dashed border-2' : 'opacity-40'}`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 py-4">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 w-full space-y-2">
              <div className="flex justify-between">
                <label className="text-sm text-muted-foreground">Zoom</label>
                <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="flex bg-muted p-1 rounded-lg gap-1">
              <Button
                variant={previewMode === "mobile" ? "default" : "ghost"}
                size="sm"
                className="h-8 w-10 p-0"
                onClick={() => setPreviewMode("mobile")}
                title="Mobile Preview"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
              <Button
                variant={previewMode === "tablet" ? "default" : "ghost"}
                size="sm"
                className="h-8 w-10 p-0"
                onClick={() => setPreviewMode("tablet")}
                title="Tablet Preview"
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={previewMode === "desktop" ? "default" : "ghost"}
                size="sm"
                className="h-8 w-10 p-0"
                onClick={() => setPreviewMode("desktop")}
                title="Desktop Preview"
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <p className="text-[10px] text-muted-foreground text-center italic">
            The crop area (16:9) is for widescreen. The dashed lines show where Tablet and Mobile screens will focus.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Apply Background"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
