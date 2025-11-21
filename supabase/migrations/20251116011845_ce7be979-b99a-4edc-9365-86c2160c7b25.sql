-- Add user_id to business_partners table to link with auth users
ALTER TABLE business_partners ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add index for faster lookups
CREATE INDEX idx_business_partners_user_id ON business_partners(user_id);

-- Create API usage tracking table
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_partner_id UUID NOT NULL REFERENCES business_partners(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_usage_logs_partner_id ON api_usage_logs(business_partner_id);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at);

-- Enable RLS on api_usage_logs
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Business partners can view their own usage logs
CREATE POLICY "Business partners can view their own usage logs"
ON api_usage_logs
FOR SELECT
USING (
  business_partner_id IN (
    SELECT id FROM business_partners WHERE user_id = auth.uid()
  )
);

-- Admins can view all usage logs
CREATE POLICY "Admins can view all usage logs"
ON api_usage_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Service role can insert usage logs
CREATE POLICY "Service role can insert usage logs"
ON api_usage_logs
FOR INSERT
WITH CHECK (true);

-- Update RLS policies for business_partners to allow partners to view/update their own data
CREATE POLICY "Business partners can view their own data"
ON business_partners
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Business partners can update their own data"
ON business_partners
FOR UPDATE
USING (user_id = auth.uid());