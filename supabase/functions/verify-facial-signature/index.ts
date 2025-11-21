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
    // Get authenticated user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("[Facial Verify] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { vaiNumber, liveFaceImage, contractType, deviceFingerprint } = await req.json();
    
    console.log("[Facial Verify] Starting verification for VAI:", vaiNumber, "User:", user.id);

    if (!vaiNumber || !liveFaceImage || !contractType) {
      throw new Error("Missing required fields: vaiNumber, liveFaceImage, or contractType");
    }

    // Use service role for rate limiting checks
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check recent attempts (rate limiting: max 3 per 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentAttempts, error: attemptsError } = await serviceClient
      .from("signature_attempts")
      .select("id")
      .eq("vai_number", vaiNumber)
      .gte("attempted_at", fiveMinutesAgo);

    if (attemptsError) {
      console.error("[Facial Verify] Error checking attempts:", attemptsError);
    }

    if (recentAttempts && recentAttempts.length >= 3) {
      console.log("[Facial Verify] Rate limit exceeded for VAI:", vaiNumber);
      
      // Log failed attempt
      await serviceClient.from("signature_attempts").insert({
        vai_number: vaiNumber,
        contract_type: contractType,
        success: false,
        failure_reason: "Rate limit exceeded",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        user_agent: req.headers.get("user-agent"),
        device_fingerprint: deviceFingerprint,
      });

      return new Response(
        JSON.stringify({
          match: false,
          confidence: 0,
          message: "Too many attempts. Please try again in 5 minutes.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        }
      );
    }

    // Get stored verification photo from verification_records and verify ownership
    const { data: verificationData, error: verificationError } = await serviceClient
      .from("vai_assignments")
      .select(`
        verification_record_id,
        verification_records!inner (
          selfie_url,
          session_id
        )
      `)
      .eq("vai_code", vaiNumber)
      .single();

    if (verificationError || !verificationData) {
      console.error("[Facial Verify] VAI not found:", verificationError);
      throw new Error("V.A.I. number not found");
    }

    // TODO: When user_id column is added to verification_records, verify:
    // if (verificationData.verification_records.user_id !== user.id) {
    //   return new Response(
    //     JSON.stringify({ error: "You do not own this V.A.I. number" }),
    //     { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    //   );
    // }

    const storedPhotoUrl = (verificationData.verification_records as any)?.selfie_url;
    
    if (!storedPhotoUrl) {
      console.error("[Facial Verify] No stored photo for VAI:", vaiNumber);
      throw new Error("No verification photo found for this V.A.I. number");
    }

    console.log("[Facial Verify] Comparing faces using Gemini 2.5 Pro");

    // Use Lovable AI with Gemini 2.5 Pro for facial comparison
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are a facial recognition expert system for identity verification. Compare two facial images and determine if they are the same person.
            
            Your response MUST be a valid JSON object with these exact fields:
            {
              "match": boolean (true if same person, false if different),
              "confidence": number (0-100, your confidence percentage),
              "reasoning": string (brief explanation of your decision)
            }
            
            IMPORTANT: Respond ONLY with the JSON object, no additional text.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Compare these two images. Is this the same person? Image 1 is the stored verification photo. Image 2 is the live capture."
              },
              {
                type: "image_url",
                image_url: { url: storedPhotoUrl }
              },
              {
                type: "image_url",
                image_url: { url: liveFaceImage }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[Facial Verify] AI API error:", aiResponse.status, errorText);
      throw new Error(`Facial recognition service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("[Facial Verify] AI response:", JSON.stringify(aiData));

    const aiMessage = aiData.choices?.[0]?.message?.content;
    if (!aiMessage) {
      throw new Error("Invalid AI response format");
    }

    // Parse AI response
    let comparisonResult;
    try {
      comparisonResult = JSON.parse(aiMessage);
    } catch (parseError) {
      console.error("[Facial Verify] Failed to parse AI response:", aiMessage);
      throw new Error("Failed to parse facial recognition results");
    }

    const confidence = comparisonResult.confidence || 0;
    const match = comparisonResult.match && confidence >= 85;

    console.log("[Facial Verify] Match:", match, "Confidence:", confidence);

    // Log attempt
    await serviceClient.from("signature_attempts").insert({
      vai_number: vaiNumber,
      contract_type: contractType,
      facial_match_confidence: confidence,
      success: match,
      failure_reason: match ? null : "Facial match confidence below threshold",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      user_agent: req.headers.get("user-agent"),
      device_fingerprint: deviceFingerprint,
    });

    return new Response(
      JSON.stringify({
        match,
        confidence,
        message: match 
          ? "Identity verified successfully" 
          : "Identity verification failed. Please ensure good lighting and face the camera directly.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("[Facial Verify] Error:", error);
    return new Response(
      JSON.stringify({
        match: false,
        confidence: 0,
        message: error instanceof Error ? error.message : "Verification failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});