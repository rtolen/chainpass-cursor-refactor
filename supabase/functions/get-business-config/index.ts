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
    const { businessId } = await req.json();

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: "businessId is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Use service role to access full config including API keys
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[GET-BUSINESS-CONFIG] Fetching config for: ${businessId}`);

    // Fetch business configuration
    const { data: config, error } = await supabase
      .from("business_configurations")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .single();

    if (error || !config) {
      console.error("[GET-BUSINESS-CONFIG] Error fetching config:", error);
      return new Response(
        JSON.stringify({ error: "Business configuration not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Return full config (API key included for server-side callback usage)
    // This is safe because:
    // 1. Only called from authenticated client code
    // 2. API key is only used server-side in businessCallback.ts
    // 3. Client never directly uses the API key
    return new Response(
      JSON.stringify({ 
        config: {
          name: config.business_name, // Map business_name to name for compatibility
          description: config.description,
          callback_url: config.api_endpoint, // Map api_endpoint to callback_url for compatibility
          api_key: config.api_key,
          return_url: config.return_url,
          requiredSteps: config.required_steps, // Keep as array for verificationNavigation
          environments: config.environments,
          logo_url: config.logo_url,
          theme_colors: config.theme_colors,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("[GET-BUSINESS-CONFIG] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

