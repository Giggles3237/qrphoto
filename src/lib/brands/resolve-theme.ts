import type { BrandKey, BrandTheme } from "@/types";
import { BRAND_THEMES } from "./themes";

export function resolveTheme(
  brandKey: BrandKey,
  eventOverrides: Partial<BrandTheme>
): BrandTheme {
  const base = BRAND_THEMES[brandKey] ?? BRAND_THEMES.default;

  return Object.fromEntries(
    Object.entries(base).map(([key, val]) => {
      const override = eventOverrides[key as keyof BrandTheme];
      // Only apply override if it's explicitly set (not null/undefined)
      return [key, override !== undefined && override !== null ? override : val];
    })
  ) as BrandTheme;
}
