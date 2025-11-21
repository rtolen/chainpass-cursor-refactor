/**
 * Session manager utility for tracking users through the verification flow
 */

const SESSION_KEY = 'chainpass_session_id';
const VERIFICATION_RECORD_KEY = 'chainpass_verification_record_id';
const VAI_CODE_KEY = 'chainpass_vai_code';
const BUSINESS_ID_KEY = 'chainpass_business_id';
const BUSINESS_USER_ID_KEY = 'chainpass_business_user_id';
const BUSINESS_CONFIG_KEY = 'chainpass_business_config';

export const sessionManager = {
  /**
   * Get or create a session ID
   */
  getSessionId(): string {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  },

  /**
   * Clear the session
   */
  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(VERIFICATION_RECORD_KEY);
    localStorage.removeItem(VAI_CODE_KEY);
    localStorage.removeItem(BUSINESS_ID_KEY);
    localStorage.removeItem(BUSINESS_USER_ID_KEY);
    localStorage.removeItem(BUSINESS_CONFIG_KEY);
  },

  /**
   * Store verification record ID
   */
  setVerificationRecordId(recordId: string): void {
    localStorage.setItem(VERIFICATION_RECORD_KEY, recordId);
  },

  /**
   * Get verification record ID
   */
  getVerificationRecordId(): string | null {
    return localStorage.getItem(VERIFICATION_RECORD_KEY);
  },

  /**
   * Store V.A.I. code
   */
  setVaiCode(vaiCode: string): void {
    localStorage.setItem(VAI_CODE_KEY, vaiCode);
  },

  /**
   * Get V.A.I. code
   */
  getVaiCode(): string | null {
    return localStorage.getItem(VAI_CODE_KEY);
  },

  /**
   * Store business ID
   */
  setBusinessId(businessId: string): void {
    localStorage.setItem(BUSINESS_ID_KEY, businessId);
  },

  /**
   * Get business ID
   */
  getBusinessId(): string | null {
    return localStorage.getItem(BUSINESS_ID_KEY);
  },

  /**
   * Store business user ID
   */
  setBusinessUserId(userId: string): void {
    localStorage.setItem(BUSINESS_USER_ID_KEY, userId);
  },

  /**
   * Get business user ID
   */
  getBusinessUserId(): string | null {
    return localStorage.getItem(BUSINESS_USER_ID_KEY);
  },

  /**
   * Store business configuration
   */
  setBusinessConfig(config: string): void {
    localStorage.setItem(BUSINESS_CONFIG_KEY, config);
  },

  /**
   * Get business configuration
   */
  getBusinessConfig(): string | null {
    return localStorage.getItem(BUSINESS_CONFIG_KEY);
  },
};