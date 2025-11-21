-- Create webhook test history table
CREATE TABLE webhook_test_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_partner_id UUID NOT NULL REFERENCES business_partners(id) ON DELETE CASCADE,
  test_payload JSONB NOT NULL,
  callback_url TEXT NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_test_history_partner_id ON webhook_test_history(business_partner_id);
CREATE INDEX idx_webhook_test_history_created_at ON webhook_test_history(created_at);

-- Enable RLS
ALTER TABLE webhook_test_history ENABLE ROW LEVEL SECURITY;

-- Business partners can view their own test history
CREATE POLICY "Business partners can view their own test history"
ON webhook_test_history
FOR SELECT
USING (
  business_partner_id IN (
    SELECT id FROM business_partners WHERE user_id = auth.uid()
  )
);

-- Service role can insert test history
CREATE POLICY "Service role can insert test history"
ON webhook_test_history
FOR INSERT
WITH CHECK (true);

-- Admins can view all test history
CREATE POLICY "Admins can view all test history"
ON webhook_test_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'));