/**
 * ChainPass SDK - Main Client Library
 * Complete SDK for integrating with ChainPass V.A.I. API
 */

import {
  ChainPassConfig,
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
  SendToVairifyRequest,
  SendToVairifyResponse,
  QueryParams,
  SDKResponse,
  SDKListResponse,
} from './types';
import { ChainPassError, createErrorFromResponse, NetworkError } from './errors';

/**
 * Main ChainPass SDK Client
 */
export class ChainPassSDK {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: ChainPassConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://pbxpkfotysozdmdophhg.supabase.co';
    this.timeout = config.timeout || 30000; // 30 seconds default

    if (!this.apiKey) {
      throw new Error('API key is required');
    }
  }

  // ============= Private Helper Methods =============

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  private buildUrl(endpoint: string, params?: QueryParams): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    params?: QueryParams
  ): Promise<SDKResponse<T>> {
    const url = this.buildUrl(endpoint, params);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      // Handle errors
      if (!response.ok) {
        const errorMessage = typeof data === 'object' && data !== null && 'message' in data
          ? (data as { message: string }).message
          : `Request failed with status ${response.status}`;
        
        throw createErrorFromResponse(response.status, errorMessage, data);
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ChainPassError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new NetworkError('Request timeout', { timeout: this.timeout });
        }
        throw new NetworkError(error.message, error);
      }
      
      throw new NetworkError('Unknown error occurred', error);
    }
  }

  // ============= Verification Records =============

  /**
   * Create a new verification record
   */
  async createVerification(
    data: CreateVerificationRequest
  ): Promise<SDKResponse<VerificationRecord>> {
    return this.request<VerificationRecord>(
      'POST',
      '/rest/v1/verification_records',
      data
    );
  }

  /**
   * Get verification record by session ID
   */
  async getVerification(sessionId: string): Promise<SDKResponse<VerificationRecord>> {
    const response = await this.request<VerificationRecord[]>(
      'GET',
      '/rest/v1/verification_records',
      undefined,
      { session_id: `eq.${sessionId}` }
    );

    if (!response.data || response.data.length === 0) {
      throw createErrorFromResponse(404, 'Verification record not found');
    }

    return {
      data: response.data[0],
      status: response.status,
    };
  }

  /**
   * Update verification record
   */
  async updateVerification(
    id: string,
    data: UpdateVerificationRequest
  ): Promise<SDKResponse<VerificationRecord>> {
    const response = await this.request<VerificationRecord[]>(
      'PATCH',
      '/rest/v1/verification_records',
      data,
      { id: `eq.${id}` }
    );

    if (!response.data || response.data.length === 0) {
      throw createErrorFromResponse(404, 'Verification record not found');
    }

    return {
      data: response.data[0],
      status: response.status,
    };
  }

  /**
   * List all verification records
   */
  async listVerifications(params?: QueryParams): Promise<SDKListResponse<VerificationRecord>> {
    return this.request<VerificationRecord[]>(
      'GET',
      '/rest/v1/verification_records',
      undefined,
      params
    );
  }

  // ============= V.A.I. Assignments =============

  /**
   * Create V.A.I. assignment
   */
  async createVAI(data: CreateVAIRequest): Promise<SDKResponse<VAIAssignment>> {
    return this.request<VAIAssignment>(
      'POST',
      '/rest/v1/vai_assignments',
      data
    );
  }

  /**
   * Get V.A.I. assignment by code
   */
  async getVAI(vaiCode: string): Promise<SDKResponse<VAIAssignment>> {
    const response = await this.request<VAIAssignment[]>(
      'GET',
      '/rest/v1/vai_assignments',
      undefined,
      { vai_code: `eq.${vaiCode}` }
    );

    if (!response.data || response.data.length === 0) {
      throw createErrorFromResponse(404, 'V.A.I. assignment not found');
    }

    return {
      data: response.data[0],
      status: response.status,
    };
  }

  /**
   * Update V.A.I. assignment
   */
  async updateVAI(
    id: string,
    data: UpdateVAIRequest
  ): Promise<SDKResponse<VAIAssignment>> {
    const response = await this.request<VAIAssignment[]>(
      'PATCH',
      '/rest/v1/vai_assignments',
      data,
      { id: `eq.${id}` }
    );

    if (!response.data || response.data.length === 0) {
      throw createErrorFromResponse(404, 'V.A.I. assignment not found');
    }

    return {
      data: response.data[0],
      status: response.status,
    };
  }

  /**
   * Send V.A.I. to Vairify platform
   */
  async sendToVairify(
    data: SendToVairifyRequest
  ): Promise<SDKResponse<SendToVairifyResponse>> {
    return this.request<SendToVairifyResponse>(
      'POST',
      '/functions/v1/send-to-vairify',
      data
    );
  }

  // ============= Payments =============

  /**
   * Create payment record
   */
  async createPayment(data: CreatePaymentRequest): Promise<SDKResponse<Payment>> {
    return this.request<Payment>(
      'POST',
      '/rest/v1/payments',
      data
    );
  }

  /**
   * Get payment by verification record ID
   */
  async getPayment(verificationRecordId: string): Promise<SDKResponse<Payment>> {
    const response = await this.request<Payment[]>(
      'GET',
      '/rest/v1/payments',
      undefined,
      { verification_record_id: `eq.${verificationRecordId}` }
    );

    if (!response.data || response.data.length === 0) {
      throw createErrorFromResponse(404, 'Payment not found');
    }

    return {
      data: response.data[0],
      status: response.status,
    };
  }

  /**
   * List all payments
   */
  async listPayments(params?: QueryParams): Promise<SDKListResponse<Payment>> {
    return this.request<Payment[]>(
      'GET',
      '/rest/v1/payments',
      undefined,
      params
    );
  }

  // ============= Legal Agreements =============

  /**
   * Create legal agreement
   */
  async createLegalAgreement(
    data: CreateLegalAgreementRequest
  ): Promise<SDKResponse<LegalAgreement>> {
    return this.request<LegalAgreement>(
      'POST',
      '/rest/v1/legal_agreements',
      data
    );
  }

  /**
   * Get legal agreement by V.A.I. assignment ID
   */
  async getLegalAgreement(vaiAssignmentId: string): Promise<SDKResponse<LegalAgreement>> {
    const response = await this.request<LegalAgreement[]>(
      'GET',
      '/rest/v1/legal_agreements',
      undefined,
      { vai_assignment_id: `eq.${vaiAssignmentId}` }
    );

    if (!response.data || response.data.length === 0) {
      throw createErrorFromResponse(404, 'Legal agreement not found');
    }

    return {
      data: response.data[0],
      status: response.status,
    };
  }

  /**
   * Update legal agreement
   */
  async updateLegalAgreement(
    id: string,
    data: UpdateLegalAgreementRequest
  ): Promise<SDKResponse<LegalAgreement>> {
    const response = await this.request<LegalAgreement[]>(
      'PATCH',
      '/rest/v1/legal_agreements',
      data,
      { id: `eq.${id}` }
    );

    if (!response.data || response.data.length === 0) {
      throw createErrorFromResponse(404, 'Legal agreement not found');
    }

    return {
      data: response.data[0],
      status: response.status,
    };
  }
}
