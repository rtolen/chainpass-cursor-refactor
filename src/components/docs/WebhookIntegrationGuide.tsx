import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Webhook, Code, Shield, CheckCircle, AlertTriangle } from "lucide-react";

export const WebhookIntegrationGuide = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-6 h-6 text-primary" />
            Webhook Integration Guide
          </CardTitle>
          <CardDescription>
            Receive real-time notifications about verification events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertTitle>Webhook Security</AlertTitle>
            <AlertDescription>
              All webhooks are signed with HMAC SHA-256. Always verify the signature before processing.
            </AlertDescription>
          </Alert>

          <div className="prose prose-slate max-w-none dark:prose-invert">
            <h3>Webhook Endpoint Setup</h3>
            <p>
              Configure your webhook endpoint URL during business partner registration. ChainPass will send POST requests to this URL when verification events occur.
            </p>

            <h4>Webhook Event Types</h4>
            <div className="not-prose space-y-2 my-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">verification.started</Badge>
                <span className="text-sm text-muted-foreground">User initiates verification</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">verification.completed</Badge>
                <span className="text-sm text-muted-foreground">Verification successfully completed</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">verification.failed</Badge>
                <span className="text-sm text-muted-foreground">Verification failed or rejected</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">vai.assigned</Badge>
                <span className="text-sm text-muted-foreground">V.A.I. code assigned to user</span>
              </div>
            </div>

            <h3>Webhook Payload Structure</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "event_type": "verification.completed",
  "event_id": "evt_abc123xyz",
  "timestamp": "2025-01-15T11:30:00Z",
  "data": {
    "session_id": "sess_abc123xyz",
    "verification_record_id": "ver_def456ghi",
    "vai_code": "VAI-AB12-CD34-EF56",
    "user_id": "user_789",
    "status": "completed",
    "verification_method": "biometric",
    "completed_at": "2025-01-15T11:30:00Z"
  }
}`}
            </pre>
          </div>

          <Tabs defaultValue="nodejs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="nodejs">Node.js</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
              <TabsTrigger value="ruby">Ruby</TabsTrigger>
            </TabsList>

            <TabsContent value="nodejs" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Webhook Receiver (Express.js)</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = process.env.CHAINPASS_WEBHOOK_SECRET;

// Verify webhook signature
function verifySignature(payload, signature, timestamp) {
  const signatureData = \`\${timestamp}.\${JSON.stringify(payload)}\`;
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signatureData)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

app.post('/webhooks/chainpass', (req, res) => {
  const signature = req.headers['x-chainpass-signature'];
  const timestamp = req.headers['x-chainpass-timestamp'];
  const payload = req.body;
  
  // Verify signature
  if (!verifySignature(payload, signature, timestamp)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Check timestamp to prevent replay attacks (5 min tolerance)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - timestamp) > 300) {
    return res.status(401).json({ error: 'Timestamp too old' });
  }
  
  // Process the webhook
  switch (payload.event_type) {
    case 'verification.completed':
      handleVerificationCompleted(payload.data);
      break;
    case 'vai.assigned':
      handleVAIAssigned(payload.data);
      break;
    default:
      console.log('Unknown event type:', payload.event_type);
  }
  
  res.status(200).json({ received: true });
});

function handleVerificationCompleted(data) {
  console.log('Verification completed:', data.vai_code);
  // Update your database, send notifications, etc.
}

function handleVAIAssigned(data) {
  console.log('VAI assigned:', data.vai_code);
  // Store VAI code, grant access, etc.
}

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});`}
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="python" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Webhook Receiver (Flask)</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`from flask import Flask, request, jsonify
import hmac
import hashlib
import json
import time
import os

app = Flask(__name__)

WEBHOOK_SECRET = os.environ.get('CHAINPASS_WEBHOOK_SECRET')

def verify_signature(payload, signature, timestamp):
    signature_data = f"{timestamp}.{json.dumps(payload)}"
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        signature_data.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhooks/chainpass', methods=['POST'])
def chainpass_webhook():
    signature = request.headers.get('X-Chainpass-Signature')
    timestamp = int(request.headers.get('X-Chainpass-Timestamp'))
    payload = request.json
    
    # Verify signature
    if not verify_signature(payload, signature, timestamp):
        return jsonify({'error': 'Invalid signature'}), 401
    
    # Check timestamp (5 min tolerance)
    current_time = int(time.time())
    if abs(current_time - timestamp) > 300:
        return jsonify({'error': 'Timestamp too old'}), 401
    
    # Process webhook
    event_type = payload.get('event_type')
    data = payload.get('data')
    
    if event_type == 'verification.completed':
        handle_verification_completed(data)
    elif event_type == 'vai.assigned':
        handle_vai_assigned(data)
    else:
        print(f'Unknown event type: {event_type}')
    
    return jsonify({'received': True}), 200

def handle_verification_completed(data):
    print(f"Verification completed: {data['vai_code']}")
    # Update database, send notifications, etc.

def handle_vai_assigned(data):
    print(f"VAI assigned: {data['vai_code']}")
    # Store VAI code, grant access, etc.

if __name__ == '__main__':
    app.run(port=3000)`}
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="php" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Webhook Receiver (PHP)</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`<?php
$webhookSecret = getenv('CHAINPASS_WEBHOOK_SECRET');

function verifySignature($payload, $signature, $timestamp, $secret) {
    $signatureData = $timestamp . '.' . json_encode($payload);
    $expectedSignature = hash_hmac('sha256', $signatureData, $secret);
    return hash_equals($signature, $expectedSignature);
}

// Get webhook data
$signature = $_SERVER['HTTP_X_CHAINPASS_SIGNATURE'] ?? '';
$timestamp = $_SERVER['HTTP_X_CHAINPASS_TIMESTAMP'] ?? '';
$payload = json_decode(file_get_contents('php://input'), true);

// Verify signature
if (!verifySignature($payload, $signature, $timestamp, $webhookSecret)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Check timestamp (5 min tolerance)
$currentTime = time();
if (abs($currentTime - $timestamp) > 300) {
    http_response_code(401);
    echo json_encode(['error' => 'Timestamp too old']);
    exit;
}

// Process webhook
switch ($payload['event_type']) {
    case 'verification.completed':
        handleVerificationCompleted($payload['data']);
        break;
    case 'vai.assigned':
        handleVAIAssigned($payload['data']);
        break;
    default:
        error_log('Unknown event type: ' . $payload['event_type']);
}

http_response_code(200);
echo json_encode(['received' => true]);

function handleVerificationCompleted($data) {
    error_log('Verification completed: ' . $data['vai_code']);
    // Update database, send notifications, etc.
}

function handleVAIAssigned($data) {
    error_log('VAI assigned: ' . $data['vai_code']);
    // Store VAI code, grant access, etc.
}
?>`}
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ruby" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Webhook Receiver (Sinatra)</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`require 'sinatra'
require 'json'
require 'openssl'

WEBHOOK_SECRET = ENV['CHAINPASS_WEBHOOK_SECRET']

def verify_signature(payload, signature, timestamp)
  signature_data = "#{timestamp}.#{payload.to_json}"
  expected_signature = OpenSSL::HMAC.hexdigest(
    'SHA256',
    WEBHOOK_SECRET,
    signature_data
  )
  
  Rack::Utils.secure_compare(signature, expected_signature)
end

post '/webhooks/chainpass' do
  request.body.rewind
  payload_body = request.body.read
  payload = JSON.parse(payload_body)
  
  signature = request.env['HTTP_X_CHAINPASS_SIGNATURE']
  timestamp = request.env['HTTP_X_CHAINPASS_TIMESTAMP'].to_i
  
  # Verify signature
  unless verify_signature(payload, signature, timestamp)
    status 401
    return { error: 'Invalid signature' }.to_json
  end
  
  # Check timestamp (5 min tolerance)
  current_time = Time.now.to_i
  if (current_time - timestamp).abs > 300
    status 401
    return { error: 'Timestamp too old' }.to_json
  end
  
  # Process webhook
  case payload['event_type']
  when 'verification.completed'
    handle_verification_completed(payload['data'])
  when 'vai.assigned'
    handle_vai_assigned(payload['data'])
  else
    puts "Unknown event type: #{payload['event_type']}"
  end
  
  { received: true }.to_json
end

def handle_verification_completed(data)
  puts "Verification completed: #{data['vai_code']}"
  # Update database, send notifications, etc.
end

def handle_vai_assigned(data)
  puts "VAI assigned: #{data['vai_code']}"
  # Store VAI code, grant access, etc.
end`}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertTitle>Best Practices</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Always verify webhook signatures before processing</li>
                <li>Use constant-time comparison for signature verification</li>
                <li>Check timestamps to prevent replay attacks (5-minute window)</li>
                <li>Return 200 status code within 5 seconds</li>
                <li>Process webhooks asynchronously if needed</li>
                <li>Implement idempotency using event_id</li>
                <li>Log all webhook events for debugging</li>
                <li>Use HTTPS endpoints only</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Retry Policy</AlertTitle>
            <AlertDescription>
              ChainPass will retry failed webhooks with exponential backoff:
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>1st retry: after 1 minute</li>
                <li>2nd retry: after 5 minutes</li>
                <li>3rd retry: after 30 minutes</li>
                <li>4th retry: after 2 hours</li>
                <li>5th retry: after 6 hours</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
