-- Create table for sandbox test scenarios persistence
CREATE TABLE public.sandbox_test_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_partner_id UUID REFERENCES business_partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  test_type TEXT NOT NULL, -- 'verification_flow', 'webhook', 'api_call', 'code_playground'
  configuration JSONB NOT NULL DEFAULT '{}',
  mock_data JSONB,
  expected_results JSONB,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for error logs and monitoring
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL, -- 'frontend', 'backend', 'api', 'webhook', 'database'
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB, -- Additional context like route, component, function name
  user_agent TEXT,
  ip_address TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for email notifications tracking
CREATE TABLE public.email_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL, -- 'verification_status', 'payment_confirmation', 'webhook_failure', 'admin_alert', 'system_update'
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  resend_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for webhook replay history
CREATE TABLE public.webhook_replay_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_webhook_id UUID REFERENCES vairify_webhook_events(id) ON DELETE CASCADE,
  replayed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  replayed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for theme preferences
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT true,
  email_digest_frequency TEXT DEFAULT 'weekly' CHECK (email_digest_frequency IN ('daily', 'weekly', 'monthly', 'never')),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sandbox_test_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_replay_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sandbox_test_scenarios
CREATE POLICY "Users can view their own test scenarios"
  ON public.sandbox_test_scenarios FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own test scenarios"
  ON public.sandbox_test_scenarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test scenarios"
  ON public.sandbox_test_scenarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test scenarios"
  ON public.sandbox_test_scenarios FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all test scenarios"
  ON public.sandbox_test_scenarios FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for error_logs
CREATE POLICY "Admins can view all error logs"
  ON public.error_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert error logs"
  ON public.error_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update error logs"
  ON public.error_logs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for email_notifications
CREATE POLICY "Admins can view all email notifications"
  ON public.email_notifications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own email notifications"
  ON public.email_notifications FOR SELECT
  USING (auth.uid() = recipient_user_id);

CREATE POLICY "Service role can manage email notifications"
  ON public.email_notifications FOR ALL
  USING (true) WITH CHECK (true);

-- RLS Policies for webhook_replay_history
CREATE POLICY "Admins can view webhook replay history"
  ON public.webhook_replay_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Business partners can view their webhook replays"
  ON public.webhook_replay_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_partners
      WHERE business_partners.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage webhook replay history"
  ON public.webhook_replay_history FOR ALL
  USING (true) WITH CHECK (true);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_sandbox_scenarios_user_id ON public.sandbox_test_scenarios(user_id);
CREATE INDEX idx_sandbox_scenarios_business_partner_id ON public.sandbox_test_scenarios(business_partner_id);
CREATE INDEX idx_sandbox_scenarios_test_type ON public.sandbox_test_scenarios(test_type);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON public.error_logs(resolved);
CREATE INDEX idx_error_logs_occurred_at ON public.error_logs(occurred_at);
CREATE INDEX idx_email_notifications_recipient_user_id ON public.email_notifications(recipient_user_id);
CREATE INDEX idx_email_notifications_status ON public.email_notifications(status);
CREATE INDEX idx_email_notifications_notification_type ON public.email_notifications(notification_type);
CREATE INDEX idx_webhook_replay_original_webhook_id ON public.webhook_replay_history(original_webhook_id);
CREATE INDEX idx_webhook_replay_replayed_by ON public.webhook_replay_history(replayed_by);
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_sandbox_scenarios_updated_at
  BEFORE UPDATE ON public.sandbox_test_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();