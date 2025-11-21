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
    console.log("[VALIDATE-COUPON] Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { code, sessionId } = await req.json();

    if (!code) {
      throw new Error("Coupon code is required");
    }

    console.log("[VALIDATE-COUPON] Validating code:", code);

    // Get coupon details
    const { data: coupon, error: couponError } = await supabaseClient
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (couponError || !coupon) {
      console.log("[VALIDATE-COUPON] Coupon not found");
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Invalid or inactive coupon code" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check if coupon has reached max uses (if not multi-use)
    if (!coupon.multi_use) {
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: "This coupon has reached its maximum usage limit" 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // Check if this session has already used this coupon
      const { data: existingUsage } = await supabaseClient
        .from("coupon_usage")
        .select("id")
        .eq("coupon_id", coupon.id)
        .eq("session_id", sessionId)
        .single();

      if (existingUsage) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: "This coupon has already been used in this session" 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    console.log("[VALIDATE-COUPON] Coupon valid:", coupon.code);

    return new Response(
      JSON.stringify({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          discount_percentage: coupon.discount_percentage,
          description: coupon.description,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[VALIDATE-COUPON] Error:", error);
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
