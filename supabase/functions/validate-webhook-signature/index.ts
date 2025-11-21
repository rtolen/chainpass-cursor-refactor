import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { validateWebhookSignature, parseSignatureHeader } from "../_shared/webhookSecurity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

interface ValidationRequest {
  payload: any;
  signature_header: string;
  api_key: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { payload, signature_header, api_key } = await req.json() as ValidationRequest;

    console.log("Validating webhook signature");

    // Parse signature header
    const signatureComponents = parseSignatureHeader(signature_header);
    
    if (!signatureComponents) {
      // Log invalid signature format
      await supabase.from("alert_history").insert({
        alert_type: "webhook_security",
        title: "Invalid Webhook Signature Format",
        message: "Received webhook with malformed signature header",
        severity: "medium",
        event_data: {
          signature_header,
          error: "Invalid signature format",
        },
        sent_successfully: true,
      });

      return new Response(
        JSON.stringify({
          valid: false,
          error: "Invalid signature format. Expected: t=<timestamp>,v1=<signature>",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { timestamp, signature } = signatureComponents;

    // Validate signature
    const validation = await validateWebhookSignature(
      payload,
      signature,
      api_key,
      timestamp,
      300 // 5 minute tolerance
    );

    if (!validation.valid) {
      // Log signature mismatch for security auditing
      await supabase.from("alert_history").insert({
        alert_type: "webhook_security",
        title: "Webhook Signature Validation Failed",
        message: `Signature validation failed: ${validation.error}`,
        severity: "high",
        event_data: {
          timestamp,
          signature_provided: signature,
          error: validation.error,
          payload_hash: await hashPayload(payload),
          current_timestamp: Math.floor(Date.now() / 1000),
        },
        sent_successfully: true,
      });

      console.warn("Signature validation failed:", validation.error);
    }

    return new Response(
      JSON.stringify({
        valid: validation.valid,
        error: validation.error,
        timestamp,
        current_time: Math.floor(Date.now() / 1000),
      }),
      {
        status: validation.valid ? 200 : 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error validating webhook signature:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function hashPayload(payload: any): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
