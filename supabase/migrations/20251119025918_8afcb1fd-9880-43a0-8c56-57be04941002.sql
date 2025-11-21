-- Create coupons table for discount codes
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  discount_percentage INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN discount_type = 'percentage' THEN discount_value::INTEGER
      ELSE NULL
    END
  ) STORED,
  is_active BOOLEAN DEFAULT true,
  multi_use BOOLEAN DEFAULT false,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create coupon_usage table to track usage
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_email TEXT,
  session_id TEXT,
  used_at TIMESTAMPTZ DEFAULT now()
);

-- Create pricing_config table for centralized pricing management
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT UNIQUE NOT NULL,
  base_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'usd',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default pricing
INSERT INTO public.pricing_config (product_name, base_price, currency)
VALUES ('vai_verification', 99.00, 'usd')
ON CONFLICT (product_name) DO NOTHING;

-- Insert default 100% comp coupon FC0001 (multi-use)
INSERT INTO public.coupons (code, discount_type, discount_value, multi_use, description)
VALUES ('FC0001', 'percentage', 100, true, 'Internal comp coupon - 100% discount')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupons (public read for validation, admin write)
CREATE POLICY "Anyone can view active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for coupon_usage (anyone can insert, admin can view)
CREATE POLICY "Anyone can record coupon usage"
  ON public.coupon_usage FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view coupon usage"
  ON public.coupon_usage FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for pricing_config (public read, admin write)
CREATE POLICY "Anyone can view active pricing"
  ON public.pricing_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage pricing"
  ON public.pricing_config FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_config_updated_at
  BEFORE UPDATE ON public.pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();