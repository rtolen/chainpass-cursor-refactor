-- Add email column to verification_records to store the ComplyCube contact email
ALTER TABLE public.verification_records
ADD COLUMN IF NOT EXISTS email TEXT;

