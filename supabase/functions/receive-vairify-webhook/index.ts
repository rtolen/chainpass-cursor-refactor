import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-vairify-signature',
};

interface VairifyWebhookPayload {
  event_type: 'user.status_changed' | 'user.account_updated' | 'user.vai_revoked' | 'user.vai_suspended';
  user_id: string;
  vai_number: string;
  timestamp: string;
  data: {
    status?: string;
    reason?: string;
    [key: string]: any;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get webhook signature from header
    const signature = req.headers.get('x-vairify-signature');
    const webhookSecret = Deno.env.get('VAIRIFY_WEBHOOK_SECRET');

    // Validate signature if secret is configured
    if (webhookSecret && signature) {
      const payload = await req.text();
      const encoder = new TextEncoder();
      const data = encoder.encode(payload + webhookSecret);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (webhookSecret) {
      console.warn('Webhook secret configured but no signature provided');
    } else {
      console.warn('VAIRIFY_WEBHOOK_SECRET not configured - skipping signature validation');
    }

    // Parse webhook payload
    const webhookData: VairifyWebhookPayload = await req.json();

    console.log('Received webhook:', {
      event_type: webhookData.event_type,
      user_id: webhookData.user_id,
      vai_number: webhookData.vai_number,
    });

    // Store webhook event
    const { data: webhookEvent, error: webhookError } = await supabaseClient
      .from('vairify_webhook_events')
      .insert({
        event_type: webhookData.event_type,
        user_id: webhookData.user_id,
        vai_number: webhookData.vai_number,
        payload: webhookData,
        signature: signature || null,
        processed: false,
      })
      .select()
      .single();

    if (webhookError) {
      console.error('Error storing webhook event:', webhookError);
      throw webhookError;
    }

    // Process the webhook and create status update
    const { error: statusError } = await supabaseClient
      .from('vai_status_updates')
      .insert({
        vai_number: webhookData.vai_number,
        status_type: webhookData.event_type,
        status_data: webhookData.data,
        webhook_event_id: webhookEvent.id,
      });

    if (statusError) {
      console.error('Error creating status update:', statusError);
      throw statusError;
    }

    // Mark webhook as processed
    await supabaseClient
      .from('vairify_webhook_events')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('id', webhookEvent.id);

    console.log('Webhook processed successfully:', webhookEvent.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received and processed',
        event_id: webhookEvent.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
