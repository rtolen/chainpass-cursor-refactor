-- Create retention policies table
CREATE TABLE public.retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name TEXT NOT NULL DEFAULT 'Activity Log Retention',
  retention_days INTEGER NOT NULL DEFAULT 90,
  archive_before_delete BOOLEAN NOT NULL DEFAULT true,
  auto_delete_enabled BOOLEAN NOT NULL DEFAULT false,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create archived activity logs table
CREATE TABLE public.archived_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_log_id UUID NOT NULL,
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID,
  target_user_email TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  original_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_archived_logs_archived_at ON public.archived_activity_logs(archived_at);
CREATE INDEX idx_archived_logs_original_id ON public.archived_activity_logs(original_log_id);

-- Enable RLS
ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for retention_policies
CREATE POLICY "Admins can view retention policies"
ON public.retention_policies
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update retention policies"
ON public.retention_policies
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert retention policies"
ON public.retention_policies
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for archived_activity_logs
CREATE POLICY "Admins can view archived logs"
ON public.archived_activity_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage archived logs"
ON public.archived_activity_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default retention policy
INSERT INTO public.retention_policies (policy_name, retention_days, archive_before_delete, auto_delete_enabled)
VALUES ('Activity Log Retention', 90, true, false);

-- Create trigger for updated_at
CREATE TRIGGER update_retention_policies_updated_at
BEFORE UPDATE ON public.retention_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();