-- Create platform_compliance table to track platform-specific requirements
CREATE TABLE IF NOT EXISTS public.platform_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vai_number TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  leo_disclosure BOOLEAN DEFAULT FALSE,
  terms_of_service BOOLEAN DEFAULT FALSE,
  privacy_policy BOOLEAN DEFAULT FALSE,
  mutual_consent_contract BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_vai_platform UNIQUE(vai_number, platform_id)
);

-- Create indexes for performance
CREATE INDEX idx_platform_compliance_vai ON public.platform_compliance(vai_number);
CREATE INDEX idx_platform_compliance_platform ON public.platform_compliance(platform_id);

-- Create compliance audit log table
CREATE TABLE IF NOT EXISTS public.compliance_check_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vai_number TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  user_id TEXT,
  check_type TEXT,
  result_status TEXT NOT NULL,
  response_time_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compliance_audit_vai ON public.compliance_check_audit(vai_number);
CREATE INDEX idx_compliance_audit_platform ON public.compliance_check_audit(platform_id);
CREATE INDEX idx_compliance_audit_date ON public.compliance_check_audit(created_at);

-- Enable RLS
ALTER TABLE public.platform_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_check_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_compliance
CREATE POLICY "Service role can manage platform compliance"
ON public.platform_compliance
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated reads (for API access)
CREATE POLICY "Allow authenticated read access"
ON public.platform_compliance
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for compliance_check_audit (service role only)
CREATE POLICY "Service role can manage audit logs"
ON public.compliance_check_audit
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_platform_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER platform_compliance_updated_at
  BEFORE UPDATE ON public.platform_compliance
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_compliance_updated_at();

COMMENT ON TABLE public.platform_compliance IS 'Tracks platform-specific compliance requirements per V.A.I.';
COMMENT ON TABLE public.compliance_check_audit IS 'Audit log for all compliance check API calls';

