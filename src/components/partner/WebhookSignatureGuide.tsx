import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Code, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WebhookSignatureGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Webhook Signature Verification
          </CardTitle>
          <CardDescription>
            Secure your webhook endpoints with HMAC-SHA256 signature verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Always verify webhook signatures to ensure requests are from ChainPass and haven't been tampered with.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">How It Works</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>ChainPass generates an HMAC-SHA256 signature using your API key</li>
                <li>The signature is sent in the <code className="bg-muted px-1 rounded">X-Webhook-Signature</code> header</li>
                <li>Your server validates the signature using the same API key</li>
                <li>Requests with invalid signatures should be rejected</li>
              </ol>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Protection against unauthorized requests</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Detection of payload tampering</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="text-sm">Replay attack prevention (5-minute window)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Implementation Examples
          </CardTitle>
          <CardDescription>Code examples for validating webhook signatures</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="nodejs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="nodejs">Node.js</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
              <TabsTrigger value="ruby">Ruby</TabsTrigger>
            </TabsList>

            <TabsContent value="nodejs" className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Express.js Example</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`const crypto = require('crypto');
const express = require('express');

const app = express();
app.use(express.json());

const API_KEY = process.env.CHAINPASS_API_KEY;
const TOLERANCE_SECONDS = 300; // 5 minutes

function verifySignature(payload, signatureHeader, apiKey) {
  // Parse signature header: "t=<timestamp>,v1=<signature>"
  const parts = signatureHeader.split(',');
  const timestamp = parts[0].split('=')[1];
  const signature = parts[1].split('=')[1];
  
  // Check timestamp (replay attack prevention)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > TOLERANCE_SECONDS) {
    throw new Error('Timestamp too old');
  }
  
  // Generate expected signature
  const payloadString = JSON.stringify(payload);
  const signedPayload = \`\${timestamp}.\${payloadString}\`;
  const expectedSignature = crypto
    .createHmac('sha256', apiKey)
    .update(signedPayload)
    .digest('base64');
  
  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

app.post('/webhook', (req, res) => {
  const signatureHeader = req.headers['x-webhook-signature'];
  
  try {
    if (!verifySignature(req.body, signatureHeader, API_KEY)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Process webhook
    console.log('Verified webhook:', req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Signature verification failed:', error);
    res.status(401).json({ error: error.message });
  }
});`}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="python" className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Flask Example</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`import hmac
import hashlib
import base64
import time
import json
from flask import Flask, request, jsonify

app = Flask(__name__)
API_KEY = os.environ.get('CHAINPASS_API_KEY')
TOLERANCE_SECONDS = 300  # 5 minutes

def verify_signature(payload, signature_header, api_key):
    # Parse signature header
    parts = signature_header.split(',')
    timestamp = int(parts[0].split('=')[1])
    signature = parts[1].split('=')[1]
    
    # Check timestamp (replay attack prevention)
    current_time = int(time.time())
    if abs(current_time - timestamp) > TOLERANCE_SECONDS:
        raise ValueError('Timestamp too old')
    
    # Generate expected signature
    payload_string = json.dumps(payload, separators=(',', ':'))
    signed_payload = f"{timestamp}.{payload_string}"
    
    expected_signature = base64.b64encode(
        hmac.new(
            api_key.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).digest()
    ).decode('utf-8')
    
    # Constant-time comparison
    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature_header = request.headers.get('X-Webhook-Signature')
    
    try:
        if not verify_signature(request.json, signature_header, API_KEY):
            return jsonify({'error': 'Invalid signature'}), 401
        
        # Process webhook
        print('Verified webhook:', request.json)
        return jsonify({'success': True})
    except Exception as e:
        print('Signature verification failed:', str(e))
        return jsonify({'error': str(e)}), 401`}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="php" className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">PHP Example</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`<?php
$apiKey = getenv('CHAINPASS_API_KEY');
$toleranceSeconds = 300; // 5 minutes

function verifySignature($payload, $signatureHeader, $apiKey, $toleranceSeconds) {
    // Parse signature header
    $parts = explode(',', $signatureHeader);
    $timestamp = (int)explode('=', $parts[0])[1];
    $signature = explode('=', $parts[1])[1];
    
    // Check timestamp (replay attack prevention)
    $currentTime = time();
    if (abs($currentTime - $timestamp) > $toleranceSeconds) {
        throw new Exception('Timestamp too old');
    }
    
    // Generate expected signature
    $payloadString = json_encode($payload, JSON_UNESCAPED_SLASHES);
    $signedPayload = "$timestamp.$payloadString";
    $expectedSignature = base64_encode(
        hash_hmac('sha256', $signedPayload, $apiKey, true)
    );
    
    // Constant-time comparison
    return hash_equals($signature, $expectedSignature);
}

// Get webhook data
$payload = json_decode(file_get_contents('php://input'), true);
$signatureHeader = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';

try {
    if (!verifySignature($payload, $signatureHeader, $apiKey, $toleranceSeconds)) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid signature']);
        exit;
    }
    
    // Process webhook
    error_log('Verified webhook: ' . json_encode($payload));
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    error_log('Signature verification failed: ' . $e->getMessage());
    http_response_code(401);
    echo json_encode(['error' => $e->getMessage()]);
}
?>`}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="ruby" className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Ruby/Sinatra Example</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`require 'sinatra'
require 'json'
require 'openssl'
require 'base64'

API_KEY = ENV['CHAINPASS_API_KEY']
TOLERANCE_SECONDS = 300 # 5 minutes

def verify_signature(payload, signature_header, api_key, tolerance)
  # Parse signature header
  parts = signature_header.split(',')
  timestamp = parts[0].split('=')[1].to_i
  signature = parts[1].split('=')[1]
  
  # Check timestamp (replay attack prevention)
  current_time = Time.now.to_i
  raise 'Timestamp too old' if (current_time - timestamp).abs > tolerance
  
  # Generate expected signature
  payload_string = JSON.generate(payload)
  signed_payload = "#{timestamp}.#{payload_string}"
  expected_signature = Base64.strict_encode64(
    OpenSSL::HMAC.digest('SHA256', api_key, signed_payload)
  )
  
  # Constant-time comparison
  Rack::Utils.secure_compare(signature, expected_signature)
end

post '/webhook' do
  request.body.rewind
  payload = JSON.parse(request.body.read)
  signature_header = request.env['HTTP_X_WEBHOOK_SIGNATURE']
  
  begin
    unless verify_signature(payload, signature_header, API_KEY, TOLERANCE_SECONDS)
      status 401
      return { error: 'Invalid signature' }.to_json
    end
    
    # Process webhook
    puts "Verified webhook: #{payload}"
    { success: true }.to_json
  rescue => e
    puts "Signature verification failed: #{e.message}"
    status 401
    { error: e.message }.to_json
  end
end`}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signature Header Format</CardTitle>
          <CardDescription>Understanding the X-Webhook-Signature header</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <code className="text-sm">
              X-Webhook-Signature: t=1699564800,v1=dGVzdHNpZ25hdHVyZQ==
            </code>
          </div>

          <div className="grid gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">t</Badge>
                <span className="text-sm font-semibold">Timestamp</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Unix timestamp (seconds) when the signature was generated. Used for replay attack prevention.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">v1</Badge>
                <span className="text-sm font-semibold">Signature</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Base64-encoded HMAC-SHA256 signature of the payload. Generated using: HMAC(API_KEY, timestamp + "." + JSON_payload)
              </p>
            </div>
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Replay Protection:</strong> Signatures older than 5 minutes are automatically rejected to prevent replay attacks.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span><strong>Always verify signatures</strong> - Never process webhooks without verification</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span><strong>Use constant-time comparison</strong> - Prevents timing attacks</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span><strong>Check timestamp</strong> - Reject old requests to prevent replay attacks</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span><strong>Keep API keys secure</strong> - Store in environment variables, never in code</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span><strong>Log failed validations</strong> - Monitor for potential security issues</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span><strong>Use HTTPS only</strong> - Ensure webhook endpoints use secure connections</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
