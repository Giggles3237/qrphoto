import type { BrandKey, BrandTheme } from "@/types";

export const BRAND_THEMES: Record<BrandKey, BrandTheme> = {
  bmw: {
    logo_url: "/brands/bmw/logo.svg",
    logo_rounded: false,
    primary_color: "#1C69D4",
    accent_color: "#FFFFFF",
    background_color: "#FFFFFF",
    heading_text: "Share Your BMW Experience",
    subheading_text: "Upload your photos from the event",
    background_url: null,
    disclaimer_text:
      "Uploads are visible to event organizers and may be used for marketing purposes.",
    button_label: "Upload Photos",
  },
  mini: {
    logo_url: "/brands/mini/logo.svg",
    logo_rounded: false,
    primary_color: "#000000",
    accent_color: "#D4AF37",
    background_color: "#FFFFFF",
    heading_text: "Share Your MINI Moment",
    subheading_text: "Upload your photos from the event",
    background_url: null,
    disclaimer_text:
      "Uploads are visible to event organizers and may be used for marketing purposes.",
    button_label: "Upload Photos",
  },
  personal: {
    logo_url: null,
    logo_rounded: false,
    primary_color: "#6366F1",
    accent_color: "#818CF8",
    background_color: "#FFFFFF",
    heading_text: "Share Your Photos",
    subheading_text: "Upload your photos from the event",
    background_url: null,
    disclaimer_text: "Uploads are visible to event organizers.",
    button_label: "Upload Photos",
  },
  default: {
    logo_url: null,
    logo_rounded: false,
    primary_color: "#6366F1",
    accent_color: "#818CF8",
    background_color: "#FFFFFF",
    heading_text: "Share Your Photos",
    subheading_text: "Upload your photos from the event",
    background_url: null,
    disclaimer_text: "Uploads are visible to event organizers.",
    button_label: "Upload Photos",
  },
};
