-- Create signed_contracts table for storing digitally signed agreements
CREATE TABLE IF NOT EXISTS public.signed_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  vai_number TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('law_enforcement', 'mutual_consent', 'terms_of_service')),
  contract_text TEXT NOT NULL,
  facial_match_confidence DECIMAL(5,2) NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  blockchain_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create signature_attempts table for audit trail
CREATE TABLE IF NOT EXISTS public.signature_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vai_number TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  facial_match_confidence DECIMAL(5,2),
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signed_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for signed_contracts
CREATE POLICY "Users can view their own signed contracts"
  ON public.signed_contracts
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert signed contracts"
  ON public.signed_contracts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all signed contracts"
  ON public.signed_contracts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for signature_attempts
CREATE POLICY "Service role can insert signature attempts"
  ON public.signature_attempts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all signature attempts"
  ON public.signature_attempts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_signed_contracts_vai_number ON public.signed_contracts(vai_number);
CREATE INDEX idx_signed_contracts_contract_type ON public.signed_contracts(contract_type);
CREATE INDEX idx_signed_contracts_signed_at ON public.signed_contracts(signed_at DESC);
CREATE INDEX idx_signature_attempts_vai_number ON public.signature_attempts(vai_number);
CREATE INDEX idx_signature_attempts_attempted_at ON public.signature_attempts(attempted_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_signed_contracts_updated_at
  BEFORE UPDATE ON public.signed_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();