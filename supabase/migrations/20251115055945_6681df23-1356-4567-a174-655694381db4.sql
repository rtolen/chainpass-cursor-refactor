-- Create anomaly detection settings table
CREATE TABLE public.anomaly_detection_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensitivity_level TEXT NOT NULL DEFAULT 'medium' CHECK (sensitivity_level IN ('low', 'medium', 'high')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  learning_period_days INTEGER NOT NULL DEFAULT 30,
  min_data_points INTEGER NOT NULL DEFAULT 50,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create detected anomalies table
CREATE TABLE public.detected_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  anomaly_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  confidence_score NUMERIC(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  supporting_data JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  notes TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_detected_anomalies_admin ON public.detected_anomalies(admin_user_id);
CREATE INDEX idx_detected_anomalies_detected_at ON public.detected_anomalies(detected_at DESC);
CREATE INDEX idx_detected_anomalies_resolved ON public.detected_anomalies(resolved);
CREATE INDEX idx_detected_anomalies_severity ON public.detected_anomalies(severity);

-- Enable RLS
ALTER TABLE public.anomaly_detection_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detected_anomalies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settings
CREATE POLICY "Admins can view anomaly settings"
ON public.anomaly_detection_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update anomaly settings"
ON public.anomaly_detection_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert anomaly settings"
ON public.anomaly_detection_settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for detected anomalies
CREATE POLICY "Admins can view detected anomalies"
ON public.detected_anomalies
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update detected anomalies"
ON public.detected_anomalies
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage detected anomalies"
ON public.detected_anomalies
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default settings
INSERT INTO public.anomaly_detection_settings (sensitivity_level, enabled, learning_period_days, min_data_points)
VALUES ('medium', true, 30, 50);

-- Create trigger for updated_at
CREATE TRIGGER update_anomaly_settings_updated_at
BEFORE UPDATE ON public.anomaly_detection_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for detected anomalies
ALTER PUBLICATION supabase_realtime ADD TABLE public.detected_anomalies;