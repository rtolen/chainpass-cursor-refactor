# ComplyCube Integration - Complete Code Audit

**Project:** ChainPass V.A.I. Verification System  
**Date:** 2025-11-19  
**Purpose:** External examination of ComplyCube KYC integration

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Flow Description](#flow-description)
3. [Edge Functions](#edge-functions)
4. [Frontend Components](#frontend-components)
5. [Database Schema](#database-schema)
6. [Configuration](#configuration)
7. [Current Status & Known Issues](#current-status--known-issues)

---

## Architecture Overview

### Integration Strategy
ComplyCube is integrated using their **Hosted Solution** approach, where:
- ComplyCube provides a pre-built UI in an iframe
- ChainPass handles session creation and callback processing
- Biometric photos are downloaded and stored in Supabase
- Post-KYC facial verification confirms identity continuity

### Key Components
1. **create-complycube-session** - Creates ComplyCube client and Flow session
2. **complycube-callback** - Processes verification results and downloads biometrics
3. **verify-complycube-biometric** - Compares live face against ComplyCube photo
4. **Frontend Pages** - VerificationTransition, IdUpload, ComplyCubeFacialVerification

### Data Flow
```
User Payment → VerificationTransition → ComplyCube Session Creation
→ ComplyCube Hosted UI (iframe) → Callback Processing → Biometric Download
→ ComplyCube Facial Verification → V.A.I. Generation
```

---

## Flow Description

### Step 1: Session Initiation
1. User completes payment
2. VerificationTransition page calls `create-complycube-session`
3. Edge function creates ComplyCube client and Flow session
4. Returns iframe URL for ComplyCube Hosted Solution

### Step 2: ComplyCube KYC
1. User completes ID and selfie capture in ComplyCube iframe
2. ComplyCube processes verification
3. User is redirected to callback URL with clientId

### Step 3: Callback Processing
1. Frontend polls `complycube-callback` edge function
2. Edge function retrieves verification results from ComplyCube API
3. Downloads live photo biometric
4. Uploads to Supabase Storage (verification-photos bucket)
5. Updates verification_records table

### Step 4: Biometric Confirmation
1. User navigates to ComplyCubeFacialVerification page
2. Live camera capture of user's face
3. `verify-complycube-biometric` compares against stored ComplyCube photo
4. Uses Google Gemini 2.5 Pro with 60% confidence threshold
5. Maximum 3 attempts allowed

### Step 5: V.A.I. Generation
1. Upon successful biometric match, proceed to V.A.I. generation
2. V.A.I. code assigned and displayed to user

---

## Edge Functions

### 1. create-complycube-session

**File:** `supabase/functions/create-complycube-session/index.ts`

**Purpose:** Creates ComplyCube client and Flow session for KYC verification

**Key Parameters:**
- Input: `{ sessionId, email }` (optional)
- Output: `{ redirectUrl, clientId, sessionId }`

**Complete Code:**
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[ComplyCube Flow] Starting session creation");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from session
    const authHeader = req.headers.get("Authorization");
    let userId = "guest";
    let userEmail = "";
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        userId = data.user.id;
        userEmail = data.user.email || `user-${userId}@chainpass.temp`;
      }
    }

    const { sessionId, email } = await req.json();
    const finalEmail = email || userEmail || `user-${userId}@chainpass.temp`;

    console.log("[ComplyCube Flow] User authenticated:", userId);

    const complyCubeApiKey = Deno.env.get("COMPLYCUBE_API_KEY");
    if (!complyCubeApiKey) {
      console.error("[ComplyCube Flow] API key not configured");
      throw new Error("ComplyCube API key not configured");
    }

    // Step 1: Create ComplyCube client
    console.log("[ComplyCube Flow] Creating client");
    const clientResponse = await fetch("https://api.complycube.com/v1/clients", {
      method: "POST",
      headers: {
        "Authorization": `${complyCubeApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "person",
        email: finalEmail,
        personDetails: {
          firstName: "User",
          lastName: sessionId.substring(0, 8),
        },
      }),
    });

    if (!clientResponse.ok) {
      const errorText = await clientResponse.text();
      console.error("[ComplyCube Flow] Client creation failed:", errorText);
      throw new Error(`ComplyCube client creation failed: ${errorText}`);
    }

    const clientData = await clientResponse.json();
    console.log("[ComplyCube Flow] Client created:", clientData.id);

    // Step 2: Create Flow session (Hosted Solution)
    console.log("[ComplyCube Flow] Creating Flow session");
    
    // Get the base URL for success/cancel redirects
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const baseUrl = origin.replace(/\/$/, ""); // Remove trailing slash
    
    const flowResponse = await fetch("https://api.complycube.com/v1/flow/sessions", {
      method: "POST",
      headers: {
        "Authorization": `${complyCubeApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: clientData.id,
        checkTypes: ["document_check", "identity_check"],
        successUrl: `${baseUrl}/complycube-callback?success=true&clientId=${clientData.id}`,
        cancelUrl: `${baseUrl}/id-upload?cancelled=true`,
      }),
    });

    if (!flowResponse.ok) {
      const errorText = await flowResponse.text();
      console.error("[ComplyCube Flow] Flow session creation failed:", errorText);
      throw new Error(`ComplyCube Flow session creation failed: ${errorText}`);
    }

    const flowData = await flowResponse.json();
    console.log("[ComplyCube Flow] Flow session created successfully");
    console.log("[ComplyCube Flow] Flow data:", JSON.stringify(flowData));
    console.log("[ComplyCube Flow] Redirect URL:", flowData.redirectUrl);

    // Store session info in database
    const { error: dbError } = await supabaseClient
      .from("verification_records")
      .update({
        complycube_client_id: clientData.id,
        complycube_session_id: flowData.id,
      })
      .eq("session_id", sessionId);

    if (dbError) {
      console.error("[ComplyCube Flow] Database update error:", dbError);
      throw new Error(`Database update failed: ${dbError.message}`);
    }

    console.log("[ComplyCube Flow] Database updated successfully");

    return new Response(
      JSON.stringify({
        redirectUrl: flowData.redirectUrl,
        clientId: clientData.id,
        sessionId: flowData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[ComplyCube Flow] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
```

---

### 2. complycube-callback

**File:** `supabase/functions/complycube-callback/index.ts`

**Purpose:** Retrieves verification results and downloads biometric photo from ComplyCube

**Key Parameters:**
- Input: `{ clientId }`
- Output: `{ success, outcome, transactionId, photoUrl }`

**Complete Code:**
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMPLYCUBE_API_URL = "https://api.complycube.com/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId } = await req.json();

    const COMPLYCUBE_API_KEY = Deno.env.get("COMPLYCUBE_API_KEY");
    if (!COMPLYCUBE_API_KEY) {
      throw new Error("COMPLYCUBE_API_KEY not configured");
    }

    console.log(`[ComplyCube Callback] Processing client: ${clientId}`);

    // Step 1: Get check results from ComplyCube
    const checksResponse = await fetch(
      `${COMPLYCUBE_API_URL}/clients/${clientId}/checks`,
      {
        headers: { "Authorization": COMPLYCUBE_API_KEY },
      }
    );

    if (!checksResponse.ok) {
      throw new Error("Failed to fetch checks from ComplyCube");
    }

    const checks = await checksResponse.json();
    const latestCheck = checks.items?.[0];

    if (!latestCheck) {
      throw new Error("No checks found for client");
    }

    console.log(`[ComplyCube Callback] Check outcome: ${latestCheck.outcome}`);
    console.log(`[ComplyCube Callback] Transaction ID: ${latestCheck.id}`);

    // Step 2: Get documents (live photo)
    const documentsResponse = await fetch(
      `${COMPLYCUBE_API_URL}/clients/${clientId}/documents`,
      {
        headers: { "Authorization": COMPLYCUBE_API_KEY },
      }
    );

    if (!documentsResponse.ok) {
      throw new Error("Failed to fetch documents from ComplyCube");
    }

    const documents = await documentsResponse.json();
    const livePhoto = documents.items?.find((doc: any) => doc.type === "live_photo");

    if (!livePhoto) {
      throw new Error("No live photo found");
    }

    console.log(`[ComplyCube Callback] Found live photo: ${livePhoto.id}`);

    // Step 3: Download live photo
    const livePhotoResponse = await fetch(
      `${COMPLYCUBE_API_URL}/documents/${livePhoto.id}/download`,
      {
        headers: { "Authorization": COMPLYCUBE_API_KEY },
      }
    );

    if (!livePhotoResponse.ok) {
      throw new Error("Failed to download live photo");
    }

    const livePhotoBlob = await livePhotoResponse.arrayBuffer();

    // Step 4: Upload to Supabase Storage
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const livePhotoFileName = `${clientId}-live-photo.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("verification-photos")
      .upload(livePhotoFileName, livePhotoBlob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("[Storage] Upload error:", uploadError);
      throw new Error(`Failed to upload photo: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("verification-photos")
      .getPublicUrl(livePhotoFileName);

    console.log(`[ComplyCube Callback] Photo stored at: ${publicUrl}`);

    // Step 5: Update verification record
    const { error: updateError } = await supabase
      .from("verification_records")
      .update({
        complycube_verification_id: latestCheck.id,
        verification_status: latestCheck.outcome,
        biometric_confirmed: latestCheck.outcome === "clear",
        selfie_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("complycube_client_id", clientId);

    if (updateError) {
      console.error("[Database] Update error:", updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log("[ComplyCube Callback] Verification complete");

    return new Response(
      JSON.stringify({
        success: true,
        outcome: latestCheck.outcome,
        transactionId: latestCheck.id,
        photoUrl: publicUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[ComplyCube Callback] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
```

---

### 3. verify-complycube-biometric

**File:** `supabase/functions/verify-complycube-biometric/index.ts`

**Purpose:** Compares live camera capture against ComplyCube-stored biometric photo

**Key Parameters:**
- Input: `{ referencePhotoUrl, currentFaceImage }`
- Output: `{ verified, confidence, analysis }`

**AI Model:** Google Gemini 2.5 Pro via Lovable AI Gateway

**Confidence Threshold:** 60%

**Complete Code:**
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referencePhotoUrl, currentFaceImage } = await req.json();

    console.log("[Biometric Verification] Starting facial comparison");

    // Use Gemini 2.5 Pro for facial comparison with 60% tolerance
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: "You are a facial biometric verification system. Compare two facial images and determine if they show the same person. Provide a confidence score from 0-100. Be lenient with minor variations in lighting, angle, or facial expression. Focus on core facial structure and features."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Compare these two facial images. Are they the same person? Provide your analysis and a confidence score (0-100)."
              },
              {
                type: "image_url",
                image_url: { url: referencePhotoUrl }
              },
              {
                type: "image_url",
                image_url: { url: currentFaceImage }
              }
            ]
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "facial_comparison_result",
            description: "Report the facial comparison result",
            parameters: {
              type: "object",
              properties: {
                is_same_person: { 
                  type: "boolean",
                  description: "Whether the two images show the same person"
                },
                confidence_score: { 
                  type: "number",
                  description: "Confidence score from 0-100"
                },
                analysis: { 
                  type: "string",
                  description: "Brief analysis of the comparison"
                }
              },
              required: ["is_same_person", "confidence_score", "analysis"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "facial_comparison_result" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Gemini API] Error:", errorText);
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    console.log("[Biometric Verification] Result:", {
      is_same_person: result.is_same_person,
      confidence_score: result.confidence_score,
      analysis: result.analysis
    });

    // 60% tolerance threshold
    const verified = result.is_same_person && result.confidence_score >= 60;

    return new Response(
      JSON.stringify({
        verified,
        confidence: result.confidence_score,
        analysis: result.analysis,
        is_same_person: result.is_same_person
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Biometric Verification] Error:", error);
    return new Response(
      JSON.stringify({ 
        verified: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## Frontend Components

### 1. VerificationTransition.tsx

**Purpose:** Landing page after payment, initiates ComplyCube session

**Key Functions:**
- `handleContinueVerification()` - Creates ComplyCube session and opens modal
- Displays payment success message
- Shows what's needed for verification

**Critical Code Section:**
```typescript
const handleContinueVerification = async () => {
  console.log("[Verification] Opening verification modal");
  setVerificationState("loading");
  setModalOpen(true);

  try {
    // Call edge function to create ComplyCube Flow session
    const sessionId = sessionManager.getSessionId();
    const { data, error } = await supabase.functions.invoke('create-complycube-session', {
      body: { sessionId }
    });

    if (error) {
      console.error("[Verification] Flow session creation error:", error);
      throw error;
    }

    console.log("[Verification] Flow session created");
    console.log("[Verification] Response data:", data);
    console.log("[Verification] Redirect URL:", data.redirectUrl);

    // Store clientId for later retrieval
    sessionStorage.setItem('complycube_client_id', data.clientId);
    
    setRedirectUrl(data.redirectUrl);
    setVerificationState("ready");
    
    toast({
      title: "Verification Ready",
      description: "Opening ComplyCube verification window...",
    });

    // Open ComplyCube in new window
    window.open(data.redirectUrl, '_blank', 'width=800,height=900');
    
  } catch (error) {
    console.error("[Verification] Error:", error);
    setVerificationState("error");
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to start verification",
      variant: "destructive",
    });
  }
};
```

---

### 2. IdUpload.tsx (Legacy - Bypass Available)

**Purpose:** Legacy ID upload interface with bypass for testing

**Current Status:** Being replaced by ComplyCube Hosted Solution

**Bypass Function:**
```typescript
const handleTestBypass = () => {
  console.log("[TESTING] Bypassing ID upload verification");
  setUploadState("success");
  toast({
    title: "[TESTING] ID Verification Bypassed",
    description: "Continuing to facial verification...",
  });
  setTimeout(() => {
    handleContinueToFacial();
  }, 1000);
};
```

---

### 3. ComplyCubeFacialVerification.tsx

**Purpose:** Post-KYC biometric confirmation page

**Key Features:**
- Live camera capture
- Facial comparison against ComplyCube-stored photo
- 60% confidence threshold
- Maximum 3 attempts
- Manual review fallback

**Critical Code Section:**
```typescript
const captureAndVerify = async () => {
  if (!videoRef.current || !canvasRef.current) return;

  setState("processing");

  // Capture frame
  const canvas = canvasRef.current;
  const video = videoRef.current;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(video, 0, 0);
  const imageData = canvas.toDataURL("image/jpeg", 0.95);

  // Get ComplyCube live photo URL from session
  const sessionId = sessionManager.getSessionId();
  
  try {
    // Get verification record
    const { data: verificationData, error: fetchError } = await supabase
      .from("verification_records")
      .select("selfie_url, complycube_client_id")
      .eq("session_id", sessionId)
      .single();

    if (fetchError || !verificationData?.selfie_url) {
      throw new Error("Verification data not found. Please complete ID upload first.");
    }

    console.log("[Verification] Comparing against:", verificationData.selfie_url);

    // Call edge function to compare
    const { data, error } = await supabase.functions.invoke("verify-complycube-biometric", {
      body: {
        referencePhotoUrl: verificationData.selfie_url,
        currentFaceImage: imageData,
      },
    });

    if (error) throw error;

    console.log("[Verification] Result:", data);

    if (data.verified) {
      setConfidence(data.confidence);
      setAnalysis(data.analysis);
      setState("success");
      
      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      toast.success("Identity confirmed!");

      // Continue to V.A.I. processing
      setTimeout(() => navigate("/vai-processing"), 2000);
    } else {
      setAttempts(attempts + 1);
      setConfidence(data.confidence || 0);
      setAnalysis(data.analysis || "Faces do not match");
      
      if (attempts + 1 >= MAX_ATTEMPTS) {
        setState("failed");
        toast.error("Maximum attempts exceeded. Your verification will be manually reviewed.");
        
        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      } else {
        setState("camera");
        toast.error(`Verification failed. ${MAX_ATTEMPTS - attempts - 1} attempts remaining.`);
      }
    }
  } catch (error) {
    console.error("[Verification] Error:", error);
    setState("failed");
    toast.error(error instanceof Error ? error.message : "Verification failed");
  }
};
```

---

## Database Schema

### verification_records Table

**Relevant Columns:**
```sql
CREATE TABLE verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  
  -- ComplyCube fields
  complycube_client_id TEXT,
  complycube_session_id TEXT,
  complycube_verification_id TEXT,
  
  -- Verification status
  verification_status TEXT,
  biometric_confirmed BOOLEAN DEFAULT false,
  
  -- Photo storage
  id_document_url TEXT,
  selfie_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for ComplyCube lookups
CREATE INDEX idx_verification_records_complycube_client_id 
  ON verification_records(complycube_client_id);
```

### Storage Bucket

**Bucket Name:** `verification-photos`

**Access:** Public read, service role write

**Policy:**
```sql
-- Allow public read access
CREATE POLICY "Allow public read access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'verification-photos');

-- Allow service role to upload
CREATE POLICY "Allow service role to upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'verification-photos');
```

---

## Configuration

### supabase/config.toml

```toml
project_id = "pbxpkfotysozdmdophhg"

[functions.create-complycube-session]
verify_jwt = false

[functions.complycube-callback]
verify_jwt = false

[functions.verify-complycube-biometric]
verify_jwt = false
```

### Environment Variables (Secrets)

**Required:**
- `COMPLYCUBE_API_KEY` - ComplyCube API key for KYC verification
- `LOVABLE_API_KEY` - For Gemini 2.5 Pro facial comparison
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - For storage operations
- `SUPABASE_ANON_KEY` - For client operations

---

## Current Status & Known Issues

### ✅ Working Components
1. ComplyCube session creation edge function
2. Flow session URL generation with correct redirect URLs
3. Database schema for storing ComplyCube data
4. Storage bucket configuration for verification photos
5. Biometric verification edge function using Gemini 2.5 Pro
6. ComplyCubeFacialVerification frontend component

### ⚠️ Known Issues

#### Issue 1: Empty Request Body Error
**Status:** FIXED (2025-11-19)
**Error:** `SyntaxError: Unexpected end of JSON input` in create-complycube-session
**Root Cause:** Frontend not sending sessionId in request body
**Solution:** Updated VerificationTransition.tsx line 94-96 to send sessionId

**Before:**
```typescript
const { data, error } = await supabase.functions.invoke('create-complycube-session');
```

**After:**
```typescript
const sessionId = sessionManager.getSessionId();
const { data, error } = await supabase.functions.invoke('create-complycube-session', {
  body: { sessionId }
});
```

#### Issue 2: ComplyCube Widget Not Loading
**Status:** UNKNOWN - Requires external testing
**Symptoms:** Blank iframe when ComplyCube Hosted Solution URL is opened
**Possible Causes:**
- Invalid ComplyCube API key
- Incorrect Authorization header format (should it be `Bearer ${key}`?)
- ComplyCube API endpoint restrictions
- CORS issues with iframe embedding

**Recommended Investigation:**
1. Verify COMPLYCUBE_API_KEY is valid and active
2. Test ComplyCube API authentication manually via Postman
3. Check ComplyCube account settings for domain restrictions
4. Review ComplyCube API documentation for header format
5. Enable browser console in iframe to see client-side errors

#### Issue 3: Polling Strategy Not Implemented
**Status:** INCOMPLETE
**Description:** Frontend should poll complycube-callback until verification complete
**Current:** User manually navigates after closing ComplyCube window
**Required:** 5-second polling with 5-minute timeout

**Suggested Implementation:**
```typescript
const pollCallback = async (clientId: string) => {
  const maxAttempts = 60; // 5 minutes at 5-second intervals
  let attempts = 0;
  
  const poll = setInterval(async () => {
    attempts++;
    
    const { data } = await supabase.functions.invoke('complycube-callback', {
      body: { clientId }
    });
    
    if (data?.success || attempts >= maxAttempts) {
      clearInterval(poll);
      if (data?.success) {
        navigate('/complycube-facial');
      } else {
        toast.error("Verification timed out");
      }
    }
  }, 5000);
};
```

#### Issue 4: Missing Phone Number Field
**Status:** DOCUMENTED
**Description:** ComplyCube client creation doesn't capture user phone number
**Impact:** Cannot send SMS notifications or match with business records
**Required:** Add phone input field and include in client creation

### 🔍 Items Requiring External Validation

1. **ComplyCube API Key Format**
   - Is the Authorization header format correct?
   - Should it be `Bearer ${key}` or just the key?

2. **Flow Session Configuration**
   - Are the `checkTypes` values correct?
   - Should there be additional configuration options?

3. **Callback URL Structure**
   - Does ComplyCube require specific URL parameters?
   - Should the redirect include additional data?

4. **Biometric Photo Type**
   - Is "live_photo" the correct document type to filter for?
   - Are there other photo types we should consider?

5. **Confidence Threshold**
   - Is 60% appropriate for post-KYC biometric confirmation?
   - Should it be higher given ComplyCube already verified identity?

---

## Recommendations for External Review

### Priority 1: Critical Path Issues
1. Validate ComplyCube API authentication and endpoint format
2. Test ComplyCube Hosted Solution iframe loading
3. Verify callback URL structure matches ComplyCube requirements

### Priority 2: Security & Data Flow
1. Review biometric photo download and storage process
2. Validate facial comparison confidence threshold (currently 60%)
3. Confirm data retention and privacy compliance

### Priority 3: User Experience
1. Implement polling strategy for automatic flow progression
2. Add comprehensive error handling and user feedback
3. Add retry mechanisms for API failures

### Priority 4: Missing Features
1. Phone number capture and validation
2. Transaction number storage and reference
3. Manual review workflow for failed verifications

---

## Contact & Support

For questions about this integration, contact the ChainPass development team.

**Related Documentation:**
- [ComplyCube API Documentation](https://docs.complycube.com/)
- [ComplyCube Hosted Solution Guide](https://docs.complycube.com/documentation/guides/hosted-solution)
- [VERIFICATION-FLOW-COMPLETE-CODE-AUDIT.md](./VERIFICATION-FLOW-COMPLETE-CODE-AUDIT.md)

---

*End of Document*
