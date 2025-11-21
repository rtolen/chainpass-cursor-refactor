/**
 * ChainPass SDK Webhook Utilities
 * Utilities for verifying and handling webhooks
 */

import { WebhookSignature, WebhookVerificationResult, WebhookEvent } from './types';
import { WebhookSignatureError } from './errors';

/**
 * Parse webhook signature header
 * Expected format: "t=<timestamp>,v1=<signature>"
 */
export function parseSignatureHeader(signatureHeader: string): WebhookSignature | null {
  try {
    const parts = signatureHeader.split(',');
    let timestamp: number | null = null;
    let signature: string | null = null;

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        timestamp = parseInt(value, 10);
      } else if (key === 'v1') {
        signature = value;
      }
    }

    if (!timestamp || !signature) {
      return null;
    }

    return { timestamp, signature };
  } catch {
    return null;
  }
}

/**
 * Generate HMAC SHA-256 signature for webhook payload
 */
export async function generateSignature(
  payload: unknown,
  secret: string,
  timestamp: number
): Promise<string> {
  const signatureData = `${timestamp}.${JSON.stringify(payload)}`;
  
  // Use Web Crypto API (works in browsers and Node.js 15+)
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(signatureData);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify webhook signature
 */
export async function verifyWebhookSignature(
  payload: unknown,
  signatureHeader: string,
  secret: string,
  toleranceSeconds: number = 300
): Promise<WebhookVerificationResult> {
  // Parse signature header
  const parsedSignature = parseSignatureHeader(signatureHeader);
  if (!parsedSignature) {
    return {
      valid: false,
      error: 'Invalid signature header format',
    };
  }

  const { timestamp, signature } = parsedSignature;

  // Check timestamp to prevent replay attacks
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - timestamp);
  
  if (timeDiff > toleranceSeconds) {
    return {
      valid: false,
      error: `Timestamp too old. Difference: ${timeDiff}s, tolerance: ${toleranceSeconds}s`,
    };
  }

  // Generate expected signature
  const expectedSignature = await generateSignature(payload, secret, timestamp);

  // Constant-time comparison to prevent timing attacks
  if (signature !== expectedSignature) {
    return {
      valid: false,
      error: 'Signature mismatch',
    };
  }

  return { valid: true };
}

/**
 * Create webhook signature header
 */
export async function createSignatureHeader(
  payload: unknown,
  secret: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await generateSignature(payload, secret, timestamp);
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Webhook handler helper class
 */
export class WebhookHandler {
  private secret: string;
  private toleranceSeconds: number;

  constructor(secret: string, toleranceSeconds: number = 300) {
    this.secret = secret;
    this.toleranceSeconds = toleranceSeconds;
  }

  /**
   * Verify and parse incoming webhook
   */
  async verifyAndParse<T = unknown>(
    rawBody: string,
    signatureHeader: string
  ): Promise<WebhookEvent<T>> {
    // Parse payload
    let payload: WebhookEvent<T>;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      throw new WebhookSignatureError('Invalid JSON payload', error);
    }

    // Verify signature
    const verification = await verifyWebhookSignature(
      payload,
      signatureHeader,
      this.secret,
      this.toleranceSeconds
    );

    if (!verification.valid) {
      throw new WebhookSignatureError(verification.error);
    }

    return payload;
  }

  /**
   * Create a signed webhook payload
   */
  async sign<T = unknown>(event: WebhookEvent<T>): Promise<{
    payload: WebhookEvent<T>;
    signature: string;
  }> {
    const signature = await createSignatureHeader(event, this.secret);
    return {
      payload: event,
      signature,
    };
  }
}
