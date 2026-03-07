export type BrandKey = 'bmw' | 'mini' | 'personal' | 'default';
export type PrivacyMode = 'public' | 'unlisted' | 'passcode';
export type MediaStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type MediaType = 'image' | 'video';

export interface BrandTheme {
  logo_url: string | null;
  logo_rounded?: boolean;
  primary_color: string;
  accent_color: string;
  background_color?: string;
  heading_text: string;
  subheading_text: string;
  background_url: string | null;
  disclaimer_text?: string;
  button_label?: string;
  share_text?: string;
}

export interface Event {
  id: string;
  name: string;
  brand_key: BrandKey;
  theme: Partial<BrandTheme>;
  upload_enabled: boolean;
  gallery_enabled: boolean;
  guest_book_enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  privacy_mode: PrivacyMode;
  passcode_hash: string | null;
  max_file_size_mb: number;
  allowed_types: string[];
  created_at: string;
  updated_at: string;
}

export interface GuestBookEntry {
  id: string;
  event_id: string;
  name: string;
  message: string | null;
  media_url: string | null;
  media_type: 'audio' | 'video' | null;
  created_at: string;
}

export interface Media {
  id: string;
  event_id: string;
  object_key_original: string;
  object_key_thumb: string | null;
  object_key_web: string | null;
  type: MediaType;
  size_bytes: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  status: MediaStatus;
  uploader_fingerprint: string | null;
  uploader_name: string | null;
  metadata_json: Record<string, unknown>;
  uploaded_at: string;
}

export interface DownloadJob {
  id: string;
  event_id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'expired';
  object_key: string | null;
  file_count: number;
  total_bytes: number;
  expires_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  objectKey: string;
  fileId: string;
}
