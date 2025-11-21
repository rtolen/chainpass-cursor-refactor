import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ErrorLogRequest {
  errorType: "frontend" | "backend" | "api" | "webhook" | "database";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  stackTrace?: string;
  context?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
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
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const errorData: ErrorLogRequest = await req.json();

    console.log(`Logging ${errorData.severity} ${errorData.errorType} error:`, errorData.message);

    // Insert error log
    const { data, error } = await supabase
      .from("error_logs")
      .insert({
        user_id: userId,
        error_type: errorData.errorType,
        severity: errorData.severity,
        message: errorData.message,
        stack_trace: errorData.stackTrace || null,
        context: errorData.context || null,
        user_agent: errorData.userAgent || null,
        ip_address: errorData.ipAddress || null,
        occurred_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting error log:", error);
      throw error;
    }

    // Send admin alert for critical errors
    if (errorData.severity === "critical") {
      console.log("Sending admin alert for critical error");
      
      await supabase.functions.invoke("send-email", {
        body: {
          to: "admin@chainpass.io",
          type: "admin_alert",
          data: {
            alertType: "Critical Error",
            severity: "critical",
            message: errorData.message,
            details: {
              errorType: errorData.errorType,
              stackTrace: errorData.stackTrace,
              context: errorData.context,
            },
          },
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, logId: data.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in log-error function:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
