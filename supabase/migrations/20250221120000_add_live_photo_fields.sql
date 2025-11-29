-- Add live photo related metadata to verification_records
ALTER TABLE public.verification_records
  ADD COLUMN live_photo_id TEXT,
  ADD COLUMN get_photo_url TEXT;

