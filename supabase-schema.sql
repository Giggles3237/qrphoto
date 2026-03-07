-- QRPhoto Database Schema
-- Run this in the Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE public.events (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  brand_key      TEXT NOT NULL DEFAULT 'default',
  theme          JSONB NOT NULL DEFAULT '{}'::jsonb,
  upload_enabled BOOLEAN NOT NULL DEFAULT true,
  gallery_enabled BOOLEAN NOT NULL DEFAULT false,
  guest_book_enabled BOOLEAN NOT NULL DEFAULT false,
  starts_at      TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  privacy_mode   TEXT NOT NULL DEFAULT 'unlisted'
    CHECK (privacy_mode IN ('public', 'unlisted', 'passcode')),
  passcode_hash  TEXT,
  max_file_size_mb INTEGER NOT NULL DEFAULT 20,
  allowed_types  TEXT[] NOT NULL DEFAULT ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- MEDIA TABLE
-- ============================================
CREATE TABLE public.media (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  object_key_original TEXT NOT NULL,
  object_key_thumb    TEXT,
  object_key_web      TEXT,
  type                TEXT NOT NULL DEFAULT 'image',
  size_bytes          BIGINT,
  mime_type           TEXT,
  width               INTEGER,
  height              INTEGER,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  uploader_fingerprint TEXT,
  metadata_json       JSONB DEFAULT '{}'::jsonb,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_event_id ON public.media(event_id);
CREATE INDEX idx_media_status ON public.media(status);
CREATE INDEX idx_media_uploaded_at ON public.media(uploaded_at DESC);

-- ============================================
-- GUEST BOOK ENTRIES TABLE
-- ============================================
CREATE TABLE public.guest_book_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  message     TEXT,
  media_url   TEXT,
  media_type  TEXT CHECK (media_type IN ('audio', 'video')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guest_book_event_id ON public.guest_book_entries(event_id);

-- ============================================
-- DOWNLOAD JOBS TABLE
-- ============================================
CREATE TABLE public.download_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'expired')),
  object_key  TEXT,
  file_count  INTEGER DEFAULT 0,
  total_bytes BIGINT DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER download_jobs_updated_at
  BEFORE UPDATE ON public.download_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_jobs ENABLE ROW LEVEL SECURITY;

-- Events: anyone can read, only authenticated can write
CREATE POLICY "events_read_all" ON public.events FOR SELECT USING (true);
CREATE POLICY "events_insert_auth" ON public.events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "events_update_auth" ON public.events FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "events_delete_auth" ON public.events FOR DELETE USING (auth.role() = 'authenticated');

-- Media: anyone can read and insert (anonymous uploads), authenticated can manage
CREATE POLICY "media_read_all" ON public.media FOR SELECT USING (true);
CREATE POLICY "media_insert_anon" ON public.media FOR INSERT WITH CHECK (event_id IS NOT NULL);
CREATE POLICY "media_update_auth" ON public.media FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "media_delete_auth" ON public.media FOR DELETE USING (auth.role() = 'authenticated');

-- Download jobs: only authenticated users
CREATE POLICY "download_jobs_all_auth" ON public.download_jobs FOR ALL USING (auth.role() = 'authenticated');

-- Guest book entries: anyone can read and insert, authenticated can delete
ALTER TABLE public.guest_book_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guest_book_read_all" ON public.guest_book_entries FOR SELECT USING (true);
CREATE POLICY "guest_book_insert_anon" ON public.guest_book_entries FOR INSERT WITH CHECK (event_id IS NOT NULL);
CREATE POLICY "guest_book_delete_auth" ON public.guest_book_entries FOR DELETE USING (auth.role() = 'authenticated');
