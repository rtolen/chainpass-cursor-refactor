import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { callback_url, test_payload } = await req.json();

    if (!callback_url || !test_payload) {
      throw new Error('Callback URL and test payload are required');
    }

    // Get the business partner record
    const { data: partnerData, error: partnerError } = await supabase
      .from('business_partners')
      .select('id, business_name')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single();

    if (partnerError || !partnerData) {
      throw new Error('Business partner not found or not approved');
    }

    console.log(`Testing webhook for partner: ${partnerData.id}`);
    console.log(`Callback URL: ${callback_url}`);
    console.log(`Test payload:`, test_payload);

    // Send test webhook with timeout
    const startTime = Date.now();
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let success = false;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const webhookResponse = await fetch(callback_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ChainPass-Webhook-Tester/1.0',
          'X-ChainPass-Test': 'true',
        },
        body: JSON.stringify(test_payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      responseStatus = webhookResponse.status;
      responseBody = await webhookResponse.text();
      success = webhookResponse.ok;

      if (!success) {
        errorMessage = `HTTP ${responseStatus}: ${responseBody}`;
      }

      console.log(`Webhook response status: ${responseStatus}`);
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        errorMessage = 'Request timeout (10 seconds)';
      } else {
        errorMessage = err.message || 'Unknown error occurred';
      }
      console.error('Webhook test error:', errorMessage);
    }

    const responseTime = Date.now() - startTime;

    // Store test history
    const { error: historyError } = await supabase
      .from('webhook_test_history')
      .insert({
        business_partner_id: partnerData.id,
        test_payload,
        callback_url,
        response_status: responseStatus,
        response_body: responseBody,
        response_time_ms: responseTime,
        success,
        error_message: errorMessage,
      });

    if (historyError) {
      console.error('Error saving test history:', historyError);
    }

    return new Response(
      JSON.stringify({
        success,
        response_status: responseStatus,
        response_body: responseBody,
        response_time_ms: responseTime,
        error_message: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in test-webhook function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
