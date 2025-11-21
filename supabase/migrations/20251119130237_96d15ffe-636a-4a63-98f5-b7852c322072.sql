-- Fix search_path warning by setting it explicitly for the function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_verification_records_updated_at ON verification_records;
CREATE TRIGGER update_verification_records_updated_at 
    BEFORE UPDATE ON verification_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();