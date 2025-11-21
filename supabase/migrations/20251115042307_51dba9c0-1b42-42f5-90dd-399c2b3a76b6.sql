-- Create table to store Vairify webhook events
CREATE TABLE public.vairify_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vai_number TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX idx_vairify_webhooks_user_id ON public.vairify_webhook_events(user_id);
CREATE INDEX idx_vairify_webhooks_vai_number ON public.vairify_webhook_events(vai_number);
CREATE INDEX idx_vairify_webhooks_processed ON public.vairify_webhook_events(processed);
CREATE INDEX idx_vairify_webhooks_event_type ON public.vairify_webhook_events(event_type);

-- Enable RLS
ALTER TABLE public.vairify_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only system can insert webhook events (this will be done via edge function with service role)
CREATE POLICY "Service role can insert webhook events"
ON public.vairify_webhook_events
FOR INSERT
TO service_role
WITH CHECK (true);

-- Only system can update webhook events
CREATE POLICY "Service role can update webhook events"
ON public.vairify_webhook_events
FOR UPDATE
TO service_role
USING (true);

-- Allow viewing webhook events (for debugging/admin purposes later)
CREATE POLICY "Service role can view webhook events"
ON public.vairify_webhook_events
FOR SELECT
TO service_role
USING (true);

-- Create table to store V.A.I. status updates from Vairify
CREATE TABLE public.vai_status_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vai_number TEXT NOT NULL,
  status_type TEXT NOT NULL, -- 'account_created', 'account_suspended', 'account_deleted', 'profile_updated', 'violation_reported'
  status_data JSONB,
  webhook_event_id UUID REFERENCES public.vairify_webhook_events(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for V.A.I. status lookups
CREATE INDEX idx_vai_status_vai_number ON public.vai_status_updates(vai_number);
CREATE INDEX idx_vai_status_type ON public.vai_status_updates(status_type);
CREATE INDEX idx_vai_status_webhook ON public.vai_status_updates(webhook_event_id);

-- Enable RLS on status updates
ALTER TABLE public.vai_status_updates ENABLE ROW LEVEL SECURITY;

-- Service role can manage status updates
CREATE POLICY "Service role can manage status updates"
ON public.vai_status_updates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.vairify_webhook_events IS 'Stores raw webhook events received from Vairify for audit and debugging';
COMMENT ON TABLE public.vai_status_updates IS 'Stores processed status updates about V.A.I. codes from Vairify';
