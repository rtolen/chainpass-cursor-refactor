/**
 * Smart navigation utility for business-specific verification flows
 * Automatically skips steps not required by the business
 */

import { BusinessConfig, VerificationStep } from "@/config/businessRegistry";
import { sessionManager } from "./sessionManager";

export interface StepConfig {
  path: string;
  step: VerificationStep;
  label: string;
}

// All possible verification steps in order
const ALL_STEPS: StepConfig[] = [
  { path: '/pricing', step: 'payment', label: 'Payment' },
  { path: '/complycube-facial-verification', step: 'complycube-facial', label: 'ComplyCube Facial' },
  { path: '/facial-verification', step: 'facial', label: 'Facial Verification' },
  { path: '/leo-declaration', step: 'leo-declaration', label: 'LEO Declaration' },
  { path: '/legal-agreements', step: 'signature', label: 'Signature Agreement' },
  { path: '/contract-signature', step: 'contract-signature', label: 'Contract Signature' },
];

export class VerificationNavigator {
  private businessConfig: BusinessConfig | null = null;
  private requiredSteps: StepConfig[] = [];

  constructor() {
    this.loadBusinessConfig();
  }

  private loadBusinessConfig() {
    const configStr = sessionManager.getBusinessConfig();
    if (configStr) {
      try {
        this.businessConfig = JSON.parse(configStr);
        this.requiredSteps = ALL_STEPS.filter(
          step => this.businessConfig?.requiredSteps.includes(step.step)
        );
      } catch (error) {
        console.error('Failed to parse business config:', error);
      }
    }
  }

  /**
   * Get all required steps for the current business
   */
  getRequiredSteps(): StepConfig[] {
    return this.requiredSteps;
  }

  /**
   * Get total number of steps (excluding initial flow page)
   */
  getTotalSteps(): number {
    return this.requiredSteps.length;
  }

  /**
   * Get current step number based on path
   */
  getCurrentStepNumber(currentPath: string): number {
    const index = this.requiredSteps.findIndex(step => step.path === currentPath);
    return index >= 0 ? index + 1 : 0;
  }

  /**
   * Navigate to next step in the flow
   */
  getNextStep(currentPath: string): string | null {
    const currentIndex = this.requiredSteps.findIndex(step => step.path === currentPath);
    
    if (currentIndex < 0 || currentIndex >= this.requiredSteps.length - 1) {
      // Last step - go to appropriate success page
      return this.getSuccessPage();
    }
    
    return this.requiredSteps[currentIndex + 1].path;
  }

  /**
   * Navigate to previous step in the flow
   */
  getPreviousStep(currentPath: string): string | null {
    const currentIndex = this.requiredSteps.findIndex(step => step.path === currentPath);
    
    if (currentIndex <= 0) {
      return '/'; // Back to start
    }
    
    return this.requiredSteps[currentIndex - 1].path;
  }

  /**
   * Get appropriate success page based on business requirements
   */
  getSuccessPage(): string {
    console.log('[VerificationNavigator] Getting success page', { 
      hasConfig: !!this.businessConfig, 
      config: this.businessConfig,
      requiredSteps: this.businessConfig?.requiredSteps 
    });
    
    if (!this.businessConfig) {
      console.log('[VerificationNavigator] No business config, returning /vai-success');
      return '/vai-success';
    }

    // If business requires LEO declaration, show LEO success page
    if (this.businessConfig.requiredSteps.includes('leo-declaration')) {
      console.log('[VerificationNavigator] LEO declaration required, returning /leo-vai-success');
      return '/leo-vai-success';
    }

    console.log('[VerificationNavigator] Returning default /vai-success');
    return '/vai-success';
  }

  /**
   * Check if a step is required for current business
   */
  isStepRequired(step: VerificationStep): boolean {
    return this.businessConfig?.requiredSteps.includes(step) ?? false;
  }

  /**
   * Get business name for display
   */
  getBusinessName(): string {
    return this.businessConfig?.name ?? 'ChainPass';
  }

  /**
   * Get business ID
   */
  getBusinessId(): string | null {
    return sessionManager.getBusinessId();
  }
}

// Create singleton instance
export const verificationNavigator = new VerificationNavigator();
