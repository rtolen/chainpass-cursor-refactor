-- Add missing columns to verification_records table
ALTER TABLE verification_records 
ADD COLUMN IF NOT EXISTS le_disclosure_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mutual_consent_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS final_verification_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signed_contract_id UUID;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_verification_records_session 
ON verification_records(session_id);

-- Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_verification_records_updated_at ON verification_records;
CREATE TRIGGER update_verification_records_updated_at 
    BEFORE UPDATE ON verification_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();