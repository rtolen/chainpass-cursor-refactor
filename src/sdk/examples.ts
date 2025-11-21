/**
 * ChainPass SDK Usage Examples
 * Comprehensive examples showing how to use the SDK
 */

import { ChainPassSDK, WebhookHandler, type WebhookEvent, type VerificationCompletedData } from './index';

// ============= Basic SDK Usage =============

async function basicExample() {
  // Initialize SDK
  const chainpass = new ChainPassSDK({
    apiKey: process.env.CHAINPASS_API_KEY!,
  });

  try {
    // Create a verification record
    const verification = await chainpass.createVerification({
      session_id: 'sess_' + Date.now(),
      verification_status: 'pending',
    });

    console.log('✅ Verification created:', verification.data.id);

    // Get verification by session ID
    const retrieved = await chainpass.getVerification(verification.data.session_id);
    console.log('✅ Verification retrieved:', retrieved.data);

    // Update verification
    const updated = await chainpass.updateVerification(verification.data.id, {
      verification_status: 'completed',
      biometric_confirmed: true,
    });

    console.log('✅ Verification updated:', updated.data.verification_status);

    return verification.data;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// ============= Complete Verification Flow =============

async function completeVerificationFlow() {
  const chainpass = new ChainPassSDK({
    apiKey: process.env.CHAINPASS_API_KEY!,
  });

  // Step 1: Create verification record
  const verification = await chainpass.createVerification({
    session_id: `sess_${Date.now()}`,
    verification_status: 'pending',
  });
  console.log('1️⃣ Created verification:', verification.data.id);

  // Step 2: Update with ComplyCube ID
  await chainpass.updateVerification(verification.data.id, {
    verification_status: 'processing',
    complycube_verification_id: 'cc_verify_123',
  });
  console.log('2️⃣ Started processing');

  // Step 3: Complete verification
  await chainpass.updateVerification(verification.data.id, {
    verification_status: 'completed',
    biometric_confirmed: true,
  });
  console.log('3️⃣ Verification completed');

  // Step 4: Create V.A.I. assignment
  const vai = await chainpass.createVAI({
    verification_record_id: verification.data.id,
    vai_code: `VAI-${Math.random().toString(36).substring(7).toUpperCase()}`,
    status: 'active',
  });
  console.log('4️⃣ V.A.I. assigned:', vai.data.vai_code);

  // Step 5: Record payment
  const payment = await chainpass.createPayment({
    verification_record_id: verification.data.id,
    amount: 2999,
    status: 'succeeded',
  });
  console.log('5️⃣ Payment recorded:', payment.data.id);

  // Step 6: Create legal agreements
  const legal = await chainpass.createLegalAgreement({
    vai_assignment_id: vai.data.id,
    leo_declaration_signed: true,
    signature_agreement_signed: true,
  });
  console.log('6️⃣ Legal agreements signed:', legal.data.id);

  // Step 7: Send to Vairify
  const result = await chainpass.sendToVairify({
    vai_code: vai.data.vai_code,
    verification_record_id: verification.data.id,
  });
  console.log('7️⃣ Sent to Vairify:', result.data.message);

  return {
    verification: verification.data,
    vai: vai.data,
    payment: payment.data,
    legal: legal.data,
  };
}

// ============= Webhook Handler Example =============

async function webhookExample() {
  // Initialize webhook handler
  const webhookHandler = new WebhookHandler(
    process.env.CHAINPASS_WEBHOOK_SECRET!,
    300 // 5 minute tolerance
  );

  // Simulate receiving a webhook (in production, this comes from HTTP request)
  const rawBody = JSON.stringify({
    event_type: 'verification.completed',
    event_id: 'evt_123',
    timestamp: new Date().toISOString(),
    data: {
      session_id: 'sess_123',
      verification_record_id: 'ver_123',
      vai_code: 'VAI-ABC-123',
      user_id: 'user_123',
      status: 'completed',
      verification_method: 'biometric',
      completed_at: new Date().toISOString(),
    } as VerificationCompletedData,
  });

  // Sign the webhook (normally done by ChainPass)
  const { signature } = await webhookHandler.sign(JSON.parse(rawBody));

  // Verify and process webhook
  try {
    const event = await webhookHandler.verifyAndParse<VerificationCompletedData>(
      rawBody,
      signature
    );

    console.log('✅ Webhook verified!');
    console.log('Event type:', event.event_type);
    console.log('V.A.I. code:', event.data.vai_code);
    console.log('Status:', event.data.status);

    return event;
  } catch (error) {
    console.error('❌ Webhook verification failed:', error);
    throw error;
  }
}

// ============= Error Handling Example =============

async function errorHandlingExample() {
  const chainpass = new ChainPassSDK({
    apiKey: process.env.CHAINPASS_API_KEY!,
  });

  // Example 1: Handling not found errors
  try {
    await chainpass.getVerification('nonexistent-session');
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log('✅ Handled not found error');
    }
  }

  // Example 2: Handling validation errors
  try {
    await chainpass.createVerification({
      session_id: '', // Invalid: empty string
    });
  } catch (error: any) {
    if (error.statusCode === 400) {
      console.log('✅ Handled validation error');
    }
  }

  // Example 3: Network timeout
  const slowChainpass = new ChainPassSDK({
    apiKey: process.env.CHAINPASS_API_KEY!,
    timeout: 1, // 1ms timeout (will fail)
  });

  try {
    await slowChainpass.listVerifications();
  } catch (error: any) {
    if (error.name === 'NetworkError') {
      console.log('✅ Handled network timeout');
    }
  }
}

// ============= Express.js Webhook Endpoint Example =============

function expressWebhookExample() {
  const express = require('express');
  const app = express();

  // Important: Use raw body parser for webhooks
  app.use(express.raw({ type: 'application/json' }));

  const webhookHandler = new WebhookHandler(
    process.env.CHAINPASS_WEBHOOK_SECRET!
  );

  app.post('/webhooks/chainpass', async (req: any, res: any) => {
    const signature = req.headers['x-chainpass-signature'];
    const rawBody = req.body.toString('utf-8');

    try {
      const event = await webhookHandler.verifyAndParse(rawBody, signature);

      // Handle different event types
      switch (event.event_type) {
        case 'verification.completed':
          console.log('✅ Verification completed:', event.data);
          // Update your database, send notifications, etc.
          break;

        case 'verification.failed':
          console.log('❌ Verification failed:', event.data);
          // Handle failed verification
          break;

        case 'vai.assigned':
          console.log('🎉 V.A.I. assigned:', event.data);
          // Grant user access, update records, etc.
          break;

        case 'vai.suspended':
          console.log('⚠️ V.A.I. suspended:', event.data);
          // Revoke access, notify user, etc.
          break;

        default:
          console.log('Unknown event type:', event.event_type);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Invalid webhook' });
    }
  });

  app.listen(3000, () => {
    console.log('Webhook server running on port 3000');
  });
}

// ============= Batch Operations Example =============

async function batchOperationsExample() {
  const chainpass = new ChainPassSDK({
    apiKey: process.env.CHAINPASS_API_KEY!,
  });

  // Create multiple verifications in parallel
  const sessions = ['sess_1', 'sess_2', 'sess_3'];
  
  const verifications = await Promise.all(
    sessions.map(session_id =>
      chainpass.createVerification({
        session_id,
        verification_status: 'pending',
      })
    )
  );

  console.log('✅ Created', verifications.length, 'verifications');

  // Retrieve multiple records
  const records = await Promise.all(
    sessions.map(session_id => chainpass.getVerification(session_id))
  );

  console.log('✅ Retrieved', records.length, 'records');

  return verifications;
}

// ============= Pagination Example =============

async function paginationExample() {
  const chainpass = new ChainPassSDK({
    apiKey: process.env.CHAINPASS_API_KEY!,
  });

  const pageSize = 10;
  let page = 0;
  let allVerifications = [];

  while (true) {
    const response = await chainpass.listVerifications({
      limit: pageSize,
      offset: page * pageSize,
      order: 'created_at.desc',
    });

    allVerifications.push(...response.data);

    if (response.data.length < pageSize) {
      break; // No more pages
    }

    page++;
  }

  console.log('✅ Retrieved', allVerifications.length, 'total verifications');

  return allVerifications;
}

// Export examples
export {
  basicExample,
  completeVerificationFlow,
  webhookExample,
  errorHandlingExample,
  expressWebhookExample,
  batchOperationsExample,
  paginationExample,
};
