# Vairify Webhook Integration Guide

## Overview
This document describes how Vairify should send webhook notifications to ChainPass when user status changes occur after V.A.I. verification.

## Webhook Endpoint
```
POST https://pbxpkfotysozdmdophhg.supabase.co/functions/v1/receive-vairify-webhook
```

## Authentication
Webhooks must include a signature header for security verification:

**Header:**
```
X-Vairify-Signature: <sha256_hash>
```

**Signature Calculation:**
```javascript
const crypto = require('crypto');
const payload = JSON.stringify(webhookData);
const secret = 'VAIRIFY_WEBHOOK_SECRET'; // Shared secret
const signature = crypto
  .createHash('sha256')
  .update(payload + secret)
  .digest('hex');
```

## Supported Event Types

### 1. User Status Changed
Triggered when a user's account status changes in Vairify.

**Event Type:** `user.status_changed`

**Payload:**
```json
{
  "event_type": "user.status_changed",
  "user_id": "uuid-from-vairify",
  "vai_number": "LEO-12345",
  "timestamp": "2025-11-15T04:30:00Z",
  "data": {
    "status": "suspended",
    "reason": "Terms of service violation"
  }
}
```

### 2. Account Updated
Triggered when user account information is updated.

**Event Type:** `user.account_updated`

**Payload:**
```json
{
  "event_type": "user.account_updated",
  "user_id": "uuid-from-vairify",
  "vai_number": "CIV-67890",
  "timestamp": "2025-11-15T04:30:00Z",
  "data": {
    "updated_fields": ["email", "phone"],
    "reason": "User profile update"
  }
}
```

### 3. V.A.I. Revoked
Triggered when a V.A.I. number is revoked.

**Event Type:** `user.vai_revoked`

**Payload:**
```json
{
  "event_type": "user.vai_revoked",
  "user_id": "uuid-from-vairify",
  "vai_number": "LEO-12345",
  "timestamp": "2025-11-15T04:30:00Z",
  "data": {
    "reason": "User requested deletion",
    "revoked_by": "user"
  }
}
```

### 4. V.A.I. Suspended
Triggered when a V.A.I. number is temporarily suspended.

**Event Type:** `user.vai_suspended`

**Payload:**
```json
{
  "event_type": "user.vai_suspended",
  "user_id": "uuid-from-vairify",
  "vai_number": "CIV-67890",
  "timestamp": "2025-11-15T04:30:00Z",
  "data": {
    "reason": "Pending investigation",
    "suspension_duration": "7 days",
    "suspended_until": "2025-11-22T04:30:00Z"
  }
}
```

## Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_type` | string | Yes | One of the supported event types |
| `user_id` | string (UUID) | Yes | The Vairify user ID |
| `vai_number` | string | Yes | The V.A.I. number (format: LEO-XXXXX or CIV-XXXXX) |
| `timestamp` | string (ISO 8601) | Yes | When the event occurred |
| `data` | object | Yes | Event-specific data |

## Response Codes

### Success (200)
```json
{
  "success": true,
  "message": "Webhook received and processed",
  "event_id": "uuid-of-stored-event"
}
```

### Invalid Signature (401)
```json
{
  "error": "Invalid signature"
}
```

### Server Error (500)
```json
{
  "error": "Internal server error",
  "details": "Error description"
}
```

## Implementation Example (Node.js)

```javascript
const crypto = require('crypto');
const axios = require('axios');

async function sendWebhookToChainPass(webhookData) {
  const payload = JSON.stringify(webhookData);
  const secret = process.env.VAIRIFY_WEBHOOK_SECRET;
  
  // Calculate signature
  const signature = crypto
    .createHash('sha256')
    .update(payload + secret)
    .digest('hex');
  
  try {
    const response = await axios.post(
      'https://pbxpkfotysozdmdophhg.supabase.co/functions/v1/receive-vairify-webhook',
      webhookData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Vairify-Signature': signature
        }
      }
    );
    
    console.log('Webhook sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Webhook failed:', error.response?.data || error.message);
    throw error;
  }
}

// Example usage
sendWebhookToChainPass({
  event_type: 'user.status_changed',
  user_id: '123e4567-e89b-12d3-a456-426614174000',
  vai_number: 'LEO-12345',
  timestamp: new Date().toISOString(),
  data: {
    status: 'active',
    reason: 'Account reinstated'
  }
});
```

## Retry Policy
- ChainPass will respond within 30 seconds
- If you don't receive a 200 response, implement exponential backoff
- Recommended retry schedule: 1m, 5m, 15m, 1h, 6h

## Security Notes
1. **Always include the signature** - Unsigned webhooks may be rejected in production
2. **Use HTTPS only** - Never send webhooks over HTTP
3. **Store the shared secret securely** - Use environment variables
4. **Validate responses** - Check for 200 status before considering webhook delivered
5. **Log all webhook attempts** - For debugging and audit purposes

## Testing
During development, you can test without a signature by omitting the `X-Vairify-Signature` header, but this will log a warning. Production requires proper signature validation.

**Test endpoint:**
```bash
curl -X POST https://pbxpkfotysozdmdophhg.supabase.co/functions/v1/receive-vairify-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "user.status_changed",
    "user_id": "test-user-123",
    "vai_number": "LEO-99999",
    "timestamp": "2025-11-15T04:30:00Z",
    "data": {
      "status": "active",
      "reason": "Test webhook"
    }
  }'
```

## Support
For questions or issues with webhook integration, contact your ChainPass integration team.
