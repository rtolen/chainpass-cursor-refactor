-- Add request_photo_url column to verification_records
ALTER TABLE public.verification_records
ADD COLUMN request_photo_url TEXT;

