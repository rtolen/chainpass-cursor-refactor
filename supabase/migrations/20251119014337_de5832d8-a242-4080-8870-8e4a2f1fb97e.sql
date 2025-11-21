-- Add missing columns to verification_records table
ALTER TABLE verification_records
ADD COLUMN IF NOT EXISTS complycube_client_id TEXT,
ADD COLUMN IF NOT EXISTS complycube_session_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_records_complycube_client_id 
ON verification_records(complycube_client_id);

-- Create storage bucket for verification photos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-photos', 'verification-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification photos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for verification photos'
  ) THEN
    CREATE POLICY "Public read access for verification photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'verification-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can upload verification photos'
  ) THEN
    CREATE POLICY "Service role can upload verification photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'verification-photos');
  END IF;
END $$;