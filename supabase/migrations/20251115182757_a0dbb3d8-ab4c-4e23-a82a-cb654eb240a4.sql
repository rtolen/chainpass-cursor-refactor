-- Create business_partners table for registration
CREATE TABLE public.business_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  website TEXT,
  callback_url TEXT NOT NULL,
  return_url TEXT NOT NULL,
  business_description TEXT,
  api_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID
);

-- Enable RLS
ALTER TABLE public.business_partners ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can submit a registration
CREATE POLICY "Anyone can insert business partner applications"
ON public.business_partners
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Admins can view all registrations
CREATE POLICY "Admins can view all business partners"
ON public.business_partners
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can update registrations
CREATE POLICY "Admins can update business partners"
ON public.business_partners
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_business_partners_updated_at
BEFORE UPDATE ON public.business_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();