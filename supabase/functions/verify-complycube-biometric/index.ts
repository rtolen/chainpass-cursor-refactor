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

    console.log("[Biometric Verification] Starting facial comparison (TEST MODE - AUTO SUCCESS)");

    // TEST MODE: Always return success
    return new Response(
      JSON.stringify({
        verified: true,
        confidence: 95,
        analysis: "Test mode: Automatic verification success",
        is_same_person: true
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
