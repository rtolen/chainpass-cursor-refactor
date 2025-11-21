import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface WebhookQueueItem {
  id: string;
  business_partner_id: string;
  callback_url: string;
  payload: any;
  attempts: number;
  max_attempts: number;
}

/**
 * Calculate next retry delay using exponential backoff
 * 1st retry: 30 seconds
 * 2nd retry: 2 minutes
 * 3rd retry: 8 minutes
 * 4th retry: 32 minutes
 * 5th retry: 2 hours
 */
function calculateNextRetryDelay(attempts: number): number {
  const baseDelay = 30; // 30 seconds
  const delaySeconds = baseDelay * Math.pow(4, attempts);
  return Math.min(delaySeconds, 7200); // Max 2 hours
}

/**
 * Send email notification to admins when webhook exhausts all retry attempts
 */
async function sendExhaustedWebhookNotification(
  supabase: any,
  webhook: WebhookQueueItem,
  lastError: string
): Promise<void> {
  try {
    // Get admin emails
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found to notify');
      return;
    }

    const userIds = adminUsers.map((u: any) => u.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('email')
      .in('id', userIds)
      .not('email', 'is', null);

    if (!profiles || profiles.length === 0) {
      console.log('No admin email addresses found');
      return;
    }

    const adminEmails = profiles.map((p: any) => p.email).filter(Boolean);

    // Get business partner info
    const { data: partner } = await supabase
      .from('business_partners')
      .select('business_name, contact_email')
      .eq('id', webhook.business_partner_id)
      .single();

    // Send email notification via Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Lovable <onboarding@resend.dev>',
        to: adminEmails,
        subject: '🚨 Webhook Delivery Failed - Manual Intervention Required',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⚠️ Webhook Delivery Exhausted</h2>
          <p>A webhook has failed after ${webhook.max_attempts} retry attempts and requires manual intervention.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Webhook Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Webhook ID:</strong></td>
                <td style="padding: 8px 0;">${webhook.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Business Partner:</strong></td>
                <td style="padding: 8px 0;">${partner?.business_name || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Contact Email:</strong></td>
                <td style="padding: 8px 0;">${partner?.contact_email || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Callback URL:</strong></td>
                <td style="padding: 8px 0; word-break: break-all;">${webhook.callback_url}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Total Attempts:</strong></td>
                <td style="padding: 8px 0;">${webhook.attempts + 1} / ${webhook.max_attempts}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Last Error:</strong></td>
                <td style="padding: 8px 0; color: #dc2626;">${lastError}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h4 style="margin-top: 0; color: #991b1b;">Required Actions</h4>
            <ul style="color: #7f1d1d; margin-bottom: 0;">
              <li>Verify the callback URL is correct and accessible</li>
              <li>Check with the business partner about their webhook endpoint status</li>
              <li>Review the payload and error details in the admin dashboard</li>
              <li>Consider manually retrying the webhook or updating the callback URL</li>
            </ul>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from the VAI Verification System.</p>
          </div>
        </div>
      `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Failed to send email:', errorText);
    } else {
      console.log(`Sent exhausted webhook notification for ${webhook.id} to ${adminEmails.length} admin(s)`);
    }
  } catch (error) {
    console.error('Error sending exhausted webhook notification:', error);
    // Don't throw - we don't want to fail the entire process if email fails
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting webhook retry process...');

    // Find webhooks ready for retry
    const { data: webhooksToRetry, error: fetchError } = await supabase
      .from('webhook_delivery_queue')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('next_retry_at', new Date().toISOString())
      .lt('attempts', supabase.rpc('max_attempts'))
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('Error fetching webhooks to retry:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${webhooksToRetry?.length || 0} webhooks to retry`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      exhausted: 0,
    };

    for (const webhook of (webhooksToRetry || [])) {
      results.processed++;
      
      // Update status to retrying
      await supabase
        .from('webhook_delivery_queue')
        .update({ status: 'retrying' })
        .eq('id', webhook.id);

      const startTime = Date.now();
      let success = false;
      let errorMessage = '';
      let responseStatus: number | null = null;
      let responseBody = '';

      try {
        console.log(`Retrying webhook ${webhook.id} (attempt ${webhook.attempts + 1}/${webhook.max_attempts})`);

        // Fetch API key for the business partner
        const { data: partner } = await supabase
          .from('business_partners')
          .select('api_key')
          .eq('id', webhook.business_partner_id)
          .single();

        if (!partner?.api_key) {
          throw new Error('Business partner API key not found');
        }

        // Send webhook
        const response = await fetch(webhook.callback_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': partner.api_key,
          },
          body: JSON.stringify(webhook.payload),
          signal: AbortSignal.timeout(30000), // 30s timeout
        });

        responseStatus = response.status;
        responseBody = await response.text();

        if (response.ok) {
          success = true;
          results.succeeded++;
          console.log(`Webhook ${webhook.id} delivered successfully`);
        } else {
          throw new Error(`HTTP ${response.status}: ${responseBody}`);
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
        results.failed++;
        console.error(`Webhook ${webhook.id} failed:`, error);
      }

      const responseTime = Date.now() - startTime;
      const newAttempts = webhook.attempts + 1;

      // Determine next state
      let newStatus = success ? 'success' : 'failed';
      let nextRetryAt: string | null = null;
      let completedAt: string | null = null;

      if (success) {
        completedAt = new Date().toISOString();
      } else if (newAttempts >= webhook.max_attempts) {
        // Max attempts reached
        newStatus = 'failed';
        completedAt = new Date().toISOString();
        results.exhausted++;
        console.log(`Webhook ${webhook.id} exhausted all retry attempts`);
        
        // Send email notification to admins
        await sendExhaustedWebhookNotification(supabase, webhook, errorMessage);
      } else {
        // Schedule next retry
        const delaySeconds = calculateNextRetryDelay(newAttempts);
        nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
        console.log(`Webhook ${webhook.id} scheduled for retry in ${delaySeconds} seconds`);
      }

      // Update webhook record
      await supabase
        .from('webhook_delivery_queue')
        .update({
          status: newStatus,
          attempts: newAttempts,
          last_error: success ? null : errorMessage,
          last_attempt_at: new Date().toISOString(),
          response_status: responseStatus,
          response_body: responseBody.substring(0, 1000), // Limit size
          response_time_ms: responseTime,
          next_retry_at: nextRetryAt,
          completed_at: completedAt,
        })
        .eq('id', webhook.id);

      // Log to api_usage_logs for successful deliveries
      if (success) {
        await supabase
          .from('api_usage_logs')
          .insert({
            business_partner_id: webhook.business_partner_id,
            endpoint: '/webhook/vai-verification',
            method: 'POST',
            status_code: responseStatus!,
            response_time_ms: responseTime,
          });
      }
    }

    console.log('Webhook retry process completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Processed ${results.processed} webhooks: ${results.succeeded} succeeded, ${results.failed} failed, ${results.exhausted} exhausted`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in retry-failed-webhooks:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
