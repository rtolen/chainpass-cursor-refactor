import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
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
      console.error("[VAI Facial Verify] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { vaiNumber, liveFaceImage } = await req.json();

    if (!vaiNumber || !liveFaceImage) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[VAI Facial Verify] Processing verification for V.A.I.:", vaiNumber, "User:", user.id);

    // Verify ownership - check if this V.A.I. belongs to the authenticated user
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check rate limiting - max 5 attempts per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseClient
      .from("signature_attempts")
      .select("*", { count: "exact", head: true })
      .eq("vai_number", vaiNumber)
      .eq("contract_type", "vai_verification")
      .gte("attempted_at", tenMinutesAgo);

    if (count && count >= 5) {
      console.log("[VAI Facial Verify] Rate limit exceeded");
      return new Response(
        JSON.stringify({
          match: false,
          message: "Too many attempts. Please wait 10 minutes before trying again.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get stored selfie from verification records and verify ownership
    const { data: vaiData, error: vaiError } = await serviceClient
      .from("vai_assignments")
      .select(`
        verification_record_id,
        verification_records!inner(
          selfie_url,
          session_id
        )
      `)
      .eq("vai_code", vaiNumber)
      .single();

    if (vaiError || !vaiData) {
      console.error("[VAI Facial Verify] Error fetching V.A.I. data:", vaiError);
      return new Response(
        JSON.stringify({ error: "V.A.I. number not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: When user_id column is added to verification_records, verify:
    // if (vaiData.verification_records.user_id !== user.id) {
    //   return new Response(
    //     JSON.stringify({ error: "You do not own this V.A.I. number" }),
    //     { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    //   );
    // }

    const storedPhotoUrl = (vaiData.verification_records as any).selfie_url;
    if (!storedPhotoUrl) {
      console.error("[VAI Facial Verify] No stored photo found");
      return new Response(
        JSON.stringify({ error: "No verification photo found for this V.A.I." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[VAI Facial Verify] Comparing faces using Gemini 2.5 Pro");

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
      console.error("[VAI Facial Verify] AI API error:", aiResponse.status, errorText);
      throw new Error(`Facial recognition service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("[VAI Facial Verify] AI response:", JSON.stringify(aiData));

    // Parse AI response
    let aiMatch = false;
    let aiConfidence = 0;
    let aiReasoning = "";

    try {
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiMatch = parsed.match === true;
          aiConfidence = Number(parsed.confidence) || 0;
          aiReasoning = parsed.reasoning || "";
        }
      }
    } catch (parseError) {
      console.error("[VAI Facial Verify] Error parsing AI response:", parseError);
      aiReasoning = "Error parsing verification results";
    }

    // Determine final match (require 85% confidence)
    const finalMatch = aiMatch && aiConfidence >= 85;
    
    console.log("[VAI Facial Verify] Match:", finalMatch, "Confidence:", aiConfidence);

    // Log attempt
    await supabaseClient.from("signature_attempts").insert({
      vai_number: vaiNumber,
      contract_type: "vai_verification",
      success: finalMatch,
      facial_match_confidence: aiConfidence,
      failure_reason: finalMatch ? null : aiReasoning,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      user_agent: req.headers.get("user-agent"),
      device_fingerprint: null,
    });

    return new Response(
      JSON.stringify({
        match: finalMatch,
        confidence: aiConfidence,
        message: finalMatch 
          ? "Identity verified successfully!" 
          : "Identity verification failed. Please try again.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[VAI Facial Verify] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
