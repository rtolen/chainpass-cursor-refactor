-- Create webhook delivery queue table to track all webhook attempts
CREATE TABLE IF NOT EXISTS public.webhook_delivery_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_partner_id UUID REFERENCES public.business_partners(id) ON DELETE CASCADE,
  callback_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, retrying
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create index for efficient retry queries
CREATE INDEX idx_webhook_queue_retry ON public.webhook_delivery_queue(next_retry_at, status)
WHERE status IN ('pending', 'failed');

-- Create index for business partner lookups
CREATE INDEX idx_webhook_queue_partner ON public.webhook_delivery_queue(business_partner_id);

-- Enable RLS
ALTER TABLE public.webhook_delivery_queue ENABLE ROW LEVEL SECURITY;

-- Admin can view all webhook deliveries
CREATE POLICY "Admins can view all webhook deliveries"
ON public.webhook_delivery_queue
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Business partners can view their own webhook deliveries
CREATE POLICY "Business partners can view their own webhook deliveries"
ON public.webhook_delivery_queue
FOR SELECT
TO authenticated
USING (
  business_partner_id IN (
    SELECT id FROM public.business_partners
    WHERE user_id = auth.uid()
  )
);