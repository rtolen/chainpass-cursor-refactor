# Platform Compliance API

## Overview

The Platform Compliance API allows platforms (like Vairify) to check if a user's V.A.I. is compliant with platform-specific requirements before granting access.

## Endpoint

**POST** `/functions/v1/vai-compliance-check`

## Authentication

Currently, API key validation is optional but can be enforced by adding validation in the edge function.

## Request Format

```json
{
  "vaiNumber": "ABC1234",
  "platformId": "vairify",
  "userId": "optional-user-id",
  "checkType": "full" | "quick",
  "requestTimestamp": "2025-01-20T12:00:00Z"
}
```

### Required Fields
- `vaiNumber`: The V.A.I. code to check
- `platformId`: The platform identifier (e.g., "vairify")

### Optional Fields
- `userId`: Platform-specific user ID
- `checkType`: "full" (default) or "quick"
- `requestTimestamp`: ISO timestamp of the request

## Response Status Types

The API returns one of the following statuses:

1. **`compliant`** - V.A.I. is active and fully compliant
2. **`not_compliant`** - V.A.I. is active but missing platform requirements
3. **`expired`** - V.A.I. has expired (365 days from creation)
4. **`suspended`** - V.A.I. is suspended and requires reactivation
5. **`revoked`** - V.A.I. has been revoked
6. **`not_found`** - V.A.I. does not exist in the system
7. **`duplicate_detected`** - Duplicate V.A.I. detected (future feature)

## Response Examples

### Compliant Response

```json
{
  "status": "compliant",
  "vaiNumber": "ABC1234",
  "vaiStatus": "ACTIVE",
  "platformId": "vairify",
  "platformCompliance": {
    "platformId": "vairify",
    "isCompliant": true,
    "completedRequirements": ["leo_disclosure", "terms_of_service", "privacy_policy", "mutual_consent_contract"],
    "missingRequirements": [],
    "totalRequired": 4,
    "totalCompleted": 4,
    "completedAt": "2025-01-15T10:30:00Z"
  },
  "vaiDetails": {
    "createdAt": "2025-01-01T00:00:00Z",
    "expiresAt": "2026-01-01T00:00:00Z",
    "daysUntilExpiration": 346,
    "verificationLevel": {
      "identityVerified": true,
      "biometricEnrolled": true,
      "ageVerified": true,
      "leoDisclosure": true
    }
  },
  "otherPlatforms": [],
  "duplicateCheck": {
    "performed": true,
    "isDuplicate": false,
    "message": null
  },
  "actions": {
    "allowAccess": true,
    "redirectTo": null,
    "showWarning": false,
    "warningMessage": null
  },
  "responseTimestamp": "2025-01-20T12:00:00Z"
}
```

### Not Compliant Response

```json
{
  "status": "not_compliant",
  "vaiNumber": "ABC1234",
  "vaiStatus": "ACTIVE",
  "platformId": "vairify",
  "platformCompliance": {
    "platformId": "vairify",
    "isCompliant": false,
    "missingRequirements": ["leo_disclosure", "mutual_consent_contract"],
    "completedRequirements": ["terms_of_service", "privacy_policy"],
    "totalRequired": 4,
    "totalCompleted": 2
  },
  "vaiDetails": {
    "createdAt": "2025-01-01T00:00:00Z",
    "expiresAt": "2026-01-01T00:00:00Z",
    "daysUntilExpiration": 346
  },
  "otherPlatforms": [],
  "actions": {
    "allowAccess": false,
    "complianceFlowUrl": "https://chainpass.vai/compliance?vai=ABC1234&platform=vairify",
    "message": "Complete 2 more steps (FREE)",
    "nextSteps": [
      {
        "requirement": "leo_disclosure",
        "displayName": "Leo Disclosure"
      },
      {
        "requirement": "mutual_consent_contract",
        "displayName": "Mutual Consent Contract"
      }
    ]
  },
  "responseTimestamp": "2025-01-20T12:00:00Z"
}
```

### Expired Response

```json
{
  "status": "expired",
  "vaiNumber": "ABC1234",
  "vaiStatus": "EXPIRED",
  "expiresAt": "2024-12-31T23:59:59Z",
  "message": "V.A.I. expired - renewal required",
  "actions": {
    "renewalUrl": "https://chainpass.vai/renew",
    "message": "Renew your V.A.I. to continue ($99/year)",
    "warningMessage": "Your V.A.I. expired. Renew now.",
    "allowAccess": false
  },
  "responseTimestamp": "2025-01-20T12:00:00Z"
}
```

### Not Found Response

```json
{
  "status": "not_found",
  "vaiNumber": "INVALID",
  "message": "V.A.I. not found in system",
  "actions": {
    "createVAIUrl": "https://chainpass.vai/create",
    "message": "Create your V.A.I. to get started"
  },
  "responseTimestamp": "2025-01-20T12:00:00Z"
}
```

## Platform Requirements

### Vairify Platform Requirements

1. **LEO Disclosure** - Law enforcement disclosure acceptance
2. **Terms of Service** - Terms of service acceptance
3. **Privacy Policy** - Privacy policy acceptance
4. **Mutual Consent Contract** - Mutual consent contract signature

## Database Schema

### `platform_compliance` Table

Tracks platform-specific compliance requirements per V.A.I.

```sql
CREATE TABLE platform_compliance (
  id UUID PRIMARY KEY,
  vai_number TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  leo_disclosure BOOLEAN DEFAULT FALSE,
  terms_of_service BOOLEAN DEFAULT FALSE,
  privacy_policy BOOLEAN DEFAULT FALSE,
  mutual_consent_contract BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vai_number, platform_id)
);
```

### `compliance_check_audit` Table

Audit log for all compliance check API calls.

```sql
CREATE TABLE compliance_check_audit (
  id UUID PRIMARY KEY,
  vai_number TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  user_id TEXT,
  check_type TEXT,
  result_status TEXT NOT NULL,
  response_time_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Integration Example

### Using the Service Class

```typescript
import chainpassService from '../services/chainpassComplianceService';

// Check compliance
const result = await chainpassService.checkCompliance('ABC1234', 'user-123', 'full');

// Handle result
const action = chainpassService.handleComplianceResult(result);

switch (action.action) {
  case 'allow_access':
    // User is compliant - allow access
    navigate('/dashboard');
    break;
  case 'redirect_compliance':
    // User needs to complete requirements
    navigate(action.url!);
    break;
  // ... other cases
}
```

### Using the React Hook

```typescript
import { useVAICompliance } from '../hooks/useVAICompliance';

function LoginPage() {
  const { checkCompliance, isChecking, error } = useVAICompliance();

  const handleLogin = async (vaiNumber: string) => {
    const result = await checkCompliance(vaiNumber, userId);
    
    if (result.allowed) {
      navigate('/dashboard');
    } else {
      console.log('Compliance check failed:', result.reason);
    }
  };

  return (
    <div>
      {isChecking && <Spinner />}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {/* ... login form */}
    </div>
  );
}
```

## Error Handling

The service handles the following error types:

- **NETWORK_ERROR** - Unable to connect to ChainPass API
- **TIMEOUT** - Request timed out
- **RATE_LIMIT** - Too many requests (includes `retryAfter` in seconds)

## Deployment

1. **Run Migration:**
   ```bash
   supabase db push
   ```

2. **Deploy Edge Function:**
   ```bash
   supabase functions deploy vai-compliance-check
   ```

3. **Set Environment Variables:**
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

## Testing

### Test with curl

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/vai-compliance-check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "X-Platform-ID: vairify" \
  -d '{
    "vaiNumber": "TEST123",
    "platformId": "vairify",
    "checkType": "full"
  }'
```

### Verify Audit Logs

```sql
SELECT * FROM compliance_check_audit 
ORDER BY created_at DESC 
LIMIT 10;
```

## Security Considerations

1. **API Key Validation** - Currently optional, should be enforced in production
2. **Rate Limiting** - Should be implemented at the edge function level
3. **Input Validation** - All inputs are validated before processing
4. **Audit Logging** - All compliance checks are logged for security and compliance

## Future Enhancements

1. **API Key Authentication** - Enforce API key validation
2. **Rate Limiting** - Implement rate limiting per platform
3. **Caching** - Cache compliance results for quick checks
4. **Webhooks** - Notify platforms when compliance status changes
5. **Duplicate Detection** - Enhanced duplicate detection logic

