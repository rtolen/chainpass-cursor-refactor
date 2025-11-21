import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("═══ ComplyCube Flow Session Creation START ═══");
    
    const { clientId } = await req.json();
    
    if (!clientId) {
      throw new Error("clientId is required");
    }

    const apiKey = Deno.env.get('COMPLYCUBE_API_KEY');
    if (!apiKey) {
      throw new Error("COMPLYCUBE_API_KEY not configured");
    }

    console.log("✓ Creating flow session for client:", clientId);

    const origin = req.headers.get('origin') || 'https://da719f07-ecb4-495b-bd6f-038cc53aa18b.lovableproject.com';
    
    const flowSessionRequest = {
      clientId: clientId,
      checkTypes: ["extensive_screening_check", "identity_check", "document_check"],
      successUrl: `${origin}/vai-processing?complycube_client=${clientId}`,
      cancelUrl: `${origin}/verification-transition?cancelled=true`
    };

    console.log("Flow session request:", JSON.stringify(flowSessionRequest, null, 2));

    const response = await fetch("https://api.complycube.com/v1/flow/sessions", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(flowSessionRequest),
    });

    const responseText = await response.text();
    console.log("ComplyCube API response status:", response.status);
    console.log("ComplyCube API response body:", responseText);

    if (!response.ok) {
      console.error("✗ Flow session creation failed:", response.status, responseText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `ComplyCube API error: ${response.status} - ${responseText}`,
          flowSessionRequest
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const flowSessionResponse = JSON.parse(responseText);
    console.log("✓ Flow session created successfully");
    console.log("═══ ComplyCube Flow Session Creation SUCCESS ═══");

    return new Response(
      JSON.stringify({
        success: true,
        flowSessionResponse,
        flowSessionRequest
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("✗ Error in create-complycube-flow-session:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
