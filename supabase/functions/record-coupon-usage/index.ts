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
    console.log("[RECORD-COUPON-USAGE] Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { couponId, sessionId, userEmail } = await req.json();

    if (!couponId || !sessionId) {
      throw new Error("Coupon ID and session ID are required");
    }

    console.log("[RECORD-COUPON-USAGE] Recording usage for coupon:", couponId);

    // Record coupon usage
    const { error: usageError } = await supabaseClient
      .from("coupon_usage")
      .insert({
        coupon_id: couponId,
        session_id: sessionId,
        user_email: userEmail || null,
      });

    if (usageError) {
      throw new Error(`Failed to record coupon usage: ${usageError.message}`);
    }

    // Increment current_uses count - get current value first
    const { data: currentCoupon } = await supabaseClient
      .from("coupons")
      .select("current_uses")
      .eq("id", couponId)
      .single();

    if (currentCoupon) {
      const { error: updateError } = await supabaseClient
        .from("coupons")
        .update({ current_uses: currentCoupon.current_uses + 1 })
        .eq("id", couponId);

      if (updateError) {
        console.error("[RECORD-COUPON-USAGE] Update error:", updateError);
      }
    }

    console.log("[RECORD-COUPON-USAGE] Usage recorded successfully");

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[RECORD-COUPON-USAGE] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
