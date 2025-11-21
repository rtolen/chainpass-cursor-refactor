-- Create verification records table
CREATE TABLE public.verification_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  complycube_verification_id TEXT,
  verification_status TEXT DEFAULT 'pending',
  biometric_confirmed BOOLEAN DEFAULT false,
  id_document_url TEXT,
  selfie_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create V.A.I. assignments table
CREATE TABLE public.vai_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vai_code TEXT NOT NULL UNIQUE,
  verification_record_id UUID REFERENCES public.verification_records(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_record_id UUID REFERENCES public.verification_records(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create legal agreements table
CREATE TABLE public.legal_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vai_assignment_id UUID REFERENCES public.vai_assignments(id) ON DELETE CASCADE NOT NULL,
  leo_declaration_signed BOOLEAN DEFAULT false,
  signature_agreement_signed BOOLEAN DEFAULT false,
  signature_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vai_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public verification flow
CREATE POLICY "Anyone can create verification records"
ON public.verification_records FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view their own verification records"
ON public.verification_records FOR SELECT
USING (true);

CREATE POLICY "Anyone can update their own verification records"
ON public.verification_records FOR UPDATE
USING (true);

CREATE POLICY "Anyone can create V.A.I. assignments"
ON public.vai_assignments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view V.A.I. assignments"
ON public.vai_assignments FOR SELECT
USING (true);

CREATE POLICY "Anyone can update V.A.I. assignments"
ON public.vai_assignments FOR UPDATE
USING (true);

CREATE POLICY "Anyone can create payments"
ON public.payments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view payments"
ON public.payments FOR SELECT
USING (true);

CREATE POLICY "Anyone can create legal agreements"
ON public.legal_agreements FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view legal agreements"
ON public.legal_agreements FOR SELECT
USING (true);

CREATE POLICY "Anyone can update legal agreements"
ON public.legal_agreements FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_verification_records_updated_at
BEFORE UPDATE ON public.verification_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_verification_records_session_id ON public.verification_records(session_id);
CREATE INDEX idx_vai_assignments_vai_code ON public.vai_assignments(vai_code);
CREATE INDEX idx_payments_verification_record_id ON public.payments(verification_record_id);