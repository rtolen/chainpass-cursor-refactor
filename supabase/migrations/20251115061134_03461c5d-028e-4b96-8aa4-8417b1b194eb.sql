-- Create email digest settings table
CREATE TABLE public.email_digest_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  send_time TEXT NOT NULL DEFAULT '09:00',
  include_activity_summary BOOLEAN NOT NULL DEFAULT true,
  include_anomaly_report BOOLEAN NOT NULL DEFAULT true,
  include_comparison_charts BOOLEAN NOT NULL DEFAULT true,
  include_performance_metrics BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email digest recipients table
CREATE TABLE public.email_digest_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email digest history table
CREATE TABLE public.email_digest_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  recipients TEXT[] NOT NULL,
  frequency TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  summary_data JSONB
);

-- Create indexes
CREATE INDEX idx_digest_recipients_active ON public.email_digest_recipients(active);
CREATE INDEX idx_digest_history_sent_at ON public.email_digest_history(sent_at DESC);

-- Enable RLS
ALTER TABLE public.email_digest_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_digest_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_digest_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settings
CREATE POLICY "Admins can view digest settings"
ON public.email_digest_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update digest settings"
ON public.email_digest_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert digest settings"
ON public.email_digest_settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for recipients
CREATE POLICY "Admins can view digest recipients"
ON public.email_digest_recipients
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage digest recipients"
ON public.email_digest_recipients
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for history
CREATE POLICY "Admins can view digest history"
ON public.email_digest_history
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage digest history"
ON public.email_digest_history
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default settings
INSERT INTO public.email_digest_settings (enabled, frequency, send_time)
VALUES (false, 'weekly', '09:00');

-- Create trigger for updated_at
CREATE TRIGGER update_email_digest_settings_updated_at
BEFORE UPDATE ON public.email_digest_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();