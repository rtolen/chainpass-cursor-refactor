/**
 * ChainPass SDK TypeScript Types
 * Complete type definitions for all API requests and responses
 */

// ============= Base Types =============

export interface ChainPassConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: unknown;
}

// ============= Verification Records =============

export interface VerificationRecord {
  id: string;
  session_id: string;
  verification_status: 'pending' | 'processing' | 'completed' | 'failed';
  biometric_confirmed: boolean;
  id_document_url?: string;
  selfie_url?: string;
  complycube_verification_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVerificationRequest {
  session_id: string;
  verification_status?: 'pending' | 'processing';
  biometric_confirmed?: boolean;
}

export interface UpdateVerificationRequest {
  verification_status?: 'pending' | 'processing' | 'completed' | 'failed';
  biometric_confirmed?: boolean;
  id_document_url?: string;
  selfie_url?: string;
  complycube_verification_id?: string;
}

// ============= V.A.I. Assignments =============

export interface VAIAssignment {
  id: string;
  verification_record_id: string;
  vai_code: string;
  status: 'active' | 'processing' | 'suspended' | 'revoked';
  created_at: string;
}

export interface CreateVAIRequest {
  verification_record_id: string;
  vai_code: string;
  status?: 'active' | 'processing';
}

export interface UpdateVAIRequest {
  status?: 'active' | 'processing' | 'suspended' | 'revoked';
}

// ============= Payments =============

export interface Payment {
  id: string;
  verification_record_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  stripe_payment_intent_id?: string;
  created_at: string;
}

export interface CreatePaymentRequest {
  verification_record_id: string;
  amount: number;
  status?: 'pending' | 'processing' | 'succeeded';
  stripe_payment_intent_id?: string;
}

// ============= Legal Agreements =============

export interface LegalAgreement {
  id: string;
  vai_assignment_id: string;
  leo_declaration_signed: boolean;
  signature_agreement_signed: boolean;
  signature_data?: string;
  created_at: string;
}

export interface CreateLegalAgreementRequest {
  vai_assignment_id: string;
  leo_declaration_signed?: boolean;
  signature_agreement_signed?: boolean;
  signature_data?: string;
}

export interface UpdateLegalAgreementRequest {
  leo_declaration_signed?: boolean;
  signature_agreement_signed?: boolean;
  signature_data?: string;
}

// ============= Webhook Events =============

export interface WebhookEvent<T = unknown> {
  event_type: WebhookEventType;
  event_id: string;
  timestamp: string;
  data: T;
}

export type WebhookEventType =
  | 'verification.started'
  | 'verification.completed'
  | 'verification.failed'
  | 'vai.assigned'
  | 'vai.suspended'
  | 'vai.revoked';

export interface VerificationCompletedData {
  session_id: string;
  verification_record_id: string;
  vai_code: string;
  user_id: string;
  status: 'completed';
  verification_method: 'biometric' | 'document';
  completed_at: string;
}

export interface VerificationStartedData {
  session_id: string;
  verification_record_id: string;
  user_id: string;
  started_at: string;
}

export interface VerificationFailedData {
  session_id: string;
  verification_record_id: string;
  user_id: string;
  reason: string;
  failed_at: string;
}

export interface VAIAssignedData {
  vai_code: string;
  verification_record_id: string;
  user_id: string;
  assigned_at: string;
}

export interface VAIStatusChangedData {
  vai_code: string;
  old_status: string;
  new_status: string;
  reason?: string;
  changed_at: string;
}

// ============= Webhook Signature =============

export interface WebhookSignature {
  timestamp: number;
  signature: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}

// ============= Send to Vairify =============

export interface SendToVairifyRequest {
  vai_code: string;
  verification_record_id: string;
}

export interface SendToVairifyResponse {
  success: boolean;
  message: string;
  vai_code: string;
}

// ============= Query Parameters =============

export interface QueryParams {
  [key: string]: string | number | boolean | undefined;
}

export interface PaginationParams extends QueryParams {
  limit?: number;
  offset?: number;
  order?: string;
}

// ============= SDK Response Types =============

export interface SDKResponse<T> {
  data: T;
  status: number;
}

export interface SDKListResponse<T> extends SDKResponse<T[]> {
  count?: number;
}
