import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { referencePhotoUrl, currentFaceImage } = body;

    console.log("[Biometric Verification] Starting facial comparison");
    console.log("[Biometric Verification] Reference photo URL:", referencePhotoUrl ? "Provided" : "Missing");
    console.log("[Biometric Verification] Current face image:", currentFaceImage ? "Provided" : "Missing");

    if (!referencePhotoUrl || !currentFaceImage) {
      return new Response(
        JSON.stringify({
          verified: false,
          error: "Missing required fields: referencePhotoUrl and currentFaceImage are required",
          confidence: 0,
          analysis: "Missing image data"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TEST MODE: Always return success for now
    // TODO: Implement actual facial comparison using AI service
    console.log("[Biometric Verification] TEST MODE - Returning automatic success");

    return new Response(
      JSON.stringify({
        verified: true,
        confidence: 95,
        analysis: "Test mode: Automatic verification success",
        is_same_person: true
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Biometric Verification] Error:", error);
    return new Response(
      JSON.stringify({ 
        verified: false,
        error: error instanceof Error ? error.message : "Unknown error",
        confidence: 0,
        analysis: "Verification failed due to an error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
