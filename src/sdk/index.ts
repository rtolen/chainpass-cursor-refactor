/**
 * ChainPass SDK - Main Entry Point
 * Export all public SDK interfaces and classes
 */

// Main SDK client
export { ChainPassSDK } from './chainpass-sdk';

// Webhook utilities
export {
  WebhookHandler,
  parseSignatureHeader,
  generateSignature,
  verifyWebhookSignature,
  createSignatureHeader,
} from './webhook';

// Types
export type {
  ChainPassConfig,
  ApiError,
  VerificationRecord,
  CreateVerificationRequest,
  UpdateVerificationRequest,
  VAIAssignment,
  CreateVAIRequest,
  UpdateVAIRequest,
  Payment,
  CreatePaymentRequest,
  LegalAgreement,
  CreateLegalAgreementRequest,
  UpdateLegalAgreementRequest,
  WebhookEvent,
  WebhookEventType,
  VerificationCompletedData,
  VerificationStartedData,
  VerificationFailedData,
  VAIAssignedData,
  VAIStatusChangedData,
  WebhookSignature,
  WebhookVerificationResult,
  SendToVairifyRequest,
  SendToVairifyResponse,
  QueryParams,
  PaginationParams,
  SDKResponse,
  SDKListResponse,
} from './types';

// Errors
export {
  ChainPassError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
  WebhookSignatureError,
  createErrorFromResponse,
} from './errors';
