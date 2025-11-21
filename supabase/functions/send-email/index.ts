import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  userId?: string;
  type: "verification_status" | "payment_confirmation" | "webhook_failure" | "admin_alert" | "system_update";
  data: Record<string, any>;
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

    const { to, userId, type, data }: EmailRequest = await req.json();

    console.log(`Sending ${type} email to ${to}`);

    // Generate email content based on type
    const emailContent = generateEmailContent(type, data);

    // Send email via Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "ChainPass <notifications@chainpass.io>",
        to: [to],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    // Log to database
    const { error: logError } = await supabase
      .from("email_notifications")
      .insert({
        recipient_email: to,
        recipient_user_id: userId || null,
        notification_type: type,
        subject: emailContent.subject,
        template_name: type,
        template_data: data,
        status: "sent",
        sent_at: new Date().toISOString(),
        resend_message_id: emailData.id || null,
      });

    if (logError) {
      console.error("Error logging email notification:", logError);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: emailData.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

function generateEmailContent(type: string, data: Record<string, any>) {
  switch (type) {
    case "verification_status":
      return {
        subject: `Verification ${data.status} - ChainPass`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Verification Update</h1>
            <p>Your verification status has been updated to: <strong>${data.status}</strong></p>
            ${data.vaiCode ? `<p>Your V.A.I. Code: <strong>${data.vaiCode}</strong></p>` : ''}
            ${data.message ? `<p>${data.message}</p>` : ''}
            <p style="margin-top: 30px; color: #666;">Thank you for using ChainPass</p>
          </div>
        `,
      };

    case "payment_confirmation":
      return {
        subject: "Payment Confirmed - ChainPass",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981;">Payment Confirmed</h1>
            <p>We've received your payment of <strong>$${data.amount}</strong></p>
            <p>Transaction ID: ${data.transactionId}</p>
            <p>Your verification process will continue shortly.</p>
            <p style="margin-top: 30px; color: #666;">Thank you for using ChainPass</p>
          </div>
        `,
      };

    case "webhook_failure":
      return {
        subject: "Webhook Delivery Failed - ChainPass",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">Webhook Delivery Failed</h1>
            <p>We were unable to deliver a webhook to your endpoint:</p>
            <p><strong>Endpoint:</strong> ${data.endpoint}</p>
            <p><strong>Event:</strong> ${data.eventType}</p>
            <p><strong>Error:</strong> ${data.error}</p>
            <p><strong>Attempts:</strong> ${data.attempts} of ${data.maxAttempts}</p>
            <p style="margin-top: 20px;">Please check your webhook endpoint configuration.</p>
            <p style="margin-top: 30px; color: #666;">ChainPass Team</p>
          </div>
        `,
      };

    case "admin_alert":
      return {
        subject: `Admin Alert: ${data.alertType} - ChainPass`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">Admin Alert</h1>
            <p><strong>Alert Type:</strong> ${data.alertType}</p>
            <p><strong>Severity:</strong> ${data.severity}</p>
            <p><strong>Message:</strong> ${data.message}</p>
            ${data.details ? `<pre style="background: #f3f4f6; padding: 10px; border-radius: 5px;">${JSON.stringify(data.details, null, 2)}</pre>` : ''}
            <p style="margin-top: 30px; color: #666;">ChainPass Admin System</p>
          </div>
        `,
      };

    case "system_update":
      return {
        subject: "System Update - ChainPass",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">System Update</h1>
            <p><strong>${data.title}</strong></p>
            <p>${data.message}</p>
            ${data.link ? `<p><a href="${data.link}" style="color: #2563eb;">Learn more</a></p>` : ''}
            <p style="margin-top: 30px; color: #666;">ChainPass Team</p>
          </div>
        `,
      };

    default:
      return {
        subject: "Notification - ChainPass",
        html: `<p>${data.message || "You have a new notification"}</p>`,
      };
  }
}
