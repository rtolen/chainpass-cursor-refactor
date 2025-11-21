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
    const { anomalyId, eventType } = await req.json();
    
    console.log(`Processing alert for ${eventType}:`, anomalyId);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the anomaly details
    const { data: anomaly, error: anomalyError } = await supabaseAdmin
      .from("detected_anomalies")
      .select("*")
      .eq("id", anomalyId)
      .single();

    if (anomalyError || !anomaly) {
      throw new Error("Anomaly not found");
    }

    // Get matching alert settings
    const { data: alertSettings, error: settingsError } = await supabaseAdmin
      .from("alert_settings")
      .select("*")
      .eq("enabled", true)
      .eq("alert_type", eventType === "anomaly" ? "anomaly" : "security_event")
      .contains("severity_threshold", [anomaly.severity]);

    if (settingsError || !alertSettings || alertSettings.length === 0) {
      console.log("No matching alert settings found");
      return new Response(
        JSON.stringify({ message: "No alerts configured for this event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const setting of alertSettings) {
      // Check cooldown period
      if (setting.last_triggered_at) {
        const lastTriggered = new Date(setting.last_triggered_at);
        const cooldownEnd = new Date(lastTriggered.getTime() + setting.cooldown_minutes * 60000);
        
        if (new Date() < cooldownEnd) {
          console.log(`Alert ${setting.alert_name} is in cooldown period`);
          continue;
        }
      }

      const alertData = {
        title: `🚨 ${anomaly.severity.toUpperCase()}: ${anomaly.anomaly_type}`,
        message: anomaly.description,
        severity: anomaly.severity,
        timestamp: new Date(anomaly.detected_at || anomaly.created_at).toLocaleString(),
        confidence: `${Math.round(anomaly.confidence_score * 100)}%`,
      };

      const notificationResults = {
        email: false,
        slack: false,
        sms: false,
      };

      // Send Email notifications
      if (setting.notification_channels.includes("email") && setting.email_recipients?.length > 0) {
        try {
          const emailResult = await sendEmailAlert(setting.email_recipients, alertData);
          notificationResults.email = emailResult;
        } catch (error) {
          console.error("Email notification error:", error);
        }
      }

      // Send Slack notifications
      if (setting.notification_channels.includes("slack") && setting.slack_webhook_url) {
        try {
          const slackResult = await sendSlackAlert(setting.slack_webhook_url, setting.slack_channel, alertData);
          notificationResults.slack = slackResult;
        } catch (error) {
          console.error("Slack notification error:", error);
        }
      }

      // Send SMS notifications
      if (setting.notification_channels.includes("sms") && setting.sms_recipients?.length > 0) {
        try {
          const smsResult = await sendSMSAlert(setting.sms_recipients, alertData);
          notificationResults.sms = smsResult;
        } catch (error) {
          console.error("SMS notification error:", error);
        }
      }

      // Log to alert history
      await supabaseAdmin.from("alert_history").insert({
        alert_setting_id: setting.id,
        alert_type: eventType,
        severity: anomaly.severity,
        title: alertData.title,
        message: alertData.message,
        event_data: anomaly,
        notification_channels: setting.notification_channels,
        sent_successfully: Object.values(notificationResults).some(v => v),
      });

      // Update last triggered time
      await supabaseAdmin
        .from("alert_settings")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", setting.id);

      results.push({
        alert_name: setting.alert_name,
        notifications: notificationResults,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-alert-notification:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function sendEmailAlert(recipients: string[], alertData: any): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return false;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${alertData.severity === 'critical' ? '#dc2626' : '#ea580c'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">${alertData.title}</h1>
      </div>
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
          <strong>Alert:</strong> ${alertData.message}
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Severity:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${alertData.severity}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Confidence:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${alertData.confidence}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Timestamp:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${alertData.timestamp}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
          This is an automated security alert from your Admin Dashboard.
        </p>
      </div>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Security Alerts <onboarding@resend.dev>",
        to: recipients,
        subject: alertData.title,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

async function sendSlackAlert(webhookUrl: string, channel: string | null, alertData: any): Promise<boolean> {
  const color = alertData.severity === "critical" ? "#dc2626" : 
                alertData.severity === "high" ? "#ea580c" : "#f59e0b";

  const payload = {
    channel: channel || undefined,
    text: alertData.title,
    attachments: [
      {
        color: color,
        fields: [
          {
            title: "Message",
            value: alertData.message,
            short: false,
          },
          {
            title: "Severity",
            value: alertData.severity,
            short: true,
          },
          {
            title: "Confidence",
            value: alertData.confidence,
            short: true,
          },
          {
            title: "Timestamp",
            value: alertData.timestamp,
            short: false,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error("Slack send error:", error);
    return false;
  }
}

async function sendSMSAlert(recipients: string[], alertData: any): Promise<boolean> {
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("Twilio credentials not configured");
    return false;
  }

  const message = `${alertData.title}\n${alertData.message}\nSeverity: ${alertData.severity}\nTime: ${alertData.timestamp}`;

  try {
    for (const recipient of recipients) {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: recipient,
            From: TWILIO_PHONE_NUMBER,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        console.error("Twilio error for", recipient);
      }
    }
    return true;
  } catch (error) {
    console.error("SMS send error:", error);
    return false;
  }
}
