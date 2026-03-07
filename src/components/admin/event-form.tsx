"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Upload, X, Crop, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { LogoCropper } from "./logo-cropper";
import { BRAND_THEMES } from "@/lib/brands/themes";
import type { Event, BrandKey, PrivacyMode } from "@/types";
import { getPaletteSync } from "colorthief";

interface EventFormProps {
  event?: Event;
  mode: "create" | "edit";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function EventForm({ event, mode }: EventFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [showCropper, setShowCropper] = useState(false);

  const [name, setName] = useState(event?.name ?? "");
  const [slug, setSlug] = useState(event?.id ?? "");
  const [brandKey, setBrandKey] = useState<BrandKey>(
    (event?.brand_key as BrandKey) ?? "default"
  );
  const [uploadEnabled, setUploadEnabled] = useState(
    event?.upload_enabled ?? true
  );
  const [galleryEnabled, setGalleryEnabled] = useState(
    event?.gallery_enabled ?? false
  );
  const [guestBookEnabled, setGuestBookEnabled] = useState(
    event?.guest_book_enabled ?? false
  );
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>(
    (event?.privacy_mode as PrivacyMode) ?? "unlisted"
  );
  const [passcode, setPasscode] = useState("");
  const [maxFileSize, setMaxFileSize] = useState(event?.max_file_size_mb ?? 20);
  const [startsAt, setStartsAt] = useState(event?.starts_at?.slice(0, 16) ?? "");
  const [endsAt, setEndsAt] = useState(event?.ends_at?.slice(0, 16) ?? "");

  // Theme overrides
  const [logoUrl, setLogoUrl] = useState(
    (event?.theme as Record<string, any>)?.logo_url ?? ""
  );
  const [logoRounded, setLogoRounded] = useState<boolean>(true);
  const [headingText, setHeadingText] = useState(
    (event?.theme as Record<string, string>)?.heading_text ?? ""
  );
  const [subheadingText, setSubheadingText] = useState(
    (event?.theme as Record<string, string>)?.subheading_text ?? ""
  );
  const [primaryColor, setPrimaryColor] = useState(
    (event?.theme as Record<string, string>)?.primary_color ?? ""
  );
  const [accentColor, setAccentColor] = useState(
    (event?.theme as Record<string, string>)?.accent_color ?? ""
  );
  const [backgroundColor, setBackgroundColor] = useState(
    (event?.theme as Record<string, string>)?.background_color ?? ""
  );

  function handleNameChange(value: string) {
    setName(value);
    if (mode === "create") {
      setSlug(slugify(value));
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setLogoUrl(data.url);
      toast.success("Logo uploaded successfully");
      // Set rounded default if it looks like a logo
      setLogoRounded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload logo";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleCroppedLogo(croppedBlob: Blob) {
    setIsUploadingLogo(true);
    setShowCropper(false);
    setError(null);

    const formData = new FormData();
    const filename = `logo-${Date.now()}.png`;
    formData.append("file", new File([croppedBlob], filename, { type: "image/png" }));

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setLogoUrl(data.url);
      setLogoRounded(true);
      toast.success("Logo cropped and uploaded successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload cropped logo";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsUploadingLogo(false);
    }
  }

  function resetColors() {
    const defaults = BRAND_THEMES[brandKey] || BRAND_THEMES.default;
    setPrimaryColor(defaults.primary_color);
    setAccentColor(defaults.accent_color);
    setBackgroundColor(defaults.background_color || "#FFFFFF");
    toast.info(`Colors reset to ${brandKey} defaults`);
  }

  async function handleInvitationUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingColors(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const palette = getPaletteSync(img, { colorCount: 5 });
          
          if (palette && palette.length >= 3) {
            // 1. Dominant -> Primary
            const primary = palette[0].hex();
            
            // 2. Find a light color for background (Lightness > 80)
            const lightColor = palette.find(c => c.hsl().l > 80) || palette[1];
            const bg = lightColor.hex();
            
            // 3. Find a vibrant color for accent (using the 3rd color in palette)
            const accent = palette[2].hex();

            setPrimaryColor(primary);
            setBackgroundColor(bg);
            setAccentColor(accent);
            toast.success("Magic theme applied from invitation!");
          }
        } catch (err) {
          console.error(err);
          toast.error("Could not extract colors from this image.");
        } finally {
          setIsExtractingColors(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const theme: Record<string, any> = {};
    if (logoUrl) theme.logo_url = logoUrl;
    theme.logo_rounded = logoRounded;
    if (headingText) theme.heading_text = headingText;
    if (subheadingText) theme.subheading_text = subheadingText;
    if (primaryColor) theme.primary_color = primaryColor;
    if (accentColor) theme.accent_color = accentColor;
    if (backgroundColor) theme.background_color = backgroundColor;

    const payload: Record<string, unknown> = {
      name,
      brand_key: brandKey,
      theme,
      upload_enabled: uploadEnabled,
      gallery_enabled: galleryEnabled,
      guest_book_enabled: guestBookEnabled,
      privacy_mode: privacyMode,
      max_file_size_mb: maxFileSize,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    };

    if (mode === "create") {
      payload.id = slug;
    }

    if (passcode && privacyMode === "passcode") {
      payload.passcode = passcode;
    }

    try {
      const url =
        mode === "create"
          ? "/api/events"
          : `/api/events/${event!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || "Something went wrong";
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      toast.success(
        mode === "create"
          ? "Event created successfully"
          : "Event saved successfully"
      );

      if (mode === "create") {
        router.push(`/admin/events/${data.id}`);
      } else {
        setLoading(false);
        router.refresh();
      }
    } catch (err) {
      const msg = "Network error";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>Basic information about the event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="BMW Summer Drive 2025"
              required
            />
          </div>

          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/e/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="bmw-summer-drive-2025"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cannot be changed after creation (used in QR codes)
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select
                value={brandKey}
                onValueChange={(v) => setBrandKey(v as BrandKey)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bmw">BMW</SelectItem>
                  <SelectItem value="mini">MINI</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Privacy</Label>
              <Select
                value={privacyMode}
                onValueChange={(v) => setPrivacyMode(v as PrivacyMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="passcode">Passcode</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {privacyMode === "passcode" && (
            <div className="space-y-2">
              <Label htmlFor="passcode">
                Passcode{mode === "edit" ? " (leave blank to keep current)" : ""}
              </Label>
              <Input
                id="passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter event passcode"
                minLength={4}
                required={mode === "create"}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts">Starts At (optional)</Label>
              <Input
                id="starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends">Ends At (optional)</Label>
              <Input
                id="ends"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Photo Uploads</div>
              <div className="text-xs text-muted-foreground">
                Allow guests to upload photos
              </div>
            </div>
            <Button
              type="button"
              variant={uploadEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setUploadEnabled(!uploadEnabled)}
            >
              {uploadEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Photo Gallery</div>
              <div className="text-xs text-muted-foreground">
                Show a gallery of uploaded photos
              </div>
            </div>
            <Button
              type="button"
              variant={galleryEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setGalleryEnabled(!galleryEnabled)}
            >
              {galleryEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Digital Guest Book</div>
              <div className="text-xs text-muted-foreground">
                Allow guests to leave text messages
              </div>
            </div>
            <Button
              type="button"
              variant={guestBookEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setGuestBookEnabled(!guestBookEnabled)}
            >
              {guestBookEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="maxSize">Max File Size (MB)</Label>
            <Input
              id="maxSize"
              type="number"
              min={1}
              max={50}
              value={maxFileSize}
              onChange={(e) => setMaxFileSize(parseInt(e.target.value, 10))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme Overrides</CardTitle>
          <CardDescription>
            Override the default brand theme for this event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo">Event Logo</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="flex flex-col gap-2">
                  <div className="relative group">
                    <div className={`h-20 w-20 bg-muted border overflow-hidden flex items-center justify-center rounded-full ${!logoRounded ? 'p-2' : ''}`}>
                      <img
                        src={logoUrl}
                        alt="Logo Preview"
                        className={logoRounded ? "h-full w-full object-cover" : "max-h-full max-w-full object-contain"}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1 px-2"
                    onClick={() => setShowCropper(true)}
                  >
                    <Crop className="h-3 w-3" />
                    Adjust Crop
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-20 w-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <div className="flex flex-col items-center justify-center py-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground mt-1">
                      Upload
                    </span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploadingLogo}
                  />
                </label>
              )}
              <div className="flex-1 text-xs text-muted-foreground">
                {isUploadingLogo ? (
                  <p className="animate-pulse">Processing...</p>
                ) : (
                  <>
                    <p className="font-medium text-foreground mb-1">
                      {logoUrl ? "Logo uploaded" : "No logo selected"}
                    </p>
                    <p>Transparent PNG or SVG works best.</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {showCropper && logoUrl && (
            <LogoCropper
              imageSrc={logoUrl}
              onCropComplete={handleCroppedLogo}
              onClose={() => setShowCropper(false)}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="heading">Heading Text</Label>
            <Input
              id="heading"
              value={headingText}
              onChange={(e) => setHeadingText(e.target.value)}
              placeholder="Leave blank for brand default"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subheading">Subheading Text</Label>
            <Textarea
              id="subheading"
              value={subheadingText}
              onChange={(e) => setSubheadingText(e.target.value)}
              placeholder="Leave blank for brand default"
              rows={2}
            />
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label>Smart Wedding Themes</Label>
              <label className="cursor-pointer">
                <div className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                  <Sparkles className="h-3 w-3" />
                  {isExtractingColors ? "Analyzing..." : "Magic Theme from Invitation"}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleInvitationUpload}
                  disabled={isExtractingColors}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { name: "Rose Gold", primary: "#B76E79", accent: "#EACDC2", bg: "#FFF5F6" },
                { name: "Modern Sage", primary: "#87A96B", accent: "#D4E0D2", bg: "#F4F9F0" },
                { name: "Dusty Blue", primary: "#5D8AA8", accent: "#BCD4E6", bg: "#F0F7FA" },
                { name: "Midnight", primary: "#1A2238", accent: "#FFD700", bg: "#F8F9FA" },
                { name: "Champagne", primary: "#D4AF37", accent: "#EED971", bg: "#FCFBF0" },
                { name: "Emerald", primary: "#046307", accent: "#A5D6A7", bg: "#F0F9F0" },
                { name: "Burgundy", primary: "#800020", accent: "#D0A9AA", bg: "#FFF0F2" },
                { name: "Lavender", primary: "#967BB6", accent: "#E6E6FA", bg: "#F9F7FC" },
              ].map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => {
                    setPrimaryColor(theme.primary);
                    setAccentColor(theme.accent);
                    setBackgroundColor(theme.bg);
                    toast.info(`Applied ${theme.name} theme`);
                  }}
                  className="group relative flex flex-col items-center gap-2"
                >
                  <div className="flex -space-x-2 transition-transform group-hover:scale-105">
                    <div
                      className="h-10 w-10 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <div
                      className="h-10 w-10 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: theme.bg }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetColors}
              className="h-8 text-xs gap-2 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to Defaults
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary">Primary Color</Label>
              <div className="flex gap-2">
                <div className="relative h-10 w-10 shrink-0">
                  <input
                    type="color"
                    value={primaryColor || "#6366F1"}
                    onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  />
                  <div
                    className="absolute inset-0 rounded border shadow-sm"
                    style={{ backgroundColor: primaryColor || "#6366F1" }}
                  />
                </div>
                <Input
                  id="primary"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                  placeholder="#1C69D4"
                  className="font-mono uppercase"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent">Accent Color</Label>
              <div className="flex gap-2">
                <div className="relative h-10 w-10 shrink-0">
                  <input
                    type="color"
                    value={accentColor || "#FFFFFF"}
                    onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  />
                  <div
                    className="absolute inset-0 rounded border shadow-sm"
                    style={{ backgroundColor: accentColor || "#FFFFFF" }}
                  />
                </div>
                <Input
                  id="accent"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                  placeholder="#FFFFFF"
                  className="font-mono uppercase"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="background">Background Color</Label>
            <div className="flex gap-2">
              <div className="relative h-10 w-10 shrink-0">
                <input
                  type="color"
                  value={backgroundColor || "#FFFFFF"}
                  onChange={(e) => setBackgroundColor(e.target.value.toUpperCase())}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                />
                <div
                  className="absolute inset-0 rounded border shadow-sm"
                  style={{ backgroundColor: backgroundColor || "#FFFFFF" }}
                />
              </div>
              <Input
                id="background"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value.toUpperCase())}
                placeholder="#FFFFFF"
                className="font-mono uppercase"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              This will be used as the base background for all event pages.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create Event"
            : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
