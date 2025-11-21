/**
 * Webhook Security Utilities
 * Provides HMAC-SHA256 signature generation and validation for webhook security
 */

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * @param payload - The webhook payload object
 * @param secret - The API key/secret for signing
 * @param timestamp - Unix timestamp in seconds
 * @returns Base64-encoded signature
 */
export async function generateWebhookSignature(
  payload: any,
  secret: string,
  timestamp: number
): Promise<string> {
  const payloadString = JSON.stringify(payload);
  const signaturePayload = `${timestamp}.${payloadString}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(signaturePayload);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  
  // Convert to base64
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureBase64 = btoa(String.fromCharCode.apply(null, signatureArray));
  
  return signatureBase64;
}

/**
 * Validate webhook signature
 * @param payload - The webhook payload object
 * @param signature - The signature to validate
 * @param secret - The API key/secret for validation
 * @param timestamp - Unix timestamp from the request
 * @param toleranceSeconds - Maximum age of the request in seconds (default: 300 = 5 minutes)
 * @returns Object with validation result and error message if invalid
 */
export async function validateWebhookSignature(
  payload: any,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSeconds: number = 300
): Promise<{ valid: boolean; error?: string }> {
  // Check timestamp to prevent replay attacks
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const timestampDiff = Math.abs(currentTimestamp - timestamp);
  
  if (timestampDiff > toleranceSeconds) {
    return {
      valid: false,
      error: `Timestamp too old. Request age: ${timestampDiff}s, tolerance: ${toleranceSeconds}s`,
    };
  }
  
  // Generate expected signature
  const expectedSignature = await generateWebhookSignature(payload, secret, timestamp);
  
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return {
      valid: false,
      error: "Signature length mismatch",
    };
  }
  
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  if (mismatch !== 0) {
    return {
      valid: false,
      error: "Signature mismatch",
    };
  }
  
  return { valid: true };
}

/**
 * Extract signature components from request headers
 * Expected header format: "t=<timestamp>,v1=<signature>"
 * @param signatureHeader - The X-Webhook-Signature header value
 * @returns Object with timestamp and signature, or null if invalid format
 */
export function parseSignatureHeader(signatureHeader: string): {
  timestamp: number;
  signature: string;
} | null {
  try {
    const parts = signatureHeader.split(",");
    let timestamp: number | null = null;
    let signature: string | null = null;
    
    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key === "t") {
        timestamp = parseInt(value, 10);
      } else if (key === "v1") {
        signature = value;
      }
    }
    
    if (timestamp === null || signature === null) {
      return null;
    }
    
    return { timestamp, signature };
  } catch {
    return null;
  }
}

/**
 * Create signature header value
 * @param timestamp - Unix timestamp in seconds
 * @param signature - Base64-encoded signature
 * @returns Formatted signature header value
 */
export function createSignatureHeader(timestamp: number, signature: string): string {
  return `t=${timestamp},v1=${signature}`;
}
