import { useState } from 'react';
import chainpassService from '../services/chainpassComplianceService';
import { useNavigate } from 'react-router-dom';

export function useVAICompliance() {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const checkCompliance = async (vaiNumber: string, userId?: string) => {
    setIsChecking(true);
    setError(null);

    try {
      // Call ChainPass API
      const result = await chainpassService.checkCompliance(vaiNumber, userId, 'full');

      // Handle result
      const action = chainpassService.handleComplianceResult(result);

      switch (action.action) {
        case 'allow_access':
          // User is fully compliant - allow access
          return { allowed: true };

        case 'redirect_compliance':
          // User needs to complete platform-specific requirements
          navigate(action.url!);
          return { allowed: false, reason: 'compliance_required' };

        case 'redirect_renewal':
          // V.A.I. expired or suspended - needs payment
          navigate(action.url!);
          return { allowed: false, reason: 'renewal_required' };

        case 'redirect_creation':
          // V.A.I. doesn't exist - create new one
          navigate(action.url!);
          return { allowed: false, reason: 'vai_not_found' };

        case 'show_warning':
          // Duplicate detected - show warning
          setError(action.message || 'Warning: Issue detected with V.A.I.');
          return { allowed: false, reason: 'warning' };

        case 'block_access':
          // V.A.I. revoked - block completely
          setError(action.message || 'Access denied');
          return { allowed: false, reason: 'revoked' };

        default:
          setError(action.message || 'Unknown error');
          return { allowed: false, reason: 'error' };
      }
    } catch (err: any) {
      console.error('Compliance check error:', err);
      const action = chainpassService.handleError(err);
      setError(action.message || 'Failed to check compliance');
      return { allowed: false, reason: 'error' };
    } finally {
      setIsChecking(false);
    }
  };

  return {
    checkCompliance,
    isChecking,
    error
  };
}

