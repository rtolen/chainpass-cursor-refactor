import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateWebhookSignature, createSignatureHeader } from "../_shared/webhookSecurity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  vai_number: string;
  user_id: string;
  verification_status: string;
  verified_at?: string;
  callback_data?: any;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let webhookQueueId: string | null = null;

  try {
    const { vai_number, user_id, verification_status, callback_data } = await req.json() as WebhookPayload;

    console.log("Processing webhook for VAI:", vai_number);

    // Find the business partner associated with this VAI
    const { data: vaiAssignment, error: vaiError } = await supabase
      .from("vai_assignments")
      .select(`
        *,
        verification_records!inner(session_id)
      `)
      .eq("vai_code", vai_number)
      .single();

    if (vaiError || !vaiAssignment) {
      console.error("VAI assignment not found:", vaiError);
      return new Response(
        JSON.stringify({ error: "VAI assignment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionId = vaiAssignment.verification_records.session_id;

    // Extract business partner ID from session ID if needed
    // Session format: {businessId}_{timestamp}
    let businessPartnerId: string | null = null;
    
    if (sessionId.includes("_")) {
      businessPartnerId = sessionId.split("_")[0];
    }

    if (!businessPartnerId) {
      console.log("No business partner associated with this session");
      return new Response(
        JSON.stringify({ message: "No business partner callback required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get business partner details
    const { data: partner, error: partnerError } = await supabase
      .from("business_partners")
      .select("*")
      .eq("id", businessPartnerId)
      .single();

    if (partnerError || !partner) {
      console.error("Business partner not found:", partnerError);
      return new Response(
        JSON.stringify({ error: "Business partner not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!partner.callback_url || !partner.api_key) {
      console.log("Business partner has no callback URL or API key configured");
      return new Response(
        JSON.stringify({ message: "No callback URL or API key configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Business partner found:", partner.business_name);

    // Prepare webhook payload
    const webhookPayload: WebhookPayload = {
      vai_number,
      user_id,
      verification_status,
      verified_at: new Date().toISOString(),
      callback_data: callback_data || {},
    };

    // Create entry in webhook delivery queue
    const { data: queueEntry, error: queueError } = await supabase
      .from('webhook_delivery_queue')
      .insert({
        business_partner_id: partner.id,
        callback_url: partner.callback_url,
        payload: webhookPayload,
        status: 'pending',
        next_retry_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (queueError) {
      console.error('Error creating webhook queue entry:', queueError);
      throw queueError;
    }

    webhookQueueId = queueEntry.id;
    console.log('Created webhook queue entry:', webhookQueueId);

    // Generate signature for immediate delivery attempt
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await generateWebhookSignature(webhookPayload, partner.api_key, timestamp);
    const signatureHeader = createSignatureHeader(timestamp, signature);

    console.log("Attempting immediate webhook delivery to:", partner.callback_url);

    // Attempt immediate delivery
    const startTime = Date.now();
    let webhookResponse: Response | undefined;
    let success = false;
    let errorMessage: string | null = null;

    try {
      webhookResponse = await fetch(partner.callback_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signatureHeader,
        },
        body: JSON.stringify(webhookPayload),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      success = webhookResponse.ok;
      if (!success) {
        errorMessage = `HTTP ${webhookResponse.status}: ${await webhookResponse.text()}`;
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Webhook delivery failed:", errorMessage);
    }

    const responseTime = Date.now() - startTime;
    const responseStatus = webhookResponse?.status || 0;
    const responseBody = success && webhookResponse 
      ? await webhookResponse.text() 
      : errorMessage || "Unknown error";

    console.log(`Webhook delivery ${success ? 'succeeded' : 'failed'}:`, {
      status: responseStatus,
      responseTime,
      responseBody: responseBody.substring(0, 500),
    });

    // Update webhook queue entry
    const nextRetryDelay = success ? null : 30; // 30 seconds for first retry
    await supabase
      .from('webhook_delivery_queue')
      .update({
        status: success ? 'success' : 'failed',
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
        response_status: responseStatus,
        response_body: responseBody.substring(0, 1000),
        response_time_ms: responseTime,
        last_error: success ? null : errorMessage,
        next_retry_at: success ? null : new Date(Date.now() + nextRetryDelay! * 1000).toISOString(),
        completed_at: success ? new Date().toISOString() : null,
      })
      .eq('id', webhookQueueId);

    // Log webhook test to history
    await supabase
      .from("webhook_test_history")
      .insert({
        business_partner_id: partner.id,
        callback_url: partner.callback_url,
        test_payload: webhookPayload,
        success,
        response_status: responseStatus,
        response_body: responseBody.substring(0, 1000),
        response_time_ms: responseTime,
        error_message: success ? null : (errorMessage || responseBody).substring(0, 500),
      });

    // Log API usage only for successful deliveries
    if (success) {
      await supabase
        .from("api_usage_logs")
        .insert({
          business_partner_id: partner.id,
          endpoint: "/webhook/vai-verification",
          method: "POST",
          status_code: responseStatus,
          response_time_ms: responseTime,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: success 
          ? 'Webhook delivered successfully'
          : 'Webhook delivery failed, will retry automatically',
        webhook_sent: success,
        response_status: responseStatus,
        retry_scheduled: !success,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-to-business:", error);

    // Update webhook queue entry on error
    if (webhookQueueId) {
      try {
        await supabase
          .from('webhook_delivery_queue')
          .update({
            status: 'failed',
            attempts: 1,
            last_attempt_at: new Date().toISOString(),
            last_error: error instanceof Error ? error.message : String(error),
            next_retry_at: new Date(Date.now() + 30000).toISOString(), // Retry in 30 seconds
          })
          .eq('id', webhookQueueId);
      } catch (updateError) {
        console.error('Failed to update webhook queue on error:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error) 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
