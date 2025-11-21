# ChainPass SDK

Official TypeScript/JavaScript SDK for integrating with the ChainPass V.A.I. API.

## Features

- ✅ Full TypeScript support with complete type definitions
- ✅ Authentication handling with API keys
- ✅ Request signing and verification
- ✅ Webhook signature verification
- ✅ Comprehensive error handling
- ✅ Promise-based async API
- ✅ Browser and Node.js support
- ✅ Zero dependencies (uses native Web APIs)

## Installation

```bash
npm install @chainpass/sdk
# or
yarn add @chainpass/sdk
# or
pnpm add @chainpass/sdk
```

## Quick Start

```typescript
import { ChainPassSDK, WebhookHandler } from '@chainpass/sdk';

// Initialize SDK
const chainpass = new ChainPassSDK({
  apiKey: 'your-api-key-here',
  baseUrl: 'https://pbxpkfotysozdmdophhg.supabase.co', // Optional
  timeout: 30000, // Optional, default 30s
});

// Create a verification record
const verification = await chainpass.createVerification({
  session_id: 'sess_abc123',
  verification_status: 'pending',
});

console.log('Verification created:', verification.data);
```

## Usage Examples

### Verification Records

```typescript
// Create verification
const verification = await chainpass.createVerification({
  session_id: 'sess_abc123',
  verification_status: 'pending',
  biometric_confirmed: false,
});

// Get verification by session ID
const record = await chainpass.getVerification('sess_abc123');

// Update verification
const updated = await chainpass.updateVerification(verification.data.id, {
  verification_status: 'completed',
  biometric_confirmed: true,
});

// List all verifications
const verifications = await chainpass.listVerifications({
  limit: 10,
  offset: 0,
});
```

### V.A.I. Assignments

```typescript
// Create V.A.I. assignment
const vai = await chainpass.createVAI({
  verification_record_id: 'ver_abc123',
  vai_code: 'VAI-AB12-CD34-EF56',
  status: 'active',
});

// Get V.A.I. by code
const assignment = await chainpass.getVAI('VAI-AB12-CD34-EF56');

// Update V.A.I. status
const updated = await chainpass.updateVAI(vai.data.id, {
  status: 'suspended',
});

// Send to Vairify platform
const result = await chainpass.sendToVairify({
  vai_code: 'VAI-AB12-CD34-EF56',
  verification_record_id: 'ver_abc123',
});
```

### Payments

```typescript
// Create payment record
const payment = await chainpass.createPayment({
  verification_record_id: 'ver_abc123',
  amount: 2999, // Amount in cents
  status: 'succeeded',
  stripe_payment_intent_id: 'pi_123456',
});

// Get payment
const paymentRecord = await chainpass.getPayment('ver_abc123');

// List payments
const payments = await chainpass.listPayments({
  limit: 20,
});
```

### Legal Agreements

```typescript
// Create legal agreement
const agreement = await chainpass.createLegalAgreement({
  vai_assignment_id: 'vai_abc123',
  leo_declaration_signed: true,
  signature_agreement_signed: true,
  signature_data: 'data:image/png;base64,...',
});

// Get legal agreement
const record = await chainpass.getLegalAgreement('vai_abc123');

// Update agreement
const updated = await chainpass.updateLegalAgreement(agreement.data.id, {
  leo_declaration_signed: true,
});
```

## Webhook Integration

### Verifying Webhooks

```typescript
import { WebhookHandler } from '@chainpass/sdk';

// Initialize webhook handler
const webhookHandler = new WebhookHandler(
  'your-webhook-secret',
  300 // Tolerance in seconds (default: 300)
);

// In your webhook endpoint
app.post('/webhooks/chainpass', async (req, res) => {
  try {
    const signature = req.headers['x-chainpass-signature'];
    const rawBody = req.body; // Get raw body as string
    
    // Verify and parse webhook
    const event = await webhookHandler.verifyAndParse(rawBody, signature);
    
    // Handle different event types
    switch (event.event_type) {
      case 'verification.completed':
        await handleVerificationCompleted(event.data);
        break;
      case 'vai.assigned':
        await handleVAIAssigned(event.data);
        break;
      default:
        console.log('Unknown event type:', event.event_type);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});
```

### Manual Signature Verification

```typescript
import { verifyWebhookSignature } from '@chainpass/sdk';

const payload = JSON.parse(rawBody);
const signature = req.headers['x-chainpass-signature'];
const secret = 'your-webhook-secret';

const result = await verifyWebhookSignature(
  payload,
  signature,
  secret,
  300 // Tolerance in seconds
);

if (!result.valid) {
  console.error('Invalid signature:', result.error);
  res.status(401).json({ error: 'Invalid signature' });
  return;
}

// Process webhook
```

### Creating Signed Webhooks (For Testing)

```typescript
import { createSignatureHeader } from '@chainpass/sdk';

const payload = {
  event_type: 'verification.completed',
  event_id: 'evt_123',
  timestamp: new Date().toISOString(),
  data: {
    vai_code: 'VAI-AB12-CD34-EF56',
    status: 'completed',
  },
};

const signature = await createSignatureHeader(payload, 'your-secret');
console.log('Signature header:', signature);
```

## Error Handling

The SDK provides specific error classes for different scenarios:

```typescript
import {
  ChainPassError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
} from '@chainpass/sdk';

try {
  const verification = await chainpass.getVerification('invalid-id');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof NotFoundError) {
    console.error('Record not found:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.details);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded');
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides complete type definitions:

```typescript
import type {
  VerificationRecord,
  VAIAssignment,
  Payment,
  LegalAgreement,
  WebhookEvent,
  VerificationCompletedData,
} from '@chainpass/sdk';

// All response types are fully typed
const verification: VerificationRecord = await chainpass
  .getVerification('sess_123')
  .then(res => res.data);

// Webhook events are type-safe
const handleWebhook = (event: WebhookEvent<VerificationCompletedData>) => {
  console.log('VAI Code:', event.data.vai_code);
  console.log('Status:', event.data.status);
};
```

## Configuration Options

```typescript
const chainpass = new ChainPassSDK({
  // Required: Your API key from ChainPass
  apiKey: 'your-api-key',
  
  // Optional: Base URL (defaults to production)
  baseUrl: 'https://pbxpkfotysozdmdophhg.supabase.co',
  
  // Optional: Request timeout in milliseconds (default: 30000)
  timeout: 30000,
});
```

## Best Practices

### 1. Store API Keys Securely

```typescript
// ❌ Don't hardcode API keys
const chainpass = new ChainPassSDK({
  apiKey: 'cp_live_abc123...',
});

// ✅ Use environment variables
const chainpass = new ChainPassSDK({
  apiKey: process.env.CHAINPASS_API_KEY!,
});
```

### 2. Handle Errors Gracefully

```typescript
try {
  const verification = await chainpass.createVerification(data);
  return verification.data;
} catch (error) {
  if (error instanceof ValidationError) {
    // Show user-friendly validation errors
    console.error('Invalid data:', error.details);
  } else {
    // Log and handle other errors
    console.error('Unexpected error:', error);
  }
  throw error;
}
```

### 3. Use TypeScript for Type Safety

```typescript
// TypeScript will catch type errors at compile time
const createVerification = async (sessionId: string) => {
  const result = await chainpass.createVerification({
    session_id: sessionId,
    verification_status: 'pending', // Type-checked
  });
  
  return result.data; // Properly typed as VerificationRecord
};
```

### 4. Verify All Webhooks

```typescript
// Always verify webhook signatures
const webhookHandler = new WebhookHandler(process.env.WEBHOOK_SECRET!);

app.post('/webhooks', async (req, res) => {
  try {
    const event = await webhookHandler.verifyAndParse(
      req.body,
      req.headers['x-chainpass-signature']
    );
    // Process event
  } catch (error) {
    // Invalid signature or malformed payload
    return res.status(401).json({ error: 'Invalid webhook' });
  }
});
```

## License

MIT

## Support

For issues and questions, please contact ChainPass support or visit our documentation at https://chainpass.io/docs
