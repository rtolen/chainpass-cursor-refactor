/**
 * Business Registry Configuration
 * Maintains callback endpoints and configuration for business clients
 */

export type VerificationStep = 
  | 'payment' 
  | 'id-upload' 
  | 'complycube-facial'
  | 'facial' 
  | 'leo-declaration' 
  | 'signature'
  | 'contract-signature';

export interface BusinessConfig {
  name: string;
  description: string;
  callback_url: string;
  api_key: string;
  return_url: string;
  requiredSteps: VerificationStep[];
  environments?: {
    dev?: {
      callback_url: string;
      return_url: string;
    };
    prod?: {
      callback_url: string;
      return_url: string;
    };
  };
}

export interface BusinessRegistry {
  [businessId: string]: BusinessConfig;
}

/**
 * SECURITY NOTE: Business registry data has been moved to Supabase database
 * to prevent API keys from being exposed in the client bundle.
 * 
 * Use the following instead:
 * - BusinessSelection: Fetch from business_configurations table
 * - BusinessVerificationStart: Use get-business-config edge function
 * - Types are kept here for compatibility with existing code
 */

// DEPRECATED: Use database instead
// export const BUSINESS_REGISTRY: BusinessRegistry = { ... };

// DEPRECATED: Use database query instead
// export function getBusinessConfig(businessId: string): BusinessConfig | null {
//   return BUSINESS_REGISTRY[businessId] || null;
// }

// DEPRECATED: Use database query instead
// export function validateBusinessId(businessId: string): boolean {
//   return businessId in BUSINESS_REGISTRY;
// }
