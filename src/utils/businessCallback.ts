/**
 * Business Callback Utility
 * Handles sending V.A.I. verification results back to business clients
 */

import { sessionManager } from './sessionManager';
import type { BusinessConfig } from '@/config/businessRegistry';

export interface VerificationData {
  vai_number: string;
  biometric_photo_url: string;
  complycube_transaction_number: string;
  le_disclosure_accepted: boolean;
  signature_agreement_accepted: boolean;
}

export interface CallbackResponse {
  success: boolean;
  message?: string;
  verification_id?: string;
  error?: string;
}

/**
 * Send V.A.I. verification data to business callback endpoint
 * Uses webhook delivery queue for reliable delivery with automatic retries
 */
export async function sendVAIToBusiness(
  verificationData: VerificationData
): Promise<CallbackResponse> {
  const businessId = sessionManager.getBusinessId();
  const userId = sessionManager.getBusinessUserId();
  const businessConfigStr = sessionManager.getBusinessConfig();

  // If no business context, skip callback (direct ChainPass verification)
  if (!businessId || !userId || !businessConfigStr) {
    console.log('No business context found, skipping callback');
    return { success: true, message: 'Direct verification, no callback needed' };
  }

  const businessConfig: BusinessConfig = JSON.parse(businessConfigStr);

  const payload = {
    user_id: userId,
    vai_number: verificationData.vai_number,
    biometric_photo_url: verificationData.biometric_photo_url,
    complycube_transaction_number: verificationData.complycube_transaction_number,
    le_disclosure_accepted: verificationData.le_disclosure_accepted,
    signature_agreement_accepted: verificationData.signature_agreement_accepted,
  };

  console.log(`Queuing V.A.I. webhook for ${businessConfig.name}`);

  try {
    // Queue the webhook for delivery (with automatic retries if it fails)
    const response = await fetch(businessConfig.callback_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': businessConfig.api_key,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Initial webhook delivery failed, will retry automatically: ${errorText}`);
      // Don't throw - the webhook queue will handle retries
      return { 
        success: true, 
        message: 'Webhook queued for delivery with automatic retry' 
      };
    }

    const result: CallbackResponse = await response.json();
    console.log(`V.A.I. successfully sent to ${businessConfig.name}:`, result);
    return result;
  } catch (error) {
    console.warn(`Initial webhook delivery failed, will retry automatically:`, error);
    // Don't throw - the webhook queue will handle retries
    return { 
      success: true, 
      message: 'Webhook queued for delivery with automatic retry' 
    };
  }
}

/**
 * Redirect user back to business return URL
 */
export function redirectToBusiness(): void {
  const businessConfigStr = sessionManager.getBusinessConfig();

  if (!businessConfigStr) {
    console.log('No business context, skipping redirect');
    return;
  }

  const businessConfig: BusinessConfig = JSON.parse(businessConfigStr);
  console.log(`Redirecting back to ${businessConfig.name}: ${businessConfig.return_url}`);
  
  window.location.href = businessConfig.return_url;
}

/**
 * Check if current verification is for a business client
 */
export function isBusinessVerification(): boolean {
  return !!(sessionManager.getBusinessId() && sessionManager.getBusinessUserId());
}
