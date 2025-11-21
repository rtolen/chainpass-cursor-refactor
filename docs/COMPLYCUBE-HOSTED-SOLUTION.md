# ComplyCube Hosted Solution Integration

## Overview

ChainPass uses ComplyCube's **Hosted Solution (Flow)** for identity verification. This approach provides maximum security, compliance, and reliability by handling all verification on ComplyCube's infrastructure.

## Why Hosted Solution?

### 1. **Data Liability & Compliance**
- PII-sensitive data (ID documents, selfies, biometrics) **never touches ChainPass servers**
- ComplyCube assumes **data breach liability** during verification
- Simplified **GDPR, CCPA, BIPA** compliance
- Reduces cyber insurance costs and regulatory audit burden

### 2. **Business Positioning**
- Clear separation: ComplyCube does verification, ChainPass orchestrates
- Credibility: Users see verification happens on regulated KYC provider's infrastructure
- Trust signal: `flow.complycube.com` URL demonstrates proper third-party verification
- Liability shield: Verification is demonstrably ComplyCube's responsibility

### 3. **Security Isolation**
- Complete security isolation - zero attack surface on ChainPass for ID data
- Defense in depth - even if ChainPass is compromised, verification data is safe
- Clear separation of data processing responsibilities for compliance audits

### 4. **Professional UX**
- ComplyCube's UX-optimized flow (tested across millions of verifications)
- Built-in error handling, retry logic, and user guidance
- Multi-language support
- Mobile-optimized by KYC specialists

### 5. **Lower Maintenance**
- Zero frontend SDK maintenance
- No version management required
- ComplyCube handles browser compatibility
- Simpler backend implementation

## How It Works

### Flow Diagram
```
User clicks "Continue to Verification"
  ↓
ChainPass creates ComplyCube Flow session (edge function)
  ↓
User redirects to flow.complycube.com (ISOLATED DOMAIN)
  ↓
User completes ID upload & liveness check on ComplyCube
  ↓
ComplyCube redirects back to ChainPass with verification status
  ↓
ChainPass processes results and continues to V.A.I. processing
```

### Implementation Details

**Edge Function**: `create-complycube-session`
- Creates ComplyCube client
- Generates Flow session with success/cancel URLs
- Returns redirect URL for user

**Frontend**: `VerificationTransition.tsx`
- Calls edge function to get redirect URL
- Stores session context in sessionStorage (persists through redirect)
- Redirects user to ComplyCube's hosted page
- Handles return from verification (success or cancelled)

**Success URL**: `/vai-processing?complycube_client={clientId}`
**Cancel URL**: `/verification-transition?cancelled=true`

## Security Benefits

1. **Zero Trust Architecture**: ChainPass never has access to raw verification data
2. **Clear Audit Trail**: Verification clearly performed on ComplyCube infrastructure
3. **Regulatory Compliance**: Easier to prove data separation for GDPR Article 28
4. **Reduced Attack Surface**: No verification code running in ChainPass domain

## Session Context Preservation

PWA state is preserved through the redirect cycle using:
- **sessionStorage** for verification context
- **Same-session redirect** (not new tab) maintains PWA install state
- **Service workers** continue running during external navigation

## Testing

During development, the verification flow includes a cancel button that allows returning to ChainPass. In production, users must complete verification or explicitly cancel.

## Monitoring

Check edge function logs for:
- `[ComplyCube Flow] Starting session creation`
- `[ComplyCube Flow] Client created: {id}`
- `[ComplyCube Flow] Flow session created successfully`

## Support

For issues with verification flow:
1. Check edge function logs in Supabase dashboard
2. Verify COMPLYCUBE_API_KEY is configured correctly
3. Ensure success/cancel URLs are correct for your domain
4. Review ComplyCube dashboard for session status
