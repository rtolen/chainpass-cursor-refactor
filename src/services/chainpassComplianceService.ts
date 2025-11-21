/**
 * ChainPass Compliance Service
 * 
 * Service for checking V.A.I. compliance with ChainPass API
 * Used by Vairify to verify users before allowing platform access
 */

interface ComplianceCheckRequest {
  vaiNumber: string;
  platformId: string;
  userId?: string;
  checkType?: 'full' | 'quick';
}

interface ComplianceCheckResponse {
  status: 'compliant' | 'not_compliant' | 'expired' | 'suspended' | 'not_found' | 'duplicate_detected' | 'revoked';
  vaiNumber: string;
  vaiStatus?: string;
  platformId: string;
  platformCompliance?: {
    isCompliant: boolean;
    missingRequirements: string[];
    completedRequirements: string[];
    totalRequired: number;
    totalCompleted: number;
  };
  vaiDetails?: {
    createdAt: string;
    expiresAt: string;
    daysUntilExpiration: number;
  };
  actions: {
    allowAccess?: boolean;
    complianceFlowUrl?: string;
    renewalUrl?: string;
    createVAIUrl?: string;
    supportUrl?: string;
    message?: string;
    warningMessage?: string;
  };
  responseTimestamp: string;
}

interface ComplianceAction {
  action: 'allow_access' | 'redirect_compliance' | 'redirect_renewal' | 'redirect_creation' | 'show_warning' | 'block_access' | 'error';
  url?: string;
  message?: string;
  missingRequirements?: string[];
  retryable?: boolean;
  retryAfter?: number;
}

export class ChainPassComplianceService {
  private apiKey: string;
  private platformId: string;
  private baseUrl: string;

  constructor(apiKey: string, platformId: string) {
    this.apiKey = apiKey;
    this.platformId = platformId;
    this.baseUrl = import.meta.env.VITE_CHAINPASS_API_URL || 'https://pbxpkfotysozdmdophhg.supabase.co';
  }

  /**
   * Check V.A.I. compliance for this platform
   */
  async checkCompliance(
    vaiNumber: string,
    userId?: string,
    checkType: 'full' | 'quick' = 'full'
  ): Promise<ComplianceCheckResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/functions/v1/vai-compliance-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Platform-ID': this.platformId
        },
        body: JSON.stringify({
          vaiNumber,
          platformId: this.platformId,
          userId,
          checkType,
          requestTimestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          throw { code: 'RATE_LIMIT', retryAfter };
        }
        throw new Error(`API returned ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('ChainPass compliance check failed:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw { code: 'NETWORK_ERROR', message: 'Unable to connect to ChainPass' };
      }
      
      if (error.name === 'AbortError') {
        throw { code: 'TIMEOUT', message: 'Request timed out' };
      }
      
      throw error;
    }
  }

  /**
   * Handle compliance check result and determine action
   */
  handleComplianceResult(result: ComplianceCheckResponse): ComplianceAction {
    switch (result.status) {
      case 'compliant':
        return {
          action: 'allow_access',
          message: null
        };

      case 'not_compliant':
        return {
          action: 'redirect_compliance',
          url: result.actions.complianceFlowUrl!,
          message: result.actions.message || `Complete ${result.platformCompliance?.missingRequirements.length || 0} more steps (FREE)`,
          missingRequirements: result.platformCompliance?.missingRequirements || []
        };

      case 'expired':
        return {
          action: 'redirect_renewal',
          url: result.actions.renewalUrl!,
          message: result.actions.warningMessage || 'Your V.A.I. has expired. Renew to continue.'
        };

      case 'suspended':
        return {
          action: 'redirect_renewal',
          url: result.actions.renewalUrl!,
          message: result.actions.message || 'Your V.A.I. requires reactivation ($99)'
        };

      case 'duplicate_detected':
        return {
          action: 'show_warning',
          message: result.actions.message || 'Duplicate V.A.I. detected',
          url: result.actions.supportUrl
        };

      case 'not_found':
        return {
          action: 'redirect_creation',
          url: result.actions.createVAIUrl!,
          message: result.actions.message || 'V.A.I. not found. Create one to get started.'
        };

      case 'revoked':
        return {
          action: 'block_access',
          message: result.actions.message || 'This V.A.I. has been revoked. Contact support.'
        };

      default:
        return {
          action: 'error',
          message: 'Unable to verify V.A.I. Please try again.'
        };
    }
  }

  /**
   * Handle errors from compliance check
   */
  handleError(error: any): ComplianceAction {
    if (error.code === 'NETWORK_ERROR') {
      return {
        action: 'error',
        message: 'Unable to connect to verification service. Please check your connection and try again.',
        retryable: true
      };
    }

    if (error.code === 'TIMEOUT') {
      return {
        action: 'error',
        message: 'Verification is taking longer than expected. Please try again.',
        retryable: true
      };
    }

    if (error.code === 'RATE_LIMIT') {
      return {
        action: 'error',
        message: 'Too many verification attempts. Please wait a moment and try again.',
        retryable: true,
        retryAfter: error.retryAfter
      };
    }

    return {
      action: 'error',
      message: 'An unexpected error occurred. Please contact support if this persists.',
      retryable: false
    };
  }
}

// Export singleton instance
const chainpassService = new ChainPassComplianceService(
  import.meta.env.VITE_CHAINPASS_API_KEY || '',
  'vairify'
);

export default chainpassService;

