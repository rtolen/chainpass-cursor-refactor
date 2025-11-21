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
    console.log("═══ ComplyCube SDK Token Generation START ═══");
    
    const COMPLYCUBE_API_KEY = Deno.env.get("COMPLYCUBE_API_KEY");
    
    if (!COMPLYCUBE_API_KEY) {
      throw new Error("COMPLYCUBE_API_KEY not configured");
    }
    
    if (!COMPLYCUBE_API_KEY.startsWith("test_") && !COMPLYCUBE_API_KEY.startsWith("live_")) {
      throw new Error("Invalid API key format");
    }
    
    console.log("✓ API Key validated");
    
    const { sessionId, email, phoneNumber, firstName, lastName } = await req.json();
    
    if (!sessionId) {
      throw new Error("sessionId is required");
    }
    
    const finalEmail = email || `user-${sessionId.substring(0, 8)}@chainpass.temp`;
    
    // Create ComplyCube Client
    const clientPayload = {
      type: "person",
      email: finalEmail,
      personDetails: {
        firstName: firstName || "User",
        lastName: lastName || "Member",
      }
    };
    
    const clientResponse = await fetch("https://api.complycube.com/v1/clients", {
      method: "POST",
      headers: {
        "Authorization": COMPLYCUBE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(clientPayload),
    });

    if (!clientResponse.ok) {
      const errorText = await clientResponse.text();
      console.error("✗ Client creation failed:", errorText);
      throw new Error(`Client creation failed: ${clientResponse.status} - ${errorText}`);
    }

    const clientData = await clientResponse.json();
    console.log("✓ Client created:", clientData.id);

    // Generate SDK Token
    console.log("Generating SDK token...");
    
    const tokenResponse = await fetch("https://api.complycube.com/v1/tokens", {
      method: "POST",
      headers: {
        "Authorization": COMPLYCUBE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: clientData.id,
        referrer: "*://chainpass.lovable.app/*"
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("✗ Token generation failed:", errorText);
      throw new Error(`Token generation failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log("✓ SDK Token generated");

    // Create ComplyCube Flow Session
    console.log("Creating flow session...");
    
    const origin = req.headers.get('origin') || 'https://da719f07-ecb4-495b-bd6f-038cc53aa18b.lovableproject.com';
    
    const flowSessionRequest = {
      clientId: clientData.id,
      checkTypes: ["extensive_screening_check", "identity_check", "document_check"],
      successUrl: `${origin}/vai-processing?complycube_client=${clientData.id}`,
      cancelUrl: `${origin}/verification-transition?cancelled=true`
    };

    const flowResponse = await fetch("https://api.complycube.com/v1/flow/sessions", {
      method: "POST",
      headers: {
        "Authorization": COMPLYCUBE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(flowSessionRequest),
    });

    if (!flowResponse.ok) {
      const errorText = await flowResponse.text();
      console.error("✗ Flow session creation failed:", errorText);
      throw new Error(`Flow session creation failed: ${flowResponse.status} - ${errorText}`);
    }

    const flowData = await flowResponse.json();
    console.log("✓ Flow session created");
    console.log("Redirect URL:", flowData.redirectUrl);

    // Store client ID in database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbError } = await supabase
      .from("verification_records")
      .update({
        complycube_client_id: clientData.id,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (dbError) {
      console.error("⚠ Database update failed:", dbError);
    } else {
      console.log("✓ Database updated");
    }

    console.log("═══ ComplyCube SDK Token Generation SUCCESS ═══");

    return new Response(
      JSON.stringify({
        success: true,
        token: tokenData.token,
        clientId: clientData.id,
        clientPayload,
        redirectUrl: flowData.redirectUrl,
        flowSessionRequest,
        flowSessionResponse: flowData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("═══ ComplyCube SDK Token Generation FAILED ═══");
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
