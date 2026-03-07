import { z } from "zod";

export const createEventSchema = z.object({
  id: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(64, "Slug must be at most 64 characters")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      "Slug must be lowercase alphanumeric with hyphens, cannot start/end with hyphen"
    ),
  name: z.string().min(1, "Name is required").max(200),
  brand_key: z.enum(["bmw", "mini", "personal", "default"]).default("default"),
  theme: z
    .object({
      logo_url: z.string().nullable().optional(),
      logo_rounded: z.boolean().optional(),
      primary_color: z.string().optional(),
      accent_color: z.string().optional(),
      background_color: z.string().optional(),
      heading_text: z.string().optional(),
      subheading_text: z.string().optional(),
      background_url: z.string().nullable().optional(),
      disclaimer_text: z.string().optional(),
      button_label: z.string().optional(),
      share_text: z.string().optional(),
    })
    .default({}),
  upload_enabled: z.boolean().default(true),
  gallery_enabled: z.boolean().default(false),
  guest_book_enabled: z.boolean().default(false),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
  privacy_mode: z.enum(["public", "unlisted", "passcode"]).default("unlisted"),
  passcode: z.string().min(4).max(32).optional(),
  max_file_size_mb: z.number().int().min(1).max(50).default(20),
  allowed_types: z
    .array(z.string())
    .default(["image/jpeg", "image/png", "image/webp", "image/heic"]),
});

export const updateEventSchema = createEventSchema
  .partial()
  .omit({ id: true });

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
