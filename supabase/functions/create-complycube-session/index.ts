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
    console.log("═══ ComplyCube Session Creation START ═══");
    
    // STEP 1: Validate environment
    const COMPLYCUBE_API_KEY = Deno.env.get("COMPLYCUBE_API_KEY");
    
    if (!COMPLYCUBE_API_KEY) {
      throw new Error("COMPLYCUBE_API_KEY not configured");
    }
    
    // Validate key format
    if (!COMPLYCUBE_API_KEY.startsWith("test_") && !COMPLYCUBE_API_KEY.startsWith("live_")) {
      throw new Error("Invalid API key format. Must start with 'test_' or 'live_'");
    }
    
    console.log("✓ API Key validated:", COMPLYCUBE_API_KEY.substring(0, 8) + "...");
    
    // STEP 2: Parse request
    const { sessionId, email, phoneNumber, firstName, lastName } = await req.json();
    
    if (!sessionId) {
      throw new Error("sessionId is required");
    }
    
    console.log("✓ Request parsed:", { 
      sessionId, 
      email: !!email, 
      phoneNumber: !!phoneNumber,
      firstName: !!firstName,
      lastName: !!lastName 
    });
    
    const finalEmail = email || `user-${sessionId.substring(0, 8)}@chainpass.temp`;
    
    // STEP 3: Create ComplyCube Client
    console.log("Creating ComplyCube client...");
    
    const clientPayload: any = {
      type: "person",
      email: finalEmail,
    };
    
    // Add personDetails if we have firstName, lastName, or phoneNumber
    if (firstName || lastName || phoneNumber) {
      clientPayload.personDetails = {};
      
      if (firstName) clientPayload.personDetails.firstName = firstName;
      if (lastName) clientPayload.personDetails.lastName = lastName;
      if (phoneNumber) {
        clientPayload.mobile = phoneNumber;
        clientPayload.personDetails.mobile = phoneNumber;
      }
    }
    
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

    // STEP 4: Create Hosted Session (CORRECT ENDPOINT)
    console.log("Creating Hosted session...");
    
    const origin = req.headers.get("origin") || "https://chainpass.lovable.app";
    
    // CRITICAL FIX: Use /v1/hosted/sessions NOT /v1/flow/sessions
    const sessionPayload = {
      clientId: clientData.id,
      
      // CRITICAL FIX: Use documentTypes, not checkTypes
      documentTypes: ["passport", "driving_license", "national_identity_card"],
      
      // CRITICAL FIX: Use faceCheck with liveness
      faceCheck: {
        liveness: true
      },
      
      // Redirect URLs with clientId for tracking
      successUrl: `${origin}/verification-callback?status=success&clientId=${clientData.id}`,
      cancelUrl: `${origin}/verification-callback?status=cancelled&clientId=${clientData.id}`,
      
      // Optional: Customize UI
      theme: {
        primaryColor: "#3b82f6",
        backgroundColor: "#1a1a2e"
      }
    };
    
    console.log("Session payload:", JSON.stringify(sessionPayload, null, 2));

    // CRITICAL FIX: Correct endpoint
    const sessionResponse = await fetch("https://api.complycube.com/v1/hosted/sessions", {
      method: "POST",
      headers: {
        "Authorization": COMPLYCUBE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionPayload),
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error("✗ Session creation failed:", errorText);
      throw new Error(`Session creation failed: ${sessionResponse.status} - ${errorText}`);
    }

    const sessionData = await sessionResponse.json();
    
    // CRITICAL: Response field is 'url' not 'redirectUrl' in v2 API
    const sessionUrl = sessionData.url || sessionData.redirectUrl;
    
    if (!sessionUrl) {
      throw new Error("No session URL in response");
    }
    
    console.log("✓ Session created:", sessionData.id);
    console.log("✓ Session URL:", sessionUrl);

    // STEP 5: Store in database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbError } = await supabase
      .from("verification_records")
      .update({
        complycube_client_id: clientData.id,
        complycube_session_id: sessionData.id,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (dbError) {
      console.error("⚠ Database update failed:", dbError);
      // Don't fail the request, just log
    } else {
      console.log("✓ Database updated");
    }

    console.log("═══ ComplyCube Session Creation SUCCESS ═══");

    return new Response(
      JSON.stringify({
        success: true,
        sessionUrl: sessionUrl,
        clientId: clientData.id,
        sessionId: sessionData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("═══ ComplyCube Session Creation FAILED ═══");
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
