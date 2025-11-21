# ChainPass V.A.I. Verification Flow - Complete Code Audit

**Document Created:** 2025-01-19  
**Purpose:** External evaluation of verification flow architecture and implementation  
**Status:** After 50+ fix attempts - systematic architecture review needed

---

## Table of Contents
1. [Flow Overview](#flow-overview)
2. [Routing Configuration](#routing-configuration)
3. [Navigation Logic](#navigation-logic)
4. [Page-by-Page Implementation](#page-by-page-implementation)
5. [Database Schema](#database-schema)
6. [Edge Functions](#edge-functions)
7. [Known Issues](#known-issues)
8. [Critical Missing Components](#critical-missing-components)

---

## Flow Overview

### Current Flow Architecture
```
START → VaiIntro 
     → PaymentSelection 
     → PaymentForm 
     → VerificationTransition
     → IdUpload (ComplyCube Integration)
     → VaiProcessing (V.A.I. Generation)
     → LeoDeclaration
     → SignatureAgreement (SKIPPED - BUG)
     → FacialVerification (Contract Signing)
     → ContractSignature
     → [VaiSuccess OR LEOVaiSuccess]
```

### Intended Flow Architecture
```
START → VaiIntro 
     → PaymentSelection 
     → PaymentForm 
     → IdUpload (ComplyCube KYC Verification)
     → ComplyCube Facial Biometric Comparison (MISSING)
     → VaiProcessing (V.A.I. Generation)
     → LeoDeclaration
     → SignatureAgreement (Review Legal Terms)
     → FacialVerification (Pre-Contract Identity Verification)
     → ContractSignature (Final Signing with Facial Recognition)
     → [VaiSuccess OR LEOVaiSuccess]
```

---

## Routing Configuration

### File: `src/App.tsx`
```typescript
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/vai-intro" element={<VaiIntro />} />
  <Route path="/:businessId/verify" element={<BusinessVerificationStart />} />
  <Route path="/pricing" element={<PaymentSelection />} />
  <Route path="/payment" element={<PaymentForm />} />
  <Route path="/verification-transition" element={<VerificationTransition />} />
  <Route path="/vai-processing" element={<VaiProcessing />} />
  <Route path="/id-upload" element={<IdUpload />} />
  <Route path="/leo-declaration" element={<LeoDeclaration />} />
  <Route path="/legal-agreements" element={<SignatureAgreement />} />
  <Route path="/contract-signature" element={<ContractSignature />} />
  <Route path="/facial-verification" element={<FacialVerification />} />
  <Route path="/leo-vai-success" element={<LEOVaiSuccess />} />
  <Route path="/vai-success" element={<VaiSuccess />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

## Navigation Logic

### File: `src/utils/verificationNavigation.ts`

This utility manages business-specific verification flows and determines which steps are required.

```typescript
const ALL_STEPS: StepConfig[] = [
  { path: '/pricing', step: 'payment', label: 'Payment' },
  { path: '/id-upload', step: 'id-upload', label: 'ID Upload' },
  { path: '/facial-verification', step: 'facial', label: 'Facial Verification' },
  { path: '/leo-declaration', step: 'leo-declaration', label: 'LEO Declaration' },
  { path: '/legal-agreements', step: 'signature', label: 'Signature Agreement' },
  { path: '/contract-signature', step: 'contract-signature', label: 'Contract Signature' },
];

export class VerificationNavigator {
  private businessConfig: BusinessConfig | null = null;
  private requiredSteps: StepConfig[] = [];

  getNextStep(currentPath: string): string | null {
    const currentIndex = this.requiredSteps.findIndex(step => step.path === currentPath);
    
    if (currentIndex < 0 || currentIndex >= this.requiredSteps.length - 1) {
      return this.getSuccessPage();
    }
    
    return this.requiredSteps[currentIndex + 1].path;
  }

  getSuccessPage(): string {
    if (!this.businessConfig) {
      return '/vai-success';
    }

    if (this.businessConfig.requiredSteps.includes('leo-declaration')) {
      return '/leo-vai-success';
    }

    return '/vai-success';
  }
}
```

**CRITICAL ISSUE:** The navigation logic assumes all steps in `ALL_STEPS` are in the correct order, but there is NO step for ComplyCube facial biometric comparison, which should occur BEFORE V.A.I. generation.

---

## Page-by-Page Implementation

### 1. VaiIntro (Information Page)

**File:** `src/pages/VaiIntro.tsx`

**Purpose:** Explain V.A.I. concept and data protection flow

**Navigation:**
- Continue → `/pricing`

**Key Code:**
```typescript
<Button
  onClick={() => navigate('/pricing')}
  className="w-full h-14 text-lg font-semibold"
>
  Continue to Pricing
  <ArrowRight className="ml-2 w-5 h-5" />
</Button>
```

---

### 2. PaymentSelection

**File:** `src/pages/PaymentSelection.tsx`

**Purpose:** Display annual verification pricing ($99)

**Features:**
- Shows benefits list
- Displays trust signals
- **NEW:** Referral/coupon code input field

**Navigation:**
- Continue → `/payment`

**Key Code:**
```typescript
const [referralCode, setReferralCode] = useState("");

// Referral Code Input
<Input
  id="referralCode"
  type="text"
  placeholder="Enter code (optional)"
  value={referralCode}
  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
/>

<Button
  onClick={() => navigate("/payment")}
  className="w-full h-14 text-lg font-semibold"
>
  Continue to Payment
</Button>
```

**ISSUE:** Referral code is captured but NOT passed to payment or stored anywhere.

---

### 3. PaymentForm

**File:** `src/pages/PaymentForm.tsx`

**Purpose:** Stripe payment integration for $99 annual verification

**Features:**
- Stripe Elements integration
- Order summary
- **TESTING BYPASS:** Skip payment button

**Navigation:**
- Success → `/verification-transition`
- Bypass → `/verification-transition`

**Key Code:**
```typescript
<Elements stripe={stripePromise}>
  <StripePaymentForm 
    amount={9900} 
    onSuccess={() => navigate('/verification-transition')} 
  />
</Elements>

// Testing Bypass
<Button
  variant="outline"
  onClick={() => navigate("/verification-transition")}
  className="w-full bg-yellow-500/10"
>
  [TESTING] Skip Payment & Continue
</Button>
```

**CRITICAL:** Payment bypass button allows skipping payment entirely in testing mode.

---

### 4. IdUpload (ComplyCube Integration)

**File:** `src/pages/IdUpload.tsx`

**Purpose:** Government ID upload through ComplyCube modal

**Features:**
- File dropzone (drag & drop or click)
- Camera capture
- Image preview with rotation
- ComplyCube hosted solution modal

**Navigation:**
- After successful upload → Uses `verificationNavigator.getNextStep('/id-upload')`
- Typically goes to → `/vai-processing` or `/leo-declaration`

**Key Code:**
```typescript
const handleContinueToFacial = () => {
  const nextStep = verificationNavigator.getNextStep('/id-upload');
  if (nextStep) {
    navigate(nextStep);
  }
};

// ComplyCube Modal Integration
<Dialog open={showComplyCubeModal}>
  <DialogContent className="max-w-4xl max-h-[90vh]">
    <iframe 
      src={complycubeSessionUrl}
      className="w-full h-[70vh]"
      title="ComplyCube Verification"
    />
  </DialogContent>
</Dialog>
```

**CRITICAL MISSING:** After ComplyCube completes KYC and captures biometric photo, there is NO step to compare a live camera capture against the ComplyCube-stored biometric image to verify the person continuing the flow is the same person who completed KYC.

---

### 5. VaiProcessing (V.A.I. Generation)

**File:** `src/pages/VaiProcessing.tsx`

**Purpose:** Generate and assign V.A.I. code

**Features:**
- Progress animation (verifying → generating → complete)
- V.A.I. code generation (7-character alphanumeric)
- Database storage in `vai_assignments` table
- Zustand store persistence
- Session storage backup

**State Management:**
```typescript
const { vaiNumber, setVAI, isGenerating, setGenerating } = useVAIStore();

// Generate V.A.I. code
const generateVAICode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Store in database
const { data: newVAI, error: vaiError } = await supabase
  .from('vai_assignments')
  .insert({
    vai_code: newCode,
    verification_record_id: recordId,
    status: 'NOT ACTIVATED',
  })
  .select()
  .single();

// Store in Zustand + sessionStorage
setVAI(newCode, recordId, isLEO);
sessionManager.setVaiCode(newCode);
```

**Navigation:**
- Continue → Uses `verificationNavigator.getNextStep('/vai-processing')`
- Typically goes to → `/leo-declaration`

**CRITICAL BUG:** V.A.I. is generated BEFORE user completes legal agreements and facial verification, but status is set to "NOT ACTIVATED". This creates confusion about when V.A.I. is truly ready for use.

---

### 6. LeoDeclaration

**File:** `src/pages/LeoDeclaration.tsx`

**Purpose:** User declares Law Enforcement Officer status

**Features:**
- Radio selection: Civilian or LEO
- Multiple checkboxes for understanding visibility/permanence
- Displays V.A.I. code examples (civilian vs LEO-prefixed)
- Confirmation modal

**Key Code:**
```typescript
const [selection, setSelection] = useState<"civilian" | "leo" | null>(null);
const [checkboxes, setCheckboxes] = useState({
  liability: false,
  permanent: false,
  visible: false,
  responsible: false,
});

const handleConfirm = () => {
  if (selection === "leo") {
    sessionStorage.setItem("userType", "leo");
  } else {
    sessionStorage.setItem("userType", "civilian");
  }
  
  const nextStep = verificationNavigator.getNextStep('/leo-declaration');
  if (nextStep) {
    navigate(nextStep);
  } else {
    navigate('/legal-agreements'); // Fallback
  }
};
```

**Navigation:**
- Continue → Uses `verificationNavigator.getNextStep('/leo-declaration')`
- Fallback → `/legal-agreements`

**ISSUE:** LEO selection stored in sessionStorage but NOT in database. This means LEO status is session-only and not persisted with the V.A.I. assignment.

---

### 7. SignatureAgreement (CRITICAL BUG - BEING SKIPPED)

**File:** `src/pages/SignatureAgreement.tsx`

**Purpose:** Review and accept legal agreements

**Features:**
- Scrollable contract viewer
- Must scroll to bottom to enable checkboxes
- 9 checkboxes for various agreement terms
- Confirmation modal before proceeding

**Key Code:**
```typescript
const [scrolledToBottom, setScrolledToBottom] = useState(false);
const [checkboxes, setCheckboxes] = useState({
  read: false,
  authorize: false,
  equivalent: false,
  protect: false,
  review: false,
  responsible: false,
  infrastructure: false,
  blockchain: false,
  jurisdiction: false,
});

const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const element = e.currentTarget;
  const scrolledPercentage =
    (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
  if (scrolledPercentage >= 80 && !scrolledToBottom) {
    setScrolledToBottom(true);
  }
};

const handleConfirmSign = async () => {
  const nextStep = verificationNavigator.getNextStep('/legal-agreements');
  if (nextStep) {
    navigate(nextStep);
  } else {
    navigate('/vai-processing'); // Fallback
  }
};
```

**Navigation:**
- Continue → Uses `verificationNavigator.getNextStep('/legal-agreements')`
- Fallback → `/vai-processing`

**CRITICAL BUG:** This entire page is being SKIPPED in the flow. Users navigate directly past it, never reviewing or accepting the legal agreements. The page exists in the codebase but is not being invoked by the navigation system.

**ROOT CAUSE:** The `verificationNavigator` may not be configured to include this step, or there's a navigation logic error that bypasses it.

---

### 8. FacialVerification (Pre-Contract Identity Check)

**File:** `src/pages/FacialVerification.tsx`

**Purpose:** Facial recognition to verify identity before contract signing

**Features:**
- Live camera access
- Face detection and alignment feedback
- 3-second countdown when face aligned
- Image capture and comparison using Gemini 2.5 Pro
- 3 attempt limit
- Edge function: `verify-vai-facial`

**Key Code:**
```typescript
const [state, setState] = useState<VerificationState>("initial");
const [faceAlignment, setFaceAlignment] = useState<FaceAlignment>("searching");
const [attempts, setAttempts] = useState(0);

const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 1280, height: 720 },
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setState("camera-active");
    }
  } catch (error) {
    setCameraError("camera-denied");
    setState("error");
  }
};

const handleCapture = async () => {
  // Capture image from video element
  const canvas = canvasRef.current;
  const video = videoRef.current;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(video, 0, 0);
  const imageData = canvas.toDataURL("image/jpeg", 0.95);

  // Call edge function
  const { data, error } = await supabase.functions.invoke("verify-vai-facial", {
    body: {
      vaiNumber: sessionStorage.getItem("vai_number"),
      liveFaceImage: imageData,
    },
  });

  if (data?.verified) {
    setConfidence(data.confidence);
    setState("success");
    // Navigate to next step
    const nextStep = verificationNavigator.getNextStep('/facial-verification');
    if (nextStep) navigate(nextStep);
  } else {
    setAttempts(attempts + 1);
    setState("failed");
  }
};
```

**Navigation:**
- Success → Uses `verificationNavigator.getNextStep('/facial-verification')`
- Max attempts exceeded → Error state

**ISSUE:** This page performs facial comparison against the stored V.A.I. selfie, but the user flow is confusing because:
1. There's no ComplyCube biometric comparison step
2. SignatureAgreement is being skipped
3. Users don't understand WHY they're doing facial verification here

---

### 9. ContractSignature (Final Signing)

**File:** `src/pages/ContractSignature.tsx`

**Purpose:** Final contract signing with facial recognition

**Features:**
- Three-step process: Review → Verify → Confirm
- Contract viewer with scroll-to-bottom requirement
- Facial verification using `verify-facial-signature` edge function
- Signature recorded in database via `sign-contract` edge function

**Key Code:**
```typescript
type Step = "contract" | "verification" | "confirmation";
const [currentStep, setCurrentStep] = useState<Step>("contract");

// Step 1: Contract Review
<ContractViewer
  contractType={contractType}
  onScrollComplete={() => setHasScrolledContract(true)}
/>

// Step 2: Facial Verification
<FacialVerification
  vaiNumber={vaiNumber}
  onVerificationSuccess={(confidence) => handleSignContract(confidence)}
  onVerificationFailed={() => toast.error("Verification failed")}
/>

// Step 3: Sign Contract
const handleSignContract = async (confidence: number) => {
  const { data, error } = await supabase.functions.invoke("sign-contract", {
    body: {
      vaiNumber,
      contractType,
      contractText: CONTRACT_CONTENT[contractType],
      facialMatchConfidence: confidence,
      deviceFingerprint: btoa(`${navigator.userAgent}...`),
    },
  });

  if (data.success) {
    setSignedContract({
      contractId: data.contractId,
      signedAt: data.signedAt,
      blockchainHash: data.blockchainHash,
    });
    setCurrentStep("confirmation");
  }
};
```

**Navigation:**
- After successful signature → `/vai-success` or `/leo-vai-success`

**ISSUE:** This is effectively a SECOND facial verification in the flow, which is confusing to users. The distinction between FacialVerification page and this ContractSignature facial verification is unclear.

---

### 10. VaiSuccess / LEOVaiSuccess

**File:** `src/pages/VaiSuccess.tsx` and `src/pages/LEOVaiSuccess.tsx`

**Purpose:** Display final V.A.I. code and provide actions

**Features:**
- Display V.A.I. code (with LEO- prefix for officers)
- Copy code button
- Download QR code
- Educational content about V.A.I. usage
- Referral code submission (VaiSuccess only)
- Business callback (if business verification)
- Continue to Vairify button

**Key Code (VaiSuccess):**
```typescript
const { vaiNumber } = useVAIStore();

useEffect(() => {
  const code = vaiNumber || sessionManager.getVaiCode();
  if (code) {
    const displayCode = code.replace('LEO-', ''); // Remove LEO prefix for civilian display
    setVaiCode(displayCode);
  } else {
    toast.error("No V.A.I. code found");
    window.location.href = '/';
  }
}, [vaiNumber]);

const copyVAI = () => {
  navigator.clipboard.writeText(vaiCode);
  toast.success("V.A.I. copied to clipboard!");
};

const downloadQR = async () => {
  const qrCode = await QRCode.toDataURL(vaiCode, {
    width: 500,
    color: { dark: '#3b82f6', light: '#1a1a2e' }
  });
  const link = document.createElement('a');
  link.href = qrCode;
  link.download = 'my-vai-code.png';
  link.click();
};
```

**Key Code (LEOVaiSuccess):**
```typescript
useEffect(() => {
  const code = vaiNumber || sessionManager.getVaiCode();
  if (code) {
    const displayCode = code.startsWith('LEO-') ? code : `LEO-${code}`;
    setVaiCode(displayCode);
  }
}, [vaiNumber]);

// Gold/orange LEO theme throughout
<div className="bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/20">
  <Shield className="text-[#FFD700]" />
  <h2>LAW ENFORCEMENT OFFICER</h2>
</div>
```

**CRITICAL BUG:** V.A.I. code state management has caused regeneration bugs where:
1. Top-right corner shows different V.A.I. than main card
2. Back button creates new V.A.I. instead of returning to existing
3. V.A.I. numbers not persisting across navigation

This was supposedly fixed with Zustand store + sessionStorage, but issues persist.

---

## Database Schema

### Tables Used in Verification Flow

#### 1. verification_records
```sql
CREATE TABLE verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  complycube_verification_id TEXT,
  verification_status TEXT DEFAULT 'pending',
  biometric_confirmed BOOLEAN DEFAULT false,
  id_document_url TEXT,
  selfie_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. vai_assignments
```sql
CREATE TABLE vai_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vai_code TEXT NOT NULL UNIQUE,
  verification_record_id UUID REFERENCES verification_records(id),
  status TEXT DEFAULT 'NOT ACTIVATED',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**ISSUE:** No LEO status field! LEO designation is only stored in sessionStorage, not persisted.

#### 3. payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_record_id UUID REFERENCES verification_records(id),
  amount INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. legal_agreements
```sql
CREATE TABLE legal_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vai_assignment_id UUID REFERENCES vai_assignments(id),
  signature_agreement_signed BOOLEAN DEFAULT false,
  leo_declaration_signed BOOLEAN DEFAULT false,
  signature_data TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**ISSUE:** No record of WHICH legal agreement was signed (terms of service, mutual consent, LEO disclosure).

#### 5. signature_attempts
```sql
CREATE TABLE signature_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vai_number TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  facial_match_confidence DECIMAL,
  failure_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  attempted_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. signed_contracts
```sql
CREATE TABLE signed_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT UNIQUE NOT NULL,
  vai_number TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  contract_text TEXT NOT NULL,
  facial_match_confidence DECIMAL NOT NULL,
  signed_at TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  blockchain_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Edge Functions

### 1. create-payment-intent

**File:** `supabase/functions/create-payment-intent/index.ts`

**Purpose:** Create Stripe payment intent for $99 verification fee

**Key Logic:**
```typescript
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");

const paymentIntent = await stripe.paymentIntents.create({
  amount: 9900, // $99.00
  currency: "usd",
  automatic_payment_methods: { enabled: true },
});

return new Response(
  JSON.stringify({ clientSecret: paymentIntent.client_secret }),
  { headers: corsHeaders }
);
```

---

### 2. create-complycube-session

**File:** `supabase/functions/create-complycube-session/index.ts`

**Purpose:** Generate ComplyCube hosted solution session URL

**Key Logic:**
```typescript
const complycubeApiKey = Deno.env.get("COMPLYCUBE_API_KEY");

const response = await fetch("https://api.complycube.com/v1/flows/sessions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${complycubeApiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    checkTypes: ["document_check", "identity_check"],
    successUrl: `${origin}/verification-transition`,
    cancelUrl: `${origin}/id-upload`,
  }),
});

return new Response(
  JSON.stringify({ sessionUrl: data.sessionUrl }),
  { headers: corsHeaders }
);
```

**ISSUE:** No callback handling for when ComplyCube verification completes. We need to store the biometric photo URL for later comparison.

---

### 3. verify-vai-facial

**File:** `supabase/functions/verify-vai-facial/index.ts`

**Purpose:** Compare live facial image against stored V.A.I. selfie using Gemini 2.5 Pro

**Key Logic:**
```typescript
// Rate limiting: max 5 attempts per 10 minutes
const { count } = await supabase
  .from('signature_attempts')
  .select('*', { count: 'exact' })
  .eq('vai_number', vaiNumber)
  .gte('attempted_at', tenMinutesAgo);

if (count >= 5) {
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded" }),
    { status: 429 }
  );
}

// Fetch stored selfie URL
const { data: vaiRecord } = await supabase
  .from('vai_assignments')
  .select('verification_record_id')
  .eq('vai_code', vaiNumber)
  .single();

const { data: verificationRecord } = await supabase
  .from('verification_records')
  .select('selfie_url')
  .eq('id', vaiRecord.verification_record_id)
  .single();

// Call Lovable AI (Gemini 2.5 Pro)
const aiResponse = await fetch("https://api.lovable.app/v1/ai/generate", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${Deno.env.get("LOVABLE_AI_API_KEY")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-pro",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Compare these two facial images. Are they the same person? Respond with JSON: {\"match\": boolean, \"confidence\": number}" },
        { type: "image_url", image_url: { url: verificationRecord.selfie_url } },
        { type: "image_url", image_url: { url: liveFaceImage } }
      ]
    }],
  }),
});

const aiData = await aiResponse.json();
const match = aiData.confidence >= 85;

// Log attempt
await supabase.from('signature_attempts').insert({
  vai_number: vaiNumber,
  contract_type: 'facial_verification',
  success: match,
  facial_match_confidence: aiData.confidence,
  failure_reason: match ? null : 'Low confidence match',
  ip_address: req.headers.get('x-forwarded-for'),
  user_agent: req.headers.get('user-agent'),
});

return new Response(
  JSON.stringify({ verified: match, confidence: aiData.confidence }),
  { headers: corsHeaders }
);
```

---

### 4. verify-facial-signature

**File:** `supabase/functions/verify-facial-signature/index.ts`

**Purpose:** Verify facial match for contract signing (uses same Gemini comparison logic)

**Key Logic:**
```typescript
// Similar to verify-vai-facial but includes:
// - contractType parameter
// - deviceFingerprint parameter
// - Rate limit: 3 attempts per 5 minutes (stricter)

const { count } = await supabase
  .from('signature_attempts')
  .select('*', { count: 'exact' })
  .eq('vai_number', vaiNumber)
  .eq('contract_type', contractType)
  .gte('attempted_at', fiveMinutesAgo);

if (count >= 3) {
  return new Response(
    JSON.stringify({ error: "Maximum signature attempts exceeded" }),
    { status: 429 }
  );
}

// ... rest of logic identical to verify-vai-facial
```

**ISSUE:** We have TWO nearly identical edge functions for facial verification. This creates confusion and maintenance burden.

---

### 5. sign-contract

**File:** `supabase/functions/sign-contract/index.ts`

**Purpose:** Record signed contract in database

**Key Logic:**
```typescript
const contractId = `CONTRACT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const { data, error } = await supabase
  .from('signed_contracts')
  .insert({
    contract_id: contractId,
    vai_number: vaiNumber,
    contract_type: contractType,
    contract_text: contractText,
    facial_match_confidence: facialMatchConfidence,
    signed_at: new Date().toISOString(),
    ip_address: req.headers.get('x-forwarded-for'),
    user_agent: req.headers.get('user-agent'),
    blockchain_hash: null, // TODO: Implement blockchain recording
  })
  .select()
  .single();

return new Response(
  JSON.stringify({
    success: true,
    contractId: data.contract_id,
    signedAt: data.signed_at,
    blockchainHash: data.blockchain_hash,
  }),
  { headers: corsHeaders }
);
```

**ISSUE:** Blockchain hash is always null - blockchain recording not implemented.

---

## Known Issues

### 1. SignatureAgreement Page Being Skipped (CRITICAL)

**Symptom:** Users navigate directly past the SignatureAgreement page without reviewing or accepting legal terms.

**Root Cause:** Unknown - requires investigation of:
- `verificationNavigator` configuration
- Business config in session storage
- Step ordering logic

**Impact:** HIGH - Users are signing contracts without reviewing terms, creating legal liability.

---

### 2. Missing ComplyCube Biometric Comparison Step (CRITICAL)

**Symptom:** After ComplyCube KYC captures biometric photo, there is no step to verify the person continuing the flow is the same person who completed KYC.

**Root Cause:** Architectural gap - this step was never implemented.

**Impact:** HIGH - Person A could complete KYC, then hand off to Person B to complete the rest of the flow, defeating the entire verification purpose.

**Solution Needed:**
1. Create new page: `ComplyCubeFacialVerification.tsx`
2. Place AFTER IdUpload, BEFORE VaiProcessing
3. Compare live camera capture to ComplyCube-stored biometric
4. Use Gemini 2.5 Pro for comparison
5. Require 85%+ confidence to proceed
6. Allow 3 attempts, then require manual review

---

### 3. V.A.I. State Persistence Bugs

**Symptom:** V.A.I. numbers regenerate on navigation, causing:
- Different V.A.I. in top-right corner vs main card
- Back button creates new V.A.I. instead of returning to existing

**Root Cause:** Race conditions and inconsistent state management

**Attempted Fix:** Zustand store + sessionStorage persistence

**Current Status:** Issues supposedly fixed, but may persist in edge cases

**Recommendation:** Audit V.A.I. generation logic for race conditions and ensure single source of truth.

---

### 4. LEO Status Not Persisted in Database

**Symptom:** LEO selection stored in sessionStorage but NOT in vai_assignments table

**Root Cause:** Database schema missing LEO status field

**Impact:** MEDIUM - LEO status lost on session expiration, cannot be verified later

**Solution:**
```sql
ALTER TABLE vai_assignments
ADD COLUMN is_leo BOOLEAN DEFAULT false;
```

---

### 5. Referral Code Captured But Not Used

**Symptom:** Referral code input on PaymentSelection page, but value is never passed to payment or stored

**Root Cause:** Feature partially implemented

**Impact:** LOW - Referral program non-functional

**Solution:**
1. Pass referralCode to PaymentForm via navigation state
2. Store in payments table
3. Implement referral reward logic

---

### 6. Duplicate Facial Verification Functions

**Symptom:** Two edge functions with nearly identical code:
- `verify-vai-facial`
- `verify-facial-signature`

**Root Cause:** Poor code organization

**Impact:** LOW - Maintenance burden, potential for divergence

**Solution:** Consolidate into single `verify-facial-match` function with optional parameters.

---

### 7. Testing Bypass Buttons in Production Code

**Symptom:** Multiple "[TESTING]" bypass buttons throughout the flow

**Root Cause:** Development shortcuts left in codebase

**Impact:** CRITICAL - Users can skip payment, verification, facial scans in production

**Solution:** Remove all bypass buttons or gate behind environment variable check.

**Examples:**
- PaymentForm: Skip payment button
- All facial verification pages: Bypass buttons
- Contract signing: Skip verification buttons

---

### 8. Blockchain Hash Always Null

**Symptom:** signed_contracts.blockchain_hash always null

**Root Cause:** Blockchain recording not implemented

**Impact:** LOW - Nice-to-have feature missing

---

## Critical Missing Components

### 1. ComplyCube Biometric Comparison Page

**Needed:** New page between IdUpload and VaiProcessing

**Purpose:** Verify person continuing flow is same as KYC person

**Implementation:**
```typescript
// src/pages/ComplyCubeFacialVerification.tsx

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function ComplyCubeFacialVerification() {
  const navigate = useNavigate();
  const [state, setState] = useState<"initial" | "camera" | "processing" | "success" | "failed">("initial");
  const [attempts, setAttempts] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "user" } 
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      setState("camera");
    }
  };

  const captureAndVerify = async () => {
    setState("processing");
    
    // Capture frame from video
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg");

    // Call new edge function
    const { data, error } = await supabase.functions.invoke("verify-complycube-biometric", {
      body: {
        sessionId: sessionStorage.getItem("session_id"),
        liveFaceImage: imageData,
      },
    });

    if (data?.verified) {
      setState("success");
      setTimeout(() => navigate("/vai-processing"), 2000);
    } else {
      setAttempts(attempts + 1);
      if (attempts >= 2) {
        // 3 attempts failed - require manual review
        setState("failed");
      } else {
        setState("initial");
        toast.error("Verification failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Confirm Your Identity</h1>
          <p className="text-muted-foreground">
            Compare your live image against your verified ID photo
          </p>
        </div>

        {state === "initial" && (
          <Button onClick={startCamera} size="lg" className="w-full">
            Start Camera
          </Button>
        )}

        {state === "camera" && (
          <div className="space-y-4">
            <video ref={videoRef} autoPlay className="w-full rounded-lg" />
            <Button onClick={captureAndVerify} size="lg" className="w-full">
              Capture & Verify
            </Button>
          </div>
        )}

        {state === "processing" && (
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto mb-4" />
            <p>Comparing against ID photo...</p>
          </div>
        )}

        {state === "success" && (
          <div className="text-center text-success">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
            <h2>Identity Confirmed!</h2>
            <p>Continuing to V.A.I. generation...</p>
          </div>
        )}

        {state === "failed" && (
          <div className="text-center text-destructive">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
            <h2>Verification Failed</h2>
            <p>Maximum attempts exceeded. Manual review required.</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Edge Function:**
```typescript
// supabase/functions/verify-complycube-biometric/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { sessionId, liveFaceImage } = await req.json();

  // Fetch ComplyCube biometric URL from verification_records
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  const { data: verificationRecord } = await supabase
    .from("verification_records")
    .select("selfie_url")
    .eq("session_id", sessionId)
    .single();

  if (!verificationRecord?.selfie_url) {
    return new Response(
      JSON.stringify({ error: "No biometric photo found" }),
      { status: 404 }
    );
  }

  // Compare using Gemini 2.5 Pro
  const aiResponse = await fetch("https://api.lovable.app/v1/ai/generate", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("LOVABLE_AI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{
        role: "user",
        content: [
          { 
            type: "text", 
            text: "Compare these two facial images from the same verification session. Are they the same person? Respond with JSON: {\"match\": boolean, \"confidence\": number}" 
          },
          { type: "image_url", image_url: { url: verificationRecord.selfie_url } },
          { type: "image_url", image_url: { url: liveFaceImage } }
        ]
      }],
    }),
  });

  const aiData = await aiResponse.json();
  const match = aiData.confidence >= 85;

  return new Response(
    JSON.stringify({ 
      verified: match, 
      confidence: aiData.confidence 
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

**Update App.tsx:**
```typescript
<Route path="/complycube-facial-verification" element={<ComplyCubeFacialVerification />} />
```

**Update verificationNavigation.ts:**
```typescript
const ALL_STEPS: StepConfig[] = [
  { path: '/pricing', step: 'payment', label: 'Payment' },
  { path: '/id-upload', step: 'id-upload', label: 'ID Upload' },
  { path: '/complycube-facial-verification', step: 'complycube-facial', label: 'Biometric Comparison' }, // NEW
  { path: '/vai-processing', step: 'vai-processing', label: 'V.A.I. Generation' },
  { path: '/leo-declaration', step: 'leo-declaration', label: 'LEO Declaration' },
  { path: '/legal-agreements', step: 'signature', label: 'Signature Agreement' },
  { path: '/contract-signature', step: 'contract-signature', label: 'Contract Signature' },
];
```

---

### 2. Fix SignatureAgreement Navigation

**Investigation Needed:**

1. Check businessRegistry configuration:
```typescript
// src/config/businessRegistry.ts
export const businessRegistry = {
  // ... check if 'signature' step is included in requiredSteps
};
```

2. Check sessionStorage businessConfig:
```typescript
// In browser console during flow:
console.log(sessionStorage.getItem('business_config'));
```

3. Debug verificationNavigator:
```typescript
// Add logging in LeoDeclaration handleConfirm:
console.log('[LeoDeclaration] Current step:', '/leo-declaration');
console.log('[LeoDeclaration] Next step:', verificationNavigator.getNextStep('/leo-declaration'));
console.log('[LeoDeclaration] Required steps:', verificationNavigator.getRequiredSteps());
```

**Likely Fix:** Ensure 'signature' step is included in businessConfig.requiredSteps.

---

## Recommendations for External Review

### Immediate Action Items

1. **Add ComplyCube Biometric Comparison Step** (CRITICAL)
   - Prevents identity handoff fraud
   - Required BEFORE V.A.I. generation

2. **Fix SignatureAgreement Navigation** (CRITICAL)
   - Legal liability if users don't review terms
   - Debug navigation logic

3. **Remove All Testing Bypass Buttons** (CRITICAL)
   - Production security risk
   - Gate behind `import.meta.env.DEV` check

4. **Add LEO Status to Database** (HIGH)
   - Persist LEO designation
   - Required for platform functionality

### Architecture Questions

1. **Why Two Facial Verification Steps?**
   - FacialVerification before contract
   - ContractSignature includes facial verification
   - Are both necessary? Can we consolidate?

2. **When Should V.A.I. Be Generated?**
   - Currently: After ComplyCube, before agreements
   - Status: "NOT ACTIVATED" until flow completes
   - Should V.A.I. generation be LAST step instead?

3. **What's the Difference Between verify-vai-facial and verify-facial-signature?**
   - Nearly identical code
   - Different rate limits
   - Can we have one function with parameters?

### Testing Recommendations

1. **End-to-End Flow Testing**
   - Start from VaiIntro
   - Complete every step WITHOUT bypasses
   - Document actual vs expected navigation

2. **Navigation Logic Audit**
   - Review verificationNavigator code
   - Test with different businessConfig scenarios
   - Ensure ALL steps in ALL_STEPS are reachable

3. **State Management Audit**
   - Test V.A.I. persistence across page refreshes
   - Test back button behavior
   - Test multiple browser tabs

---

## Conclusion

This verification flow has **systematic architectural issues** that have resisted 50+ fix attempts:

1. **SignatureAgreement page is completely skipped** - users never review legal terms
2. **ComplyCube biometric comparison step is missing** - allows identity handoff
3. **Duplicate facial verification logic** - confusing UX and maintenance burden
4. **Testing bypasses in production** - security vulnerability
5. **LEO status not persisted** - lost on session expiration
6. **V.A.I. state management bugs** - regeneration issues

These are not isolated bugs but **foundational flow architecture problems** requiring comprehensive redesign, not incremental patches.

**Recommended Next Steps:**
1. External architecture review of entire flow
2. Create flow diagram with all edge cases
3. Rebuild navigation logic from scratch
4. Implement missing ComplyCube biometric step
5. Remove all testing bypasses
6. End-to-end testing with real users

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-19  
**Author:** ChainPass Development Team  
**Status:** Pending External Review
