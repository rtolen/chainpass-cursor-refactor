import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReplayRequest {
  webhookEventId: string;
  targetUrl: string;
  customPayload?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { webhookEventId, targetUrl, customPayload }: ReplayRequest = await req.json();

    console.log(`Replaying webhook ${webhookEventId} to ${targetUrl}`);

    // Fetch original webhook event
    const { data: webhookEvent, error: webhookError } = await supabase
      .from("vairify_webhook_events")
      .select("*")
      .eq("id", webhookEventId)
      .single();

    if (webhookError || !webhookEvent) {
      throw new Error("Webhook event not found");
    }

    // Use custom payload if provided, otherwise use original
    const payload = customPayload || webhookEvent.payload;

    // Send webhook
    const startTime = Date.now();
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let success = false;
    let errorMessage: string | null = null;

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ChainPass-Event": webhookEvent.event_type,
          "X-ChainPass-Replay": "true",
        },
        body: JSON.stringify(payload),
      });

      responseStatus = response.status;
      responseBody = await response.text();
      success = response.ok;

      if (!response.ok) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error: any) {
      errorMessage = error.message;
      success = false;
    }

    const responseTime = Date.now() - startTime;

    // Log replay history
    const { error: logError } = await supabase
      .from("webhook_replay_history")
      .insert({
        original_webhook_id: webhookEventId,
        replayed_by: user.id,
        target_url: targetUrl,
        payload: payload,
        response_status: responseStatus,
        response_body: responseBody,
        response_time_ms: responseTime,
        success: success,
        error_message: errorMessage,
        replayed_at: new Date().toISOString(),
      });

    if (logError) {
      console.error("Error logging replay history:", logError);
    }

    return new Response(
      JSON.stringify({
        success: success,
        responseStatus: responseStatus,
        responseBody: responseBody,
        responseTime: responseTime,
        errorMessage: errorMessage,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error replaying webhook:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
