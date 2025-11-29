import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    console.log("[CREATE-PAYMENT-INTENT] Function started");

    // Initialize Stripe with keys
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripePublishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY");

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    if (!stripePublishableKey) {
      console.warn("[CREATE-PAYMENT-INTENT] STRIPE_PUBLISHABLE_KEY not configured – client may not be able to render card input.");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
    });

    // Parse request body
    const { 
      amount, 
      currency = "usd", 
      email, 
      metadata = {},
      paymentMethod = "card" // card, paypal, crypto
    } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    console.log("[CREATE-PAYMENT-INTENT] Creating payment intent", {
      amount,
      currency,
      email,
      paymentMethod,
    });

    // Determine payment method types based on selection
    let paymentMethodTypes: string[] = [];
    let automaticPaymentMethods = null;

    switch (paymentMethod) {
      case "paypal":
        paymentMethodTypes = ["paypal"];
        break;
      case "crypto":
        // For crypto, we'd typically integrate with a specialized provider
        // For now, return a special response indicating crypto processing
        return new Response(
          JSON.stringify({
            paymentMethod: "crypto",
            message: "Crypto payment processing - integration pending",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      case "card":
      default:
        // Use automatic payment methods for card payments
        automaticPaymentMethods = { enabled: true };
        break;
    }

    // Create payment intent configuration
    const paymentIntentConfig: any = {
      amount: Math.round(amount), // Amount in cents
      currency,
      receipt_email: email || undefined,
      metadata: {
        ...metadata,
        product: "V.A.I. Verification",
        payment_method_type: paymentMethod,
      },
    };

    // Add payment method configuration
    if (paymentMethodTypes.length > 0) {
      paymentIntentConfig.payment_method_types = paymentMethodTypes;
    } else if (automaticPaymentMethods) {
      paymentIntentConfig.automatic_payment_methods = automaticPaymentMethods;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);

    console.log("[CREATE-PAYMENT-INTENT] Payment intent created", {
      id: paymentIntent.id,
      status: paymentIntent.status,
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        publishableKey: stripePublishableKey ?? null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CREATE-PAYMENT-INTENT] Error:", error);
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
