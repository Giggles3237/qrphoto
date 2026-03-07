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
  initialBlur?: number;
  initialOpacity?: number;
  onSave: (croppedBlob: Blob | null, blur: number, opacity: number) => void;
  onClose: () => void;
  backgroundColor: string;
}

export function BackgroundCropper({
  imageSrc,
  initialBlur = 0,
  initialOpacity = 50,
  onSave,
  onClose,
  backgroundColor,
}: BackgroundCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [blur, setBlur] = useState(initialBlur);
  const [opacity, setOpacity] = useState(initialOpacity);
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
    setIsProcessing(true);
    try {
      let croppedBlob: Blob | null = null;
      if (croppedAreaPixels) {
        croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      }
      onSave(croppedBlob, blur, opacity);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Adjust Background</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-[300px] sm:min-h-[450px] relative bg-black flex flex-col sm:flex-row">
          {/* Main Cropper Area */}
          <div className="flex-1 relative overflow-hidden">
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
              <div 
                className={`border border-white/30 transition-opacity duration-300 h-full aspect-[3/4] ${previewMode === 'tablet' ? 'opacity-100 border-dashed border-2' : 'opacity-40'}`}
              >
                <div className="flex items-center justify-center h-full">
                  <div 
                    className={`border border-white/50 h-full aspect-[9/19.5] transition-opacity duration-300 ${previewMode === 'mobile' ? 'opacity-100 border-dashed border-2' : 'opacity-40'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Settings Sidebar (Vertical on Desktop, Horizontal on Mobile) */}
          <div className="w-full sm:w-72 bg-background border-t sm:border-t-0 sm:border-l p-6 space-y-8 overflow-y-auto">
            {/* Device Select */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview Device</label>
              <div className="flex bg-muted p-1 rounded-lg gap-1">
                <Button
                  variant={previewMode === "mobile" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 h-9 gap-2"
                  onClick={() => setPreviewMode("mobile")}
                >
                  <Smartphone className="h-4 w-4" />
                  <span className="hidden lg:inline text-xs">Mobile</span>
                </Button>
                <Button
                  variant={previewMode === "tablet" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 h-9 gap-2"
                  onClick={() => setPreviewMode("tablet")}
                >
                  <Tablet className="h-4 w-4" />
                  <span className="hidden lg:inline text-xs">Tablet</span>
                </Button>
                <Button
                  variant={previewMode === "desktop" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 h-9 gap-2"
                  onClick={() => setPreviewMode("desktop")}
                >
                  <Monitor className="h-4 w-4" />
                  <span className="hidden lg:inline text-xs">Desktop</span>
                </Button>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zoom</label>
                  <span className="text-xs font-mono">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blur</label>
                  <span className="text-xs font-mono">{blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={blur}
                  onChange={(e) => setBlur(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overlay Opacity</label>
                  <span className="text-xs font-mono">{opacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={opacity}
                  onChange={(e) => setOpacity(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                Adjust the focal point for different devices. Blur and opacity ensure guests can read the text clearly.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-muted/20 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Apply Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
