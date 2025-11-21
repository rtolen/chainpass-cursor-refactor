import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Creating test anomaly...');

    // Create a test anomaly
    const { data: anomaly, error: anomalyError } = await supabase
      .from('detected_anomalies')
      .insert({
        admin_user_id: '00000000-0000-0000-0000-000000000000', // Test user ID
        anomaly_type: 'test_alert',
        severity: 'high',
        description: 'Test alert triggered manually',
        confidence_score: 0.95,
        supporting_data: {
          test: true,
          timestamp: new Date().toISOString(),
          message: 'This is a test alert to verify notification channels'
        }
      })
      .select()
      .single();

    if (anomalyError) {
      console.error('Error creating test anomaly:', anomalyError);
      throw anomalyError;
    }

    console.log('Test anomaly created:', anomaly.id);

    // Invoke the send-alert-notification function
    const { data: alertResult, error: alertError } = await supabase.functions.invoke(
      'send-alert-notification',
      {
        body: {
          anomalyId: anomaly.id,
          eventType: 'test_alert'
        }
      }
    );

    if (alertError) {
      console.error('Error invoking alert notification:', alertError);
      throw alertError;
    }

    console.log('Alert notification result:', alertResult);

    // Fetch alert history to see what was sent
    const { data: alertHistory, error: historyError } = await supabase
      .from('alert_history')
      .select('*')
      .order('triggered_at', { ascending: false })
      .limit(5);

    if (historyError) {
      console.error('Error fetching alert history:', historyError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test alert triggered successfully',
        anomaly: {
          id: anomaly.id,
          type: anomaly.anomaly_type,
          severity: anomaly.severity,
          description: anomaly.description
        },
        alertResult,
        recentAlerts: alertHistory || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error in test-alert-notification function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
