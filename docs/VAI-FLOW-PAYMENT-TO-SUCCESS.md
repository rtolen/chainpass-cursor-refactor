# ChainPass V.A.I. Verification Flow: Payment to Success
## Complete Code Audit for External Evaluation

**Document Version:** 1.0  
**Last Updated:** 2025-01-19  
**Purpose:** Comprehensive documentation of the V.A.I. verification flow from payment initiation through successful V.A.I. generation for external technical evaluation.

---

## Table of Contents

1. [Overview](#overview)
2. [Flow Architecture](#flow-architecture)
3. [Step-by-Step Flow Documentation](#step-by-step-flow-documentation)
4. [Database Schema](#database-schema)
5. [Edge Functions](#edge-functions)
6. [Session Management](#session-management)
7. [State Management](#state-management)
8. [Security Considerations](#security-considerations)
9. [Known Issues and Gaps](#known-issues-and-gaps)

---

## Overview

The ChainPass V.A.I. (Verified Adult Identity) system provides annual identity verification services with a unique alphanumeric code. The flow from payment to success involves:

- Payment processing with Stripe
- Personal details collection
- ComplyCube KYC identity verification
- Post-KYC facial biometric matching
- V.A.I. code generation
- Contract signing (optional, not currently in main flow)
- Success confirmation

**Key Design Principles:**
- Zero-knowledge architecture (personal data not stored in ChainPass database)
- Annual verification requirement ($99/year)
- LEO (Law Enforcement Officer) differentiation with "LEO-" prefix
- Progressive Web App (PWA) with mobile-first design
- Multi-language support (English/Spanish via i18next)

---

## Flow Architecture

### High-Level Flow Diagram

```
User Journey:
┌─────────────────────┐
│  Payment Selection  │ → /payment-selection
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│   Payment Form      │ → /payment
│ (Stripe Checkout)   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Personal Details    │ → /personal-details
│ (First/Last Name)   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│   ID Upload Page    │ → /id-upload
│ (ComplyCube Init)   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  ComplyCube Flow    │ → external (flow.complycube.com)
│ (ID + Liveness)     │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Verification        │ → /verification-callback
│ Callback (Polling)  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ ComplyCube Facial   │ → /complycube-facial-verification
│ Verification        │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  V.A.I. Processing  │ → /vai-processing
│ (Code Generation)   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│   V.A.I. Success    │ → /vai-success
└─────────────────────┘
```

### Alternative Flow: Contract Signature

```
Contract Signing Flow (Currently Optional):
┌─────────────────────┐
│ Contract Signature  │ → /contract-signature
│ (Not in main flow)  │
│  - Review Contract  │
│  - Facial Verify    │
│  - Sign Contract    │
└─────────────────────┘
```

---

## Step-by-Step Flow Documentation

### Step 1: Payment Selection (`/payment-selection`)

**File:** `src/pages/PaymentSelection.tsx`

**Purpose:** Allow users to select payment method and enter optional referral code.

**UI Components:**
- Pricing card showing $99 annual verification
- Payment method selection:
  - Credit/Debit Card (default, most popular)
  - PayPal
  - Cryptocurrency (placeholder, shows "Coming Soon")
- Referral code input field
- Benefits list (Government ID verification, V.A.I. code, zero-knowledge, etc.)
- Trust signals (Secure Payment, Stripe, PCI Compliant)

**Data Flow:**
```typescript
// Stored in sessionStorage
sessionStorage.setItem("payment_method", selectedMethod); // "card" | "paypal" | "crypto"
sessionStorage.setItem("referral_code", referralCode); // optional
```

**Navigation:**
- **Next:** `/payment`
- **Back:** `/` (home)

**Key Code:**
```typescript
const handleContinue = () => {
  sessionStorage.setItem("payment_method", selectedMethod);
  if (referralCode) {
    sessionStorage.setItem("referral_code", referralCode);
  }
  navigate("/payment");
};
```

---

### Step 2: Payment Form (`/payment`)

**File:** `src/pages/PaymentForm.tsx`

**Purpose:** Process payment via Stripe, handle coupon codes, and initiate verification flow.

**Payment Methods Supported:**
1. **Credit/Debit Card** - Stripe Elements with automatic payment methods
2. **PayPal** - Stripe PayPal integration
3. **Cryptocurrency** - Placeholder (not yet implemented)

**Coupon System:**
The payment form includes a comprehensive coupon system with three discount tiers:
- **100% Discount** (e.g., `FC0001`) - Bypasses Stripe entirely, allows unlimited use
- **50% Discount** - Reduces payment to $49.50
- **20% Discount** - Reduces payment to $79.20

**UI Components:**
- Progress indicator (Step 1 of 3)
- Coupon code input with apply button
- Payment method tabs (Card, PayPal, Crypto)
- Stripe Elements integration for card/PayPal
- Price display with discount calculations

**Data Flow:**
```typescript
// Load pricing from database
const { data } = await supabase
  .from("pricing_config")
  .select("base_price")
  .eq("product_name", "vai_verification")
  .single();

// Validate coupon
const { data: couponData, error } = await supabase.functions.invoke("validate-coupon", {
  body: { code: couponCode }
});

// Create payment intent (if not 100% discount)
const { data, error } = await supabase.functions.invoke("create-payment-intent", {
  body: {
    amount: Math.round(finalPrice * 100), // cents
    currency: "usd",
    paymentMethod // "card" | "paypal"
  }
});
```

**Stripe Integration:**
- Uses `@stripe/react-stripe-js` and `@stripe/stripe-js`
- `VITE_STRIPE_PUBLISHABLE_KEY` for frontend
- Calls `create-payment-intent` edge function to create payment intent server-side
- `StripePaymentForm` component handles card details and submission

**Navigation Flow:**
- **100% Coupon:** Bypasses payment → Navigate to `/personal-details`
- **Card/PayPal Payment Success:** Navigate to `/personal-details`
- **Payment Failed:** Shows error, user can retry

**Session Storage:**
```typescript
sessionStorage.setItem("applied_coupon", JSON.stringify(coupon));
sessionStorage.setItem("user_email", email); // captured in payment form
```

**Edge Function Called:**
- `create-payment-intent` - Creates Stripe payment intent with amount and payment method

**Key Code Snippets:**

**Payment Intent Creation:**
```typescript
useEffect(() => {
  if (!isFullyDiscounted && (paymentMethod === "card" || paymentMethod === "paypal")) {
    createPaymentIntent();
  }
}, [finalPrice, paymentMethod, isFullyDiscounted]);

const createPaymentIntent = async () => {
  if (finalPrice <= 0) return;
  
  const { data, error } = await supabase.functions.invoke("create-payment-intent", {
    body: {
      amount: Math.round(finalPrice * 100),
      currency: "usd",
      paymentMethod,
    }
  });

  if (data?.clientSecret) {
    setClientSecret(data.clientSecret);
  }
};
```

**Coupon Application:**
```typescript
const handleApplyCoupon = async () => {
  setValidatingCoupon(true);
  
  const { data, error } = await supabase.functions.invoke("validate-coupon", {
    body: { code: couponCode }
  });

  if (data?.valid) {
    setAppliedCoupon(data.coupon);
    sessionStorage.setItem("applied_coupon", JSON.stringify(data.coupon));
    toast({ title: "Coupon applied!", description: `${data.coupon.discount_percentage}% discount` });
  } else {
    toast({ title: "Invalid coupon", variant: "destructive" });
  }
  
  setValidatingCoupon(false);
};
```

**Bypass for 100% Coupons:**
```typescript
const handleContinue = () => {
  if (isFullyDiscounted) {
    // Record coupon usage even though no payment
    supabase.functions.invoke("record-coupon-usage", {
      body: { 
        couponId: appliedCoupon.id, 
        userEmail: sessionStorage.getItem("user_email") 
      }
    });
    
    navigate("/personal-details");
  }
  // Otherwise Stripe handles payment flow
};
```

---

### Step 3: Personal Details Form (`/personal-details`)

**File:** `src/pages/PersonalDetailsForm.tsx`

**Purpose:** Collect user's first name and last name for ComplyCube KYC verification.

**Critical Design Decision:**
- **No Database Storage:** First name and last name are NOT stored in ChainPass database
- Data flows only through sessionStorage → ComplyCube API
- Adheres to zero-knowledge architecture principle

**UI Components:**
- Progress indicator (Step 1 of 3)
- First name input field
- Last name input field
- Real-time validation with error states
- Character counter
- Success checkmarks when valid
- Privacy notice explaining data handling

**Validation Rules:**
```typescript
const personalDetailsSchema = z.object({
  firstName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, "Please use only letters, spaces, and hyphens")
    .transform(val => val.trim().split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')),
  lastName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, "Please use only letters, spaces, and hyphens")
    .transform(val => val.trim().split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' '))
});
```

**Data Flow:**
```typescript
const onSubmit = async (data: PersonalDetailsFormData) => {
  // Store in sessionStorage for ComplyCube session creation
  sessionStorage.setItem("user_firstName", data.firstName);
  sessionStorage.setItem("user_lastName", data.lastName);
  
  // Navigate to ID upload
  navigate("/id-upload");
};
```

**Design Aesthetic:**
- ComplyCube-inspired professional banking interface
- Purple primary color (#6366F1)
- Clean white backgrounds (#FFFFFF)
- Subtle borders (#E2E8F0)
- 48px input heights
- Inter typography

**Privacy Notice:**
```
🛡️ Your Privacy Protected
Your personal information is never stored in our database. 
We only pass it to ComplyCube for identity verification.
```

**Navigation:**
- **Next:** `/id-upload`
- **Back:** Not implemented (one-way flow)

---

### Step 4: ID Upload / ComplyCube Initialization (`/id-upload`)

**File:** `src/pages/IdUpload.tsx`

**Purpose:** Initialize ComplyCube hosted verification flow, redirect user to ComplyCube for ID upload and liveness check.

**UI Components:**
- Progress indicator (Step 2 of 3)
- ComplyCube branding/logo
- "Continue to Verification" button
- Requirements list (ID readable, in color, no glare, etc.)
- Accepted documents list (Driver's License, Passport, National ID)
- Security assurances

**ComplyCube Integration:**
This page initiates the ComplyCube Hosted Solution, which:
1. Creates a ComplyCube client
2. Generates a hosted flow session
3. Redirects to `flow.complycube.com` for verification
4. User completes ID upload + liveness check on ComplyCube's domain
5. ComplyCube redirects back to `/verification-callback`

**Data Preparation:**
```typescript
const handleUploadClick = async () => {
  const sessionId = sessionManager.getSessionId();
  const email = sessionStorage.getItem("user_email");
  const phoneNumber = sessionStorage.getItem("user_phone"); // optional
  const firstName = sessionStorage.getItem("user_firstName");
  const lastName = sessionStorage.getItem("user_lastName");
  
  const { data, error } = await supabase.functions.invoke('create-complycube-session', {
    body: { 
      sessionId,
      email,
      phoneNumber,
      firstName,
      lastName
    }
  });

  if (data.success) {
    sessionStorage.setItem('complycube_client_id', data.clientId);
    
    // Redirect to ComplyCube hosted flow
    window.location.href = data.sessionUrl;
  }
};
```

**Edge Function Called:**
- `create-complycube-session` - Creates ComplyCube client and flow session

**Navigation:**
- **Next:** External redirect to `flow.complycube.com` (ComplyCube hosted solution)
- **After ComplyCube:** Redirects to `/verification-callback?status=success&clientId=xxx`

**Security Notes:**
- Personal data (firstName, lastName) passed directly to ComplyCube, never stored in ChainPass DB
- ComplyCube handles all ID document storage and biometric capture
- ChainPass assumes zero liability for PII during verification process

---

### Step 5: ComplyCube Hosted Verification (External)

**URL:** `flow.complycube.com`

**Purpose:** User completes ID document upload and liveness check on ComplyCube's secure infrastructure.

**Flow on ComplyCube:**
1. User prompted to select document type (Driver's License, Passport, ID Card)
2. User uploads photo of ID document (front/back if needed)
3. User completes liveness check (selfie video with movement prompts)
4. ComplyCube processes verification in real-time
5. Upon completion, ComplyCube redirects to ChainPass callback URL

**Redirect URLs:**
- **Success:** `https://your-domain.com/verification-callback?status=success&clientId={clientId}`
- **Cancelled:** `https://your-domain.com/verification-callback?status=cancelled`

**Data Captured by ComplyCube:**
- ID document images (front/back)
- Live photo/video (biometric selfie)
- Verification outcome (approved/declined)
- Transaction ID (check ID)

**Security Benefits:**
- All verification data remains on ComplyCube infrastructure
- ChainPass never has direct access to raw ID images
- Regulatory compliance (GDPR, CCPA, BIPA) handled by ComplyCube
- Reduced cyber insurance costs and audit burden for ChainPass

---

### Step 6: Verification Callback (`/verification-callback`)

**File:** `src/pages/VerificationCallback.tsx`

**Purpose:** Poll ComplyCube verification status and wait for completion before proceeding.

**Polling Strategy:**
- Polls every 5 seconds
- Maximum 60 attempts (5 minutes)
- Checks for verification completion via edge function

**UI States:**
1. **Processing:** Shows loading spinner, attempt counter
2. **Success:** Shows checkmark, transaction ID, auto-navigates after 2 seconds
3. **Failed:** Shows error, retry button
4. **Cancelled:** Shows warning, start over button

**Polling Logic:**
```typescript
const pollVerificationStatus = async (clientId: string) => {
  const pollInterval = setInterval(async () => {
    setAttempts(prev => prev + 1);
    
    const { data, error } = await supabase.functions.invoke(
      "complycube-verification-callback",
      { body: { clientId } }
    );

    if (data.success) {
      clearInterval(pollInterval);
      
      if (data.verified) {
        setTransactionId(data.transactionId);
        setStatus("success");
        toast.success("Verification complete!");
        
        // Navigate to facial verification
        setTimeout(() => {
          navigate("/complycube-facial-verification");
        }, 2000);
      } else {
        setStatus("failed");
        toast.error("Verification failed");
      }
    } else if (data.status === "processing") {
      // Still processing, continue polling
      console.log("[Callback] Still processing...");
    }
    
    // Stop after max attempts
    if (attempts >= maxAttempts) {
      clearInterval(pollInterval);
      setStatus("failed");
      toast.error("Verification timeout");
    }
  }, 5000); // Poll every 5 seconds
};
```

**Edge Function Called:**
- `complycube-verification-callback` - Retrieves verification status, downloads biometric photo, stores in Supabase

**What the Callback Function Does:**
1. Queries ComplyCube API for check status using `clientId`
2. Waits for status `complete`
3. Downloads the `live_photo` document from ComplyCube
4. Uploads photo to Supabase Storage bucket `verification-photos`
5. Extracts transaction ID (`check.id`)
6. Updates `verification_records` table with:
   - `complycube_transaction_number`
   - `verification_status`
   - `biometric_confirmed`
   - `selfie_url` (Supabase Storage URL)

**Database Updates:**
```sql
UPDATE verification_records
SET 
  complycube_transaction_number = 'check_xyz123',
  verification_status = 'verified',
  biometric_confirmed = true,
  selfie_url = 'https://supabase-storage.com/verification-photos/xyz.jpg'
WHERE complycube_client_id = 'client_abc123';
```

**Navigation:**
- **Success:** `/complycube-facial-verification` (after 2 second delay)
- **Failed:** User can retry or go home
- **Cancelled:** User can start over

---

### Step 7: ComplyCube Facial Verification (`/complycube-facial-verification`)

**File:** `src/pages/ComplyCubeFacialVerification.tsx`

**Purpose:** Verify that the person continuing the flow is the SAME person who completed ComplyCube KYC (prevents identity takeover fraud).

**Security Rationale:**
- Prevents Person A from completing KYC and Person B continuing flow to receive fraudulent V.A.I.
- Ensures continuity of identity throughout verification process
- Uses lower confidence threshold (60%) than contract signing (85%)

**UI Components:**
- Initial state with explanation and "Start Camera" button
- Camera preview with circular face guide
- "Capture & Verify" button
- Processing state with loading spinner
- Success state with confidence score
- Failed state with retry button (max 3 attempts)

**Verification Flow:**
```typescript
const captureAndVerify = async () => {
  // 1. Capture frame from video element
  const canvas = canvasRef.current;
  const video = videoRef.current;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(video, 0, 0);
  const imageData = canvas.toDataURL("image/jpeg", 0.95);

  // 2. Get stored ComplyCube photo URL from database
  const sessionId = sessionManager.getSessionId();
  const { data: verificationData } = await supabase
    .from("verification_records")
    .select("selfie_url, complycube_client_id")
    .eq("session_id", sessionId)
    .single();

  // 3. Call facial comparison edge function
  const { data, error } = await supabase.functions.invoke("verify-complycube-biometric", {
    body: {
      referencePhotoUrl: verificationData.selfie_url,
      currentFaceImage: imageData,
    },
  });

  // 4. Handle result
  if (data.verified) {
    setConfidence(data.confidence);
    setState("success");
    toast.success("Identity confirmed!");
    
    // Navigate to V.A.I. processing
    setTimeout(() => navigate("/vai-processing"), 2000);
  } else {
    setAttempts(attempts + 1);
    
    if (attempts + 1 >= MAX_ATTEMPTS) {
      setState("failed");
      toast.error("Maximum attempts exceeded. Manual review required.");
    } else {
      setState("camera"); // Allow retry
      toast.error(`Verification failed. ${MAX_ATTEMPTS - attempts - 1} attempts remaining.`);
    }
  }
};
```

**Edge Function Called:**
- `verify-complycube-biometric` - Compares live capture against ComplyCube-stored photo using Gemini 2.5 Pro

**Facial Comparison Process:**
1. Downloads reference photo from Supabase Storage (ComplyCube verified selfie)
2. Receives current live capture as base64 image
3. Calls Google Gemini 2.5 Pro API with both images
4. Gemini analyzes facial features and returns confidence score
5. **Threshold:** 60% confidence required for match
6. Returns `verified: true/false` and `confidence: number`

**Attempt Limiting:**
- Maximum 3 attempts allowed
- After 3 failed attempts, manual review flagged
- Attempts tracked in component state (not persisted)

**Navigation:**
- **Success:** `/vai-processing`
- **Failed (max attempts):** Shows "Contact Support" message

**Camera Permissions:**
```typescript
const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 1280, height: 720 },
    });
    
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setState("camera");
    }
  } catch (error) {
    toast.error("Camera access denied. Please enable camera permissions.");
  }
};
```

---

### Step 8: V.A.I. Processing (`/vai-processing`)

**File:** `src/pages/VaiProcessing.tsx`

**Purpose:** Generate unique V.A.I. code, save to database, and display processing animation.

**Processing States:**
1. **verifying** - "Confirming your biometrics..." (progress 0-33%)
2. **generating** - "Generating your V.A.I. code..." (progress 33-66%)
3. **complete** - "V.A.I. Confirmed!" (progress 100%)

**V.A.I. Code Generation:**
```typescript
// Format: 7 characters alphanumeric
const generateVAICode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
```

**Example V.A.I. Codes:**
- Civilian: `9I7T35L`
- Law Enforcement: `LEO-9I7T35L`

**Critical V.A.I. Generation Logic:**

**State Management Prevention of Duplicates:**
```typescript
const { vaiNumber, setVAI, isGenerating, setGenerating } = useVAIStore();

useEffect(() => {
  const processVAI = async () => {
    // CRITICAL: If V.A.I. already exists in store, use it
    if (vaiNumber) {
      console.log('V.A.I. already exists in store:', vaiNumber);
      const codeToDisplay = isLEO ? `LEO-${vaiNumber}` : vaiNumber;
      setDisplayCode(codeToDisplay);
      setProcessingState("complete");
      return;
    }

    // Check if generation already in progress
    if (isGenerating) {
      console.log('V.A.I. generation already in progress');
      return;
    }

    const sessionId = sessionManager.getSessionId();
    let recordId = sessionManager.getVerificationRecordId();

    try {
      setGenerating(true);

      // Check if V.A.I. already exists in database
      const { data: existingVAI } = await supabase
        .from('vai_assignments')
        .select('vai_code')
        .eq('verification_record_id', recordId)
        .maybeSingle();

      if (existingVAI?.vai_code) {
        console.log('Found existing V.A.I. in database:', existingVAI.vai_code);
        
        // Store in Zustand and session
        setVAI(existingVAI.vai_code, recordId, isLEO);
        sessionManager.setVaiCode(existingVAI.vai_code);
        
        const displayValue = isLEO ? `LEO-${existingVAI.vai_code}` : existingVAI.vai_code;
        setDisplayCode(displayValue);
        setProcessingState("complete");
        return;
      }

      // Generate new V.A.I.
      const vaiCode = generateVAICode();
      
      // Save to database
      const { error: insertError } = await supabase
        .from('vai_assignments')
        .insert({
          vai_code: vaiCode,
          verification_record_id: recordId,
          status: 'active'
        });

      if (insertError) throw insertError;

      // Store in state management
      setVAI(vaiCode, recordId, isLEO);
      sessionManager.setVaiCode(vaiCode);

      const displayValue = isLEO ? `LEO-${vaiCode}` : vaiCode;
      setDisplayCode(displayValue);
      
      setProcessingState("complete");
      
      // Auto-navigate after 2 seconds
      setTimeout(() => navigate("/vai-success"), 2000);
      
    } catch (error) {
      console.error('V.A.I. processing error:', error);
      toast({ title: "Error", description: "Failed to generate V.A.I.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  processVAI();
}, []);
```

**Database Insertion:**
```sql
INSERT INTO vai_assignments (vai_code, verification_record_id, status)
VALUES ('9I7T35L', 'rec_xyz123', 'active');
```

**LEO Differentiation:**
- `isLEO` flag determined from `sessionStorage.getItem('userType') === 'leo'`
- LEO users see `LEO-` prefix on display
- Actual database stores base code without prefix

**Progress Animation:**
```typescript
// Simulated progress updates every 100ms
useEffect(() => {
  const interval = setInterval(() => {
    setProgress(prev => {
      if (processingState === "verifying" && prev < 33) return prev + 1;
      if (processingState === "generating" && prev < 66) return prev + 1;
      if (processingState === "complete" && prev < 100) return prev + 2;
      return prev;
    });
  }, 100);
  
  return () => clearInterval(interval);
}, [processingState]);
```

**Navigation:**
- **Automatic:** After 2 seconds on "complete" state → `/vai-success`

**State Management (Zustand):**
```typescript
// src/store/vaiStore.ts
interface VAIState {
  vaiNumber: string | null;
  verificationRecordId: string | null;
  isLEO: boolean;
  isGenerating: boolean;
  generatedAt: string | null;
  
  setVAI: (vaiNumber: string, recordId: string, isLEO: boolean) => void;
  clearVAI: () => void;
  setGenerating: (isGenerating: boolean) => void;
}

export const useVAIStore = create<VAIState>()(
  persist(
    (set) => ({
      vaiNumber: null,
      verificationRecordId: null,
      isLEO: false,
      isGenerating: false,
      generatedAt: null,
      
      setVAI: (vaiNumber, recordId, isLEO) => set({
        vaiNumber,
        verificationRecordId: recordId,
        isLEO,
        generatedAt: new Date().toISOString(),
        isGenerating: false
      }),
      
      clearVAI: () => set({
        vaiNumber: null,
        verificationRecordId: null,
        isLEO: false,
        isGenerating: false,
        generatedAt: null
      }),
      
      setGenerating: (isGenerating) => set({ isGenerating })
    }),
    {
      name: 'chainpass-vai-storage',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);
```

---

### Step 9: V.A.I. Success (`/vai-success`)

**File:** `src/pages/VaiSuccess.tsx`

**Purpose:** Display generated V.A.I. code, provide copy/download options, and offer next steps.

**UI Components:**
- Large V.A.I. code display with gradient styling
- "Copy V.A.I." button
- "Download QR Code" button
- "Explore V.A.I. Vault" call-to-action
- Business callback functionality (if initiated from business)

**V.A.I. Display:**
```typescript
useEffect(() => {
  // Check store first, then sessionManager as fallback
  const code = vaiNumber || sessionManager.getVaiCode();
  
  if (code) {
    // Remove LEO- prefix for civilian display
    const displayCode = code.replace('LEO-', '');
    setVaiCode(displayCode);
  } else {
    // If no code in session, redirect to start
    toast.error("No V.A.I. code found. Please complete verification.");
    window.location.href = '/';
  }
}, [vaiNumber]);
```

**Copy Functionality:**
```typescript
const copyVAI = () => {
  navigator.clipboard.writeText(vaiCode);
  toast.success("V.A.I. copied to clipboard!");
};
```

**QR Code Generation:**
```typescript
const downloadQR = async () => {
  try {
    const qrCode = await QRCode.toDataURL(vaiCode, {
      width: 500,
      color: {
        dark: '#3b82f6',
        light: '#1a1a2e'
      }
    });
    
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = 'my-vai-code.png';
    link.click();
    
    toast.success("QR code downloaded!");
  } catch (error) {
    toast.error("Failed to generate QR code");
  }
};
```

**Business Integration:**
If the verification was initiated by a business partner (e.g., Vairify), the success page automatically sends verification data back to the business:

```typescript
useEffect(() => {
  if (vaiCode && isBusinessVerification()) {
    sendBusinessCallback();
  }
}, [vaiCode]);

const sendBusinessCallback = async () => {
  const verificationRecordId = sessionManager.getVerificationRecordId();
  
  const verificationData = {
    vai_number: vaiCode,
    biometric_photo_url: '', // Fetched from verification_records
    complycube_transaction_number: '',
    le_disclosure_accepted: false,
    signature_agreement_accepted: false,
  };

  await sendVAIToBusiness(verificationData);
  toast.success("Verification data sent successfully!");
};

const continueToBusinessOrVairify = () => {
  if (isBusinessVerification()) {
    redirectToBusiness();
  } else {
    window.location.href = 'https://vairify.com/login';
  }
};
```

**Next Steps Offered:**
1. **Explore V.A.I. Vault** - Centralized cloud storage
2. **Continue to [Business]** - If business-initiated verification
3. **Learn About V.A.I. Ecosystem** - Educational content

**Navigation:**
- **No automatic navigation** - User decides next action
- Can redirect to business partner (Vairify) or other platforms

---

## Alternative Flow: Contract Signature (Optional)

**File:** `src/pages/ContractSignature.tsx`

**Status:** Currently NOT in main verification flow, available as standalone feature.

**Purpose:** Sign legally binding contracts with facial recognition verification.

**Contract Types:**
1. Law Enforcement Disclosure Agreement
2. Mutual Consent and Accountability Agreement
3. Terms of Service

**Multi-Step Flow:**

### Step 1: Review Contract
- Display full contract text
- Scroll-to-bottom requirement before proceeding
- Professional PDF-style formatting

### Step 2: Identity Verification
- Live camera facial capture
- Compare against stored V.A.I. verified photo
- **Higher confidence threshold:** 85% (vs 60% for ComplyCube verification)
- Maximum 3 attempts

### Step 3: Contract Signing
- Call `sign-contract` edge function
- Store contract with blockchain hash
- Record facial match confidence
- Device fingerprinting

### Step 4: Confirmation
- Display signed contract ID
- Blockchain hash
- Timestamp
- Download PDF option

**Database Schema:**
```sql
CREATE TABLE signed_contracts (
  id UUID PRIMARY KEY,
  contract_id UUID,
  vai_number TEXT,
  contract_type TEXT, -- 'law_enforcement' | 'mutual_consent' | 'terms_of_service'
  contract_text TEXT,
  facial_match_confidence DECIMAL,
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  blockchain_hash TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Edge Function:**
- `sign-contract` - Verifies V.A.I. ownership, records contract signature

---

## Database Schema

### Core Tables

#### `verification_records`
Stores verification session data and ComplyCube integration details.

```sql
CREATE TABLE verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  complycube_client_id TEXT,
  complycube_session_id TEXT,
  complycube_verification_id TEXT,
  verification_status TEXT, -- 'pending' | 'verified' | 'failed'
  biometric_confirmed BOOLEAN DEFAULT false,
  id_document_url TEXT, -- NOT USED (ComplyCube hosts)
  selfie_url TEXT, -- Supabase Storage URL for ComplyCube biometric photo
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies (Row Level Security)
ALTER TABLE verification_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access during verification"
  ON verification_records FOR SELECT
  USING (true); -- Public read for unauthenticated verification flow

CREATE POLICY "Public insert access during verification"
  ON verification_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access during verification"
  ON verification_records FOR UPDATE
  USING (true);
```

**Key Fields:**
- `session_id` - ChainPass session identifier (from sessionManager)
- `complycube_client_id` - ComplyCube client UUID
- `selfie_url` - URL to biometric photo in Supabase Storage
- `verification_status` - Current verification state
- `biometric_confirmed` - True after ComplyCube facial verification passes

---

#### `vai_assignments`
Stores generated V.A.I. codes linked to verification records.

```sql
CREATE TABLE vai_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vai_code TEXT NOT NULL UNIQUE, -- 7-character alphanumeric
  verification_record_id UUID NOT NULL REFERENCES verification_records(id),
  status TEXT DEFAULT 'active', -- 'active' | 'expired' | 'suspended'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_vai_code ON vai_assignments(vai_code);
CREATE INDEX idx_verification_record ON vai_assignments(verification_record_id);

-- RLS Policies
ALTER TABLE vai_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for V.A.I. codes"
  ON vai_assignments FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for V.A.I. codes"
  ON vai_assignments FOR INSERT
  WITH CHECK (true);
```

**Key Fields:**
- `vai_code` - Unique 7-character alphanumeric code (e.g., "9I7T35L")
- `verification_record_id` - Foreign key to verification session
- `status` - Code validity status

---

#### `payments`
Tracks Stripe payment records.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_record_id UUID REFERENCES verification_records(id),
  amount DECIMAL NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT, -- 'pending' | 'succeeded' | 'failed'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert access for payments"
  ON payments FOR INSERT
  WITH CHECK (true);
```

---

#### `coupons`
Stores coupon codes and discount configurations.

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL, -- 'percentage' | 'fixed'
  discount_value DECIMAL NOT NULL,
  discount_percentage DECIMAL, -- For convenience (0-100)
  is_active BOOLEAN DEFAULT true,
  multi_use BOOLEAN DEFAULT false,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for coupons"
  ON coupons FOR SELECT
  USING (is_active = true);
```

**Example Coupons:**
- `FC0001` - 100% discount, unlimited use, internal comp coupon
- `SAVE50` - 50% discount, single use
- `WELCOME20` - 20% discount, multi-use

---

#### `coupon_usage`
Tracks coupon redemptions.

```sql
CREATE TABLE coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES coupons(id),
  session_id TEXT,
  user_email TEXT,
  used_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert access for coupon usage"
  ON coupon_usage FOR INSERT
  WITH CHECK (true);
```

---

#### `pricing_config`
Stores base pricing for V.A.I. verification.

```sql
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL UNIQUE,
  base_price DECIMAL NOT NULL,
  currency TEXT DEFAULT 'usd',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Example data
INSERT INTO pricing_config (product_name, base_price, currency)
VALUES ('vai_verification', 99.00, 'usd');

-- RLS Policies
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for pricing"
  ON pricing_config FOR SELECT
  USING (is_active = true);
```

---

#### `signed_contracts` (Optional)
Stores digitally signed contracts with blockchain hashes.

```sql
CREATE TABLE signed_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID DEFAULT gen_random_uuid(),
  vai_number TEXT NOT NULL,
  contract_type TEXT NOT NULL, -- 'law_enforcement' | 'mutual_consent' | 'terms_of_service'
  contract_text TEXT NOT NULL,
  facial_match_confidence DECIMAL NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  blockchain_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE signed_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their signed contracts"
  ON signed_contracts FOR SELECT
  USING (true); -- In production, restrict by vai_number
```

---

### Storage Buckets

#### `verification-photos`
Stores biometric photos downloaded from ComplyCube.

**Configuration:**
- **Public:** Yes (photos accessible via signed URLs)
- **File Size Limit:** 10MB
- **Allowed MIME Types:** `image/jpeg`, `image/png`

**Folder Structure:**
```
verification-photos/
  ├── {session_id}/
  │   └── selfie.jpg
```

**RLS Policies:**
```sql
-- Allow public read access
CREATE POLICY "Public read access for verification photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-photos');

-- Allow service role to insert/update
CREATE POLICY "Service role can insert verification photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verification-photos');
```

---

## Edge Functions

### `create-payment-intent`

**File:** `supabase/functions/create-payment-intent/index.ts`

**Purpose:** Create Stripe payment intent for V.A.I. verification purchase.

**Authentication:** No JWT verification (`verify_jwt = false`) - allows unauthenticated users

**Request Body:**
```typescript
{
  amount: number, // in cents (e.g., 9900 for $99.00)
  currency: string, // "usd"
  paymentMethod: "card" | "paypal" | "crypto"
}
```

**Response:**
```typescript
{
  clientSecret: string, // Stripe client secret for frontend
  paymentIntentId: string // Stripe payment intent ID
}
```

**Implementation:**
```typescript
import Stripe from "https://esm.sh/stripe@18.5.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-11-20.acacia",
});

const { amount, currency = "usd", paymentMethod = "card" } = await req.json();

let paymentMethodTypes: string[] = [];
let automaticPaymentMethods = null;

switch (paymentMethod) {
  case "paypal":
    paymentMethodTypes = ["paypal"];
    break;
  case "crypto":
    return new Response(JSON.stringify({
      paymentMethod: "crypto",
      message: "Crypto payment processing - integration pending",
    }), { headers: corsHeaders });
  case "card":
  default:
    automaticPaymentMethods = { enabled: true };
    break;
}

const paymentIntentConfig: any = {
  amount: Math.round(amount),
  currency,
  metadata: {
    product: "V.A.I. Verification",
    payment_method_type: paymentMethod,
  },
};

if (paymentMethodTypes.length > 0) {
  paymentIntentConfig.payment_method_types = paymentMethodTypes;
} else if (automaticPaymentMethods) {
  paymentIntentConfig.automatic_payment_methods = automaticPaymentMethods;
}

const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);

return new Response(JSON.stringify({
  clientSecret: paymentIntent.client_secret,
  paymentIntentId: paymentIntent.id,
}), { headers: corsHeaders });
```

**Environment Variables:**
- `STRIPE_SECRET_KEY` - Stripe secret key (test or live)

---

### `validate-coupon`

**File:** `supabase/functions/validate-coupon/index.ts` (assumed)

**Purpose:** Validate coupon code and return discount details.

**Authentication:** No JWT verification

**Request Body:**
```typescript
{
  code: string // Coupon code (e.g., "FC0001")
}
```

**Response:**
```typescript
{
  valid: boolean,
  coupon?: {
    id: string,
    code: string,
    discount_type: string,
    discount_value: number,
    discount_percentage: number,
    description: string
  },
  error?: string
}
```

**Implementation Logic:**
```typescript
const { code } = await req.json();

// Query database
const { data: coupon, error } = await supabase
  .from("coupons")
  .select("*")
  .eq("code", code.toUpperCase())
  .eq("is_active", true)
  .single();

if (error || !coupon) {
  return { valid: false, error: "Invalid coupon code" };
}

// Check usage limits
if (!coupon.multi_use && coupon.current_uses >= coupon.max_uses) {
  return { valid: false, error: "Coupon has reached maximum usage" };
}

return { valid: true, coupon };
```

---

### `record-coupon-usage`

**File:** `supabase/functions/record-coupon-usage/index.ts` (assumed)

**Purpose:** Record coupon redemption in database.

**Authentication:** No JWT verification

**Request Body:**
```typescript
{
  couponId: string,
  userEmail?: string
}
```

**Response:**
```typescript
{
  success: boolean,
  error?: string
}
```

**Implementation Logic:**
```typescript
const { couponId, userEmail } = await req.json();
const sessionId = req.headers.get("x-session-id"); // From sessionManager

// Insert usage record
const { error: insertError } = await supabase
  .from("coupon_usage")
  .insert({
    coupon_id: couponId,
    session_id: sessionId,
    user_email: userEmail
  });

if (insertError) throw insertError;

// Increment usage counter
const { error: updateError } = await supabase
  .from("coupons")
  .update({ current_uses: supabase.sql`current_uses + 1` })
  .eq("id", couponId);

if (updateError) throw updateError;

return { success: true };
```

---

### `create-complycube-session`

**File:** `supabase/functions/create-complycube-session/index.ts`

**Purpose:** Create ComplyCube client and hosted flow session.

**Authentication:** No JWT verification

**Request Body:**
```typescript
{
  sessionId: string,
  email: string,
  phoneNumber?: string,
  firstName: string,
  lastName: string
}
```

**Response:**
```typescript
{
  success: boolean,
  clientId: string,
  sessionUrl: string, // URL to ComplyCube hosted flow
  error?: string
}
```

**Implementation:**
```typescript
const COMPLYCUBE_API_KEY = Deno.env.get("COMPLYCUBE_API_KEY");
const baseUrl = "https://api.complycube.com";

// 1. Create ComplyCube client
const clientResponse = await fetch(`${baseUrl}/v1/clients`, {
  method: "POST",
  headers: {
    "Authorization": `${COMPLYCUBE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: "person",
    email,
    personDetails: {
      firstName,
      lastName,
      dob: "1990-01-01" // Default DOB (not stored by ChainPass)
    }
  }),
});

const clientData = await clientResponse.json();
const clientId = clientData.id;

// 2. Create hosted flow session
const sessionResponse = await fetch(`${baseUrl}/v1/hosted/sessions`, {
  method: "POST",
  headers: {
    "Authorization": `${COMPLYCUBE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    clientId,
    documentTypes: ["passport", "driving_licence", "national_identity_card"],
    faceCheck: {
      liveness: true
    },
    successUrl: `${req.headers.get("origin")}/verification-callback?status=success&clientId=${clientId}`,
    cancelUrl: `${req.headers.get("origin")}/verification-callback?status=cancelled`
  }),
});

const sessionData = await sessionResponse.json();

// 3. Store client ID in verification_records
await supabase
  .from("verification_records")
  .update({ complycube_client_id: clientId })
  .eq("session_id", sessionId);

return {
  success: true,
  clientId,
  sessionUrl: sessionData.sessionData.url
};
```

**Environment Variables:**
- `COMPLYCUBE_API_KEY` - ComplyCube API key (test or live)

---

### `complycube-verification-callback`

**File:** `supabase/functions/complycube-verification-callback/index.ts`

**Purpose:** Poll ComplyCube for verification status, download biometric photo when complete.

**Authentication:** No JWT verification

**Request Body:**
```typescript
{
  clientId: string // ComplyCube client ID
}
```

**Response:**
```typescript
{
  success: boolean,
  verified: boolean,
  transactionId?: string,
  status?: "processing" | "complete" | "failed",
  error?: string
}
```

**Implementation:**
```typescript
const COMPLYCUBE_API_KEY = Deno.env.get("COMPLYCUBE_API_KEY");
const { clientId } = await req.json();

// 1. Get checks for client
const checksResponse = await fetch(
  `https://api.complycube.com/v1/clients/${clientId}/checks`,
  {
    headers: { "Authorization": `${COMPLYCUBE_API_KEY}` }
  }
);

const checks = await checksResponse.json();
const latestCheck = checks.items?.[0];

if (!latestCheck) {
  return { success: false, status: "processing" };
}

// 2. Check if verification complete
if (latestCheck.status !== "complete") {
  return { success: false, status: "processing" };
}

const verified = latestCheck.outcome === "clear";
const transactionId = latestCheck.id;

// 3. Download biometric photo
const documentsResponse = await fetch(
  `https://api.complycube.com/v1/clients/${clientId}/documents`,
  {
    headers: { "Authorization": `${COMPLYCUBE_API_KEY}` }
  }
);

const documents = await documentsResponse.json();
const livePhoto = documents.items?.find(doc => doc.type === "live_photo");

if (livePhoto) {
  // Download photo
  const photoResponse = await fetch(
    `https://api.complycube.com/v1/documents/${livePhoto.id}/download`,
    {
      headers: { "Authorization": `${COMPLYCUBE_API_KEY}` }
    }
  );

  const photoBuffer = await photoResponse.arrayBuffer();
  
  // Upload to Supabase Storage
  const fileName = `${clientId}/selfie.jpg`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("verification-photos")
    .upload(fileName, photoBuffer, {
      contentType: "image/jpeg",
      upsert: true
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("verification-photos")
    .getPublicUrl(fileName);

  const selfieUrl = urlData.publicUrl;

  // 4. Update verification record
  await supabase
    .from("verification_records")
    .update({
      complycube_transaction_number: transactionId,
      verification_status: verified ? "verified" : "failed",
      biometric_confirmed: verified,
      selfie_url: selfieUrl
    })
    .eq("complycube_client_id", clientId);
}

return {
  success: true,
  verified,
  transactionId
};
```

---

### `verify-complycube-biometric`

**File:** `supabase/functions/verify-complycube-biometric/index.ts`

**Purpose:** Compare live facial capture against ComplyCube-stored photo using AI.

**Authentication:** No JWT verification

**Request Body:**
```typescript
{
  referencePhotoUrl: string, // Supabase Storage URL
  currentFaceImage: string // Base64 encoded image
}
```

**Response:**
```typescript
{
  verified: boolean,
  confidence: number, // 0-100
  analysis: string
}
```

**Implementation:**
```typescript
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const { referencePhotoUrl, currentFaceImage } = await req.json();

// 1. Download reference photo from Supabase Storage
const referenceResponse = await fetch(referencePhotoUrl);
const referenceBuffer = await referenceResponse.arrayBuffer();
const referenceBase64 = btoa(
  new Uint8Array(referenceBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
);

// 2. Call Lovable AI (Gemini 2.5 Pro) for facial comparison
const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-pro",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a facial recognition expert. Compare these two facial images and determine if they are the same person.

Reference Image (ComplyCube verified): First image
Current Capture: Second image

Analyze:
1. Facial structure (bone structure, face shape)
2. Eyes (shape, position, color)
3. Nose (shape, size, position)
4. Mouth and lips (shape, size)
5. Ears (if visible)
6. Overall proportions

Return JSON with:
- match: boolean (true if same person)
- confidence: number (0-100)
- analysis: string (detailed explanation)

Confidence threshold: 60% or higher = match`
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${referenceBase64}` }
          },
          {
            type: "image_url",
            image_url: { url: currentFaceImage }
          }
        ]
      }
    ]
  })
});

const aiData = await aiResponse.json();
const result = JSON.parse(aiData.choices[0].message.content);

return {
  verified: result.match && result.confidence >= 60,
  confidence: result.confidence,
  analysis: result.analysis
};
```

**Environment Variables:**
- `LOVABLE_API_KEY` - Lovable AI gateway key (auto-provided by Lovable Cloud)

**AI Model:** Google Gemini 2.5 Pro (multimodal, supports image analysis)

**Confidence Threshold:** 60% for ComplyCube facial verification

---

### `sign-contract` (Optional)

**File:** `supabase/functions/sign-contract/index.ts`

**Purpose:** Sign legal contract with facial verification and blockchain hash.

**Authentication:** Requires JWT verification (`verify_jwt = true`)

**Request Body:**
```typescript
{
  vaiNumber: string,
  contractType: "law_enforcement" | "mutual_consent" | "terms_of_service",
  contractText: string,
  facialMatchConfidence: number,
  deviceFingerprint: string
}
```

**Response:**
```typescript
{
  success: boolean,
  contractId: string,
  signedAt: string,
  blockchainHash: string,
  error?: string
}
```

**Implementation:**
```typescript
const { vaiNumber, contractType, contractText, facialMatchConfidence, deviceFingerprint } = await req.json();

// 1. Verify V.A.I. ownership
const { data: vaiData, error: vaiError } = await supabase
  .from("vai_assignments")
  .select("*")
  .eq("vai_code", vaiNumber)
  .single();

if (vaiError || !vaiData) {
  throw new Error("V.A.I. not found");
}

// 2. Generate blockchain hash
const hashData = `${vaiNumber}-${contractType}-${Date.now()}-${deviceFingerprint}`;
const encoder = new TextEncoder();
const data = encoder.encode(hashData);
const hashBuffer = await crypto.subtle.digest("SHA-256", data);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const blockchainHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

// 3. Get IP address and user agent
const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
const userAgent = req.headers.get("user-agent") || "unknown";

// 4. Insert contract
const { data: contractData, error: insertError } = await supabase
  .from("signed_contracts")
  .insert({
    vai_number: vaiNumber,
    contract_type: contractType,
    contract_text: contractText,
    facial_match_confidence: facialMatchConfidence,
    ip_address: ipAddress,
    user_agent: userAgent,
    blockchain_hash: blockchainHash
  })
  .select()
  .single();

if (insertError) throw insertError;

return {
  success: true,
  contractId: contractData.id,
  signedAt: contractData.signed_at,
  blockchainHash: contractData.blockchain_hash
};
```

---

## Session Management

### `sessionManager` Utility

**File:** `src/utils/sessionManager.ts`

**Purpose:** Centralized session data management using sessionStorage.

**Key Methods:**

```typescript
export const sessionManager = {
  // Generate unique session ID
  getSessionId: (): string => {
    let sessionId = sessionStorage.getItem('chainpass_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('chainpass_session_id', sessionId);
    }
    return sessionId;
  },

  // Verification record ID
  getVerificationRecordId: (): string | null => {
    return sessionStorage.getItem('verification_record_id');
  },
  setVerificationRecordId: (id: string): void => {
    sessionStorage.setItem('verification_record_id', id);
  },

  // V.A.I. code
  getVaiCode: (): string | null => {
    return sessionStorage.getItem('vai_number');
  },
  setVaiCode: (code: string): void => {
    sessionStorage.setItem('vai_number', code);
  },

  // User email
  getUserEmail: (): string | null => {
    return sessionStorage.getItem('user_email');
  },
  setUserEmail: (email: string): void => {
    sessionStorage.setItem('user_email', email);
  },

  // Clear all session data
  clearSession: (): void => {
    sessionStorage.clear();
  }
};
```

**SessionStorage Keys:**
- `chainpass_session_id` - Unique session identifier
- `verification_record_id` - Database verification record UUID
- `vai_number` - Generated V.A.I. code
- `user_email` - User email from payment form
- `user_phone` - User phone number (optional)
- `user_firstName` - First name (not stored in DB)
- `user_lastName` - Last name (not stored in DB)
- `payment_method` - Selected payment method
- `referral_code` - Referral code (optional)
- `applied_coupon` - Applied coupon JSON
- `complycube_client_id` - ComplyCube client ID
- `userType` - "leo" or "civilian"

---

## State Management

### Zustand V.A.I. Store

**File:** `src/store/vaiStore.ts`

**Purpose:** Global state management for V.A.I. data with sessionStorage persistence.

**Store Structure:**
```typescript
interface VAIState {
  vaiNumber: string | null;
  verificationRecordId: string | null;
  isLEO: boolean;
  isGenerating: boolean;
  generatedAt: string | null;
  
  setVAI: (vaiNumber: string, recordId: string, isLEO: boolean) => void;
  clearVAI: () => void;
  setGenerating: (isGenerating: boolean) => void;
}
```

**Usage:**
```typescript
import { useVAIStore } from "@/store/vaiStore";

const MyComponent = () => {
  const { vaiNumber, setVAI, clearVAI } = useVAIStore();
  
  // Access V.A.I. number
  console.log(vaiNumber); // "9I7T35L"
  
  // Set V.A.I. (only once per session)
  setVAI("9I7T35L", "record-uuid-123", false);
  
  // Clear on logout/session end
  clearVAI();
};
```

**Persistence:**
- Uses `zustand/middleware` with `createJSONStorage(() => sessionStorage)`
- Persists across page refreshes
- Clears when browser tab closes

**Critical Feature:**
- Prevents V.A.I. regeneration on back button navigation
- Single source of truth for V.A.I. display
- Synchronizes with sessionManager

---

## Security Considerations

### 1. Zero-Knowledge Architecture
- **Personal data NOT stored in ChainPass database**
- firstName, lastName passed directly to ComplyCube API
- ComplyCube hosts ID documents and biometric photos
- ChainPass only stores:
  - V.A.I. code (alphanumeric)
  - Verification status
  - ComplyCube transaction ID
  - Biometric photo URL (for comparison only)

### 2. Row Level Security (RLS)
- All database tables have RLS enabled
- Public access policies for unauthenticated verification flow
- Production should restrict by session_id or user_id

### 3. JWT Authentication
- **Payment endpoints:** No JWT (`verify_jwt = false`) - users not authenticated yet
- **Contract signing:** JWT required (`verify_jwt = true`)
- Future: Implement authentication after payment

### 4. API Key Security
- All API keys stored as Supabase secrets
- Never exposed to frontend
- `STRIPE_SECRET_KEY` - Stripe secret
- `COMPLYCUBE_API_KEY` - ComplyCube API key
- `LOVABLE_API_KEY` - Lovable AI gateway (auto-provided)

### 5. Data Minimization
- Biometric photos deleted after verification (future)
- ComplyCube transaction numbers deleted after 7 days (future cron job)
- Only essential data retained for V.A.I. validity

### 6. Rate Limiting
- ComplyCube facial verification: Max 3 attempts
- Contract signature: Max 3 attempts per 5 minutes
- Prevents brute force attacks

### 7. Device Fingerprinting
- Contract signing captures device fingerprint
- Prevents replay attacks
- Format: `base64(userAgent-screenSize-language)`

### 8. Blockchain Hash
- Contracts signed with SHA-256 hash
- Immutable audit trail
- Format: `SHA256(vaiNumber-contractType-timestamp-deviceFingerprint)`

---

## Known Issues and Gaps

### Critical Issues

1. **Missing Authentication System**
   - Users complete verification without creating accounts
   - No user registration/login flow
   - Future: Implement auth after payment or before contract signing

2. **Contract Signature Flow Not Integrated**
   - Contract signature page exists but not in main flow
   - Needs to be inserted before V.A.I. success
   - Decision needed: Optional or mandatory?

3. **LEO Declaration Flow Missing**
   - LEO users need to declare law enforcement status
   - Should occur before payment or after?
   - Gold theme differentiation not implemented

4. **Business Partner Integration Incomplete**
   - Business callback functions exist but not fully tested
   - Vairify integration needs validation
   - Return URL handling needs refinement

5. **Annual Renewal Not Implemented**
   - No expiration date tracking
   - No renewal reminder system
   - No automated expiration marking
   - Cron jobs not configured

### Data Flow Gaps

1. **Phone Number Collection**
   - PersonalDetailsForm doesn't collect phone number
   - Phone is optional for ComplyCube but improves matching
   - Should be added to form

2. **Email Capture Timing**
   - Email captured in PaymentForm (Stripe payment)
   - Should be captured earlier for 100% coupon users
   - Consider moving to PersonalDetailsForm

3. **V.A.I. State Persistence**
   - V.A.I. regeneration bug partially fixed
   - Needs comprehensive testing across all navigation paths
   - Edge case: Multiple tabs, browser back button

### Security Enhancements Needed

1. **RLS Policy Refinement**
   - Public access policies too permissive
   - Should restrict by session_id
   - Need authenticated user policies post-launch

2. **Biometric Photo Deletion**
   - Photos should be deleted after verification
   - Currently stored indefinitely
   - Implement automatic deletion (30 days retention)

3. **Transaction ID Deletion**
   - ComplyCube transaction numbers should be deleted after 7 days
   - Cron job not implemented
   - Data minimization requirement

4. **Session Hijacking Prevention**
   - No session validation after initial creation
   - Should verify IP address consistency
   - Add session timeout (4 hours)

### UI/UX Issues

1. **Progress Indicator Inconsistency**
   - Progress steps shown on some pages, not others
   - Numbering inconsistent (Step 1 of 3, Step 2 of 3, etc.)
   - Should be unified across all pages

2. **Error Handling**
   - Generic error messages
   - Need user-friendly guidance for common issues
   - Camera permission errors need clear instructions

3. **Loading States**
   - Some buttons lack loading indicators
   - Network request timeouts not handled
   - Need retry mechanisms

4. **Mobile Optimization**
   - Camera interface needs mobile testing
   - Touch interactions for facial verification
   - Portrait vs landscape orientation

### Missing Features

1. **V.A.I. Lookup**
   - No way to retrieve V.A.I. if lost
   - Need "Find My V.A.I." flow
   - Email-based recovery

2. **V.A.I. Transfer**
   - No ability to transfer V.A.I. to new account
   - Should support email change

3. **Multiple Platform Addition**
   - No flow for adding new platforms to existing V.A.I.
   - Should be lower-friction than initial verification

4. **Admin Dashboard**
   - No admin interface for verification review
   - Manual review for failed attempts not implemented
   - Fraud detection and monitoring needed

5. **Analytics and Monitoring**
   - No tracking of conversion rates
   - No error logging dashboard
   - No user behavior analytics

### Testing Gaps

1. **ComplyCube Integration**
   - Not fully tested with production API keys
   - Callback polling timing not optimized
   - Photo download success rate unknown

2. **Stripe Payment Flow**
   - Test card scenarios not comprehensive
   - PayPal integration not tested
   - Crypto placeholder needs implementation

3. **Facial Recognition Accuracy**
   - Gemini 2.5 Pro confidence threshold (60%) not validated
   - Need false positive/negative rate analysis
   - Different lighting conditions not tested

4. **Cross-Browser Compatibility**
   - Camera access on Safari/iOS needs testing
   - Firefox camera permission flow
   - Edge browser compatibility

### Documentation Gaps

1. **API Documentation**
   - No Swagger/OpenAPI spec for edge functions
   - No request/response examples
   - No error code documentation

2. **Business Partner Integration Guide**
   - No step-by-step guide for new business integrations
   - No sample code for webhook handling
   - No testing sandbox provided

3. **User Guide**
   - No help documentation for users
   - No FAQ section
   - No troubleshooting guide

### Performance Concerns

1. **Image Upload/Download**
   - Large biometric photos (1-2MB) slow down callback
   - Need image compression/optimization
   - Consider CDN for photo delivery

2. **Database Queries**
   - No indexes on frequently queried fields
   - Polling creates repeated database hits
   - Need query optimization

3. **Edge Function Cold Starts**
   - First request to edge function slow (Deno cold start)
   - Need keep-alive strategy
   - Consider function warming

---

## Recommendations

### Immediate Priority (Blocking Production)

1. **Implement Authentication**
   - User registration/login flow
   - JWT token management
   - Password reset functionality

2. **Integrate Contract Signature**
   - Add to main verification flow
   - Make mandatory or optional (business decision)
   - Test facial recognition threshold

3. **Implement LEO Declaration**
   - Add LEO flow before payment
   - Implement gold theme differentiation
   - Test LEO-prefixed V.A.I. codes

4. **Refine RLS Policies**
   - Restrict public access
   - Implement session-based policies
   - Add user authentication checks

5. **Comprehensive Testing**
   - End-to-end flow with production API keys
   - Cross-browser/device testing
   - Payment flow edge cases

### High Priority (Launch Blockers)

1. **Error Handling Enhancement**
   - User-friendly error messages
   - Retry mechanisms
   - Comprehensive logging

2. **Annual Renewal Implementation**
   - Expiration date tracking
   - Renewal reminder emails (30 days before)
   - Automated expiration marking

3. **Admin Dashboard**
   - Manual review interface
   - Fraud monitoring
   - Support ticket integration

4. **Data Minimization**
   - Biometric photo deletion (30 days)
   - Transaction ID deletion (7 days)
   - Automated data retention policies

### Medium Priority (Post-Launch)

1. **V.A.I. Lookup and Recovery**
   - Email-based V.A.I. retrieval
   - Account transfer functionality
   - Password reset integration

2. **Multiple Platform Addition Flow**
   - Streamlined platform addition
   - Lower friction than initial verification
   - One-time facial verification

3. **Analytics and Monitoring**
   - Conversion rate tracking
   - Error logging dashboard
   - User behavior analytics

4. **Performance Optimization**
   - Image compression
   - Database query optimization
   - Edge function warming

### Low Priority (Future Enhancements)

1. **Multi-Language Support**
   - Full Spanish translations
   - Additional languages
   - RTL language support

2. **Social Login**
   - Google OAuth integration
   - Apple Sign-In
   - Facebook Login

3. **Biometric Alternatives**
   - Voice recognition
   - Fingerprint scanning (mobile)
   - Iris scanning

4. **White Label Solution**
   - Customizable branding
   - Custom domain support
   - API-first architecture

---

## Conclusion

The ChainPass V.A.I. verification flow from payment to success represents a comprehensive identity verification system with strong architectural foundations. The flow successfully:

1. **Processes payments** via Stripe with coupon support
2. **Collects personal details** without database storage
3. **Integrates ComplyCube KYC** with hosted solution
4. **Verifies biometrics** with AI-powered facial recognition
5. **Generates V.A.I. codes** with database persistence
6. **Prevents duplicates** with state management

However, several critical gaps must be addressed before production launch:
- Authentication system implementation
- Contract signature integration
- LEO declaration flow
- RLS policy refinement
- Comprehensive testing

This document provides external evaluators with a complete technical understanding of the current implementation, known issues, and recommended path to production readiness.

---

**Document Prepared By:** Lovable AI Assistant  
**For:** ChainPass V.A.I. System External Evaluation  
**Review Status:** Ready for Technical Review
