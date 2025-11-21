-- Create alert settings table
CREATE TABLE public.alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  alert_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('anomaly', 'security_event', 'performance', 'custom')),
  severity_threshold TEXT[] DEFAULT ARRAY['high', 'critical'],
  notification_channels TEXT[] DEFAULT ARRAY['email'],
  email_recipients TEXT[],
  slack_webhook_url TEXT,
  slack_channel TEXT,
  sms_recipients TEXT[],
  cooldown_minutes INTEGER DEFAULT 15,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create alert history table
CREATE TABLE public.alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_setting_id UUID REFERENCES public.alert_settings(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  event_data JSONB,
  notification_channels TEXT[],
  sent_successfully BOOLEAN DEFAULT false,
  error_message TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_alert_settings_enabled ON public.alert_settings(enabled);
CREATE INDEX idx_alert_settings_type ON public.alert_settings(alert_type);
CREATE INDEX idx_alert_history_triggered ON public.alert_history(triggered_at DESC);
CREATE INDEX idx_alert_history_alert_setting ON public.alert_history(alert_setting_id);

-- Enable RLS
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alert settings
CREATE POLICY "Admins can manage alert settings"
ON public.alert_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for alert history
CREATE POLICY "Admins can view alert history"
ON public.alert_history
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage alert history"
ON public.alert_history
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_alert_settings_updated_at
BEFORE UPDATE ON public.alert_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default alert settings
INSERT INTO public.alert_settings (alert_name, alert_type, severity_threshold, notification_channels, email_recipients) VALUES
('Critical Anomalies', 'anomaly', ARRAY['critical', 'high'], ARRAY['email'], ARRAY['admin@example.com']),
('Security Events', 'security_event', ARRAY['critical', 'high'], ARRAY['email'], ARRAY['admin@example.com']),
('Performance Issues', 'performance', ARRAY['high'], ARRAY['email'], ARRAY['admin@example.com']);