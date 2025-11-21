-- Create business configurations table
-- This table stores business client configuration securely on the server
-- API keys and secrets are NOT exposed to the client bundle

CREATE TABLE IF NOT EXISTS public.business_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  description TEXT,
  api_endpoint TEXT NOT NULL,
  return_url TEXT NOT NULL,
  api_key TEXT, -- Stored server-side only, never exposed to client
  webhook_secret TEXT, -- For future webhook signature validation
  required_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  logo_url TEXT,
  theme_colors JSONB,
  environments JSONB, -- Store dev/prod environment configs
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.business_configurations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read business configs (but not secrets)
-- We'll use a view or edge function to filter out sensitive fields
CREATE POLICY "Allow authenticated read access"
  ON public.business_configurations
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Allow public read access for business list (name, id, logo only)
-- Full configs should be fetched via edge function
CREATE POLICY "Allow public read for business list"
  ON public.business_configurations
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role full access"
  ON public.business_configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX idx_business_id ON public.business_configurations(business_id);
CREATE INDEX idx_business_active ON public.business_configurations(is_active) WHERE is_active = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_business_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_configurations_updated_at
  BEFORE UPDATE ON public.business_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_business_configurations_updated_at();

-- Insert existing businesses from businessRegistry.ts
-- NOTE: API keys should be rotated after migration for security
INSERT INTO public.business_configurations (
  business_id,
  business_name,
  description,
  api_endpoint,
  return_url,
  api_key,
  required_steps,
  environments,
  is_active
) VALUES (
  'vairify',
  'Vairify',
  'Dating safety & verification for law enforcement',
  'https://fujtqbefdoasenvebuxw.supabase.co/functions/v1/receive-vai-verification',
  'https://devtest.vairify.io/verification-complete',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1anRxYmVmZG9hc2VudmVidXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MDg2ODksImV4cCI6MjA3Nzk4NDY4OX0.0qPlcevDAOuu1rC1vem1-qHlisbb5WitrVgS8vnZrY0',
  '["payment", "id-upload", "facial", "leo-declaration", "signature", "contract-signature"]'::jsonb,
  '{
    "dev": {
      "callback_url": "https://fujtqbefdoasenvebuxw.supabase.co/functions/v1/receive-vai-verification",
      "return_url": "https://devtest.vairify.io/verification-complete"
    },
    "prod": {
      "callback_url": "https://vairify.io/api/receive-vai-verification",
      "return_url": "https://vairify.io/verification-complete"
    }
  }'::jsonb,
  true
), (
  'vaivault',
  'VAI VAULT',
  'Secure identity vault & verification',
  'https://example.com/api/vai-callback',
  'https://vaivault.example.com/verification-complete',
  'placeholder_api_key',
  '["payment", "id-upload", "facial"]'::jsonb,
  '{
    "dev": {
      "callback_url": "https://dev.vaivault.example.com/api/vai-callback",
      "return_url": "https://dev.vaivault.example.com/verification-complete"
    },
    "prod": {
      "callback_url": "https://vaivault.example.com/api/vai-callback",
      "return_url": "https://vaivault.example.com/verification-complete"
    }
  }'::jsonb,
  true
)
ON CONFLICT (business_id) DO NOTHING;

