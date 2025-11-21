import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ThresholdCheck {
  alert_id: string;
  alert_name: string;
  alert_type: string;
  severity: string;
  message: string;
  event_data: any;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    console.log("Starting API threshold checks...");

    // Get all enabled alert settings
    const { data: alertSettings, error: settingsError } = await supabase
      .from("alert_settings")
      .select("*")
      .eq("enabled", true);

    if (settingsError) throw settingsError;

    if (!alertSettings || alertSettings.length === 0) {
      console.log("No enabled alert settings found");
      return new Response(
        JSON.stringify({ message: "No enabled alerts" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API usage data from the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentLogs, error: logsError } = await supabase
      .from("api_usage_logs")
      .select("*")
      .gte("created_at", fiveMinutesAgo);

    if (logsError) throw logsError;

    console.log(`Analyzing ${recentLogs?.length || 0} recent API requests`);

    const alerts: ThresholdCheck[] = [];

    for (const setting of alertSettings) {
      // Check cooldown period
      if (setting.last_triggered_at) {
        const lastTriggered = new Date(setting.last_triggered_at);
        const cooldownEnd = new Date(lastTriggered.getTime() + (setting.cooldown_minutes || 15) * 60 * 1000);
        if (new Date() < cooldownEnd) {
          console.log(`Alert ${setting.alert_name} is in cooldown period`);
          continue;
        }
      }

      // Perform threshold checks based on alert type
      if (setting.alert_type === "error_rate" && recentLogs && recentLogs.length > 0) {
        const errorCount = recentLogs.filter(log => log.status_code >= 400).length;
        const errorRate = (errorCount / recentLogs.length) * 100;
        
        console.log(`Error rate: ${errorRate.toFixed(2)}%`);

        if (errorRate > 5) {
          alerts.push({
            alert_id: setting.id,
            alert_name: setting.alert_name,
            alert_type: setting.alert_type,
            severity: "high",
            message: `Error rate is ${errorRate.toFixed(2)}% (threshold: 5%)`,
            event_data: {
              error_rate: errorRate,
              total_requests: recentLogs.length,
              error_count: errorCount,
              time_period: "5 minutes",
            },
          });
        }
      }

      if (setting.alert_type === "response_time" && recentLogs && recentLogs.length > 0) {
        const logsWithTime = recentLogs.filter(log => log.response_time_ms !== null);
        if (logsWithTime.length > 0) {
          const avgResponseTime = logsWithTime.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / logsWithTime.length;
          
          console.log(`Average response time: ${avgResponseTime.toFixed(0)}ms`);

          if (avgResponseTime > 2000) {
            alerts.push({
              alert_id: setting.id,
              alert_name: setting.alert_name,
              alert_type: setting.alert_type,
              severity: "medium",
              message: `Average response time is ${avgResponseTime.toFixed(0)}ms (threshold: 2000ms)`,
              event_data: {
                avg_response_time: avgResponseTime,
                total_requests: logsWithTime.length,
                time_period: "5 minutes",
              },
            });
          }
        }
      }

      if (setting.alert_type === "request_spike" && recentLogs) {
        // Get data from 10 minutes ago to compare
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: historicalLogs } = await supabase
          .from("api_usage_logs")
          .select("id")
          .gte("created_at", tenMinutesAgo)
          .lt("created_at", fiveMinutesAgo);

        const currentRate = recentLogs.length;
        const previousRate = historicalLogs?.length || 0;

        console.log(`Request rate: current=${currentRate}, previous=${previousRate}`);

        // Alert if current rate is 3x higher than previous period
        if (previousRate > 0 && currentRate > previousRate * 3) {
          alerts.push({
            alert_id: setting.id,
            alert_name: setting.alert_name,
            alert_type: setting.alert_type,
            severity: "high",
            message: `Request spike detected: ${currentRate} requests vs ${previousRate} in previous period (${((currentRate / previousRate) * 100).toFixed(0)}% increase)`,
            event_data: {
              current_requests: currentRate,
              previous_requests: previousRate,
              spike_ratio: currentRate / previousRate,
              time_period: "5 minutes",
            },
          });
        }
      }

      if (setting.alert_type === "endpoint_anomaly" && recentLogs && recentLogs.length > 0) {
        // Group requests by endpoint
        const endpointCounts = new Map<string, number>();
        recentLogs.forEach(log => {
          endpointCounts.set(log.endpoint, (endpointCounts.get(log.endpoint) || 0) + 1);
        });

        // Find endpoints with unusual activity (>50% of all requests)
        const totalRequests = recentLogs.length;
        for (const [endpoint, count] of endpointCounts.entries()) {
          const percentage = (count / totalRequests) * 100;
          if (percentage > 50) {
            alerts.push({
              alert_id: setting.id,
              alert_name: setting.alert_name,
              alert_type: setting.alert_type,
              severity: "medium",
              message: `Unusual activity on endpoint: ${endpoint} (${percentage.toFixed(0)}% of all requests)`,
              event_data: {
                endpoint,
                request_count: count,
                percentage,
                total_requests: totalRequests,
                time_period: "5 minutes",
              },
            });
          }
        }
      }
    }

    console.log(`Found ${alerts.length} threshold violations`);

    // Send notifications for each alert
    for (const alert of alerts) {
      const setting = alertSettings.find(s => s.id === alert.alert_id);
      if (!setting) continue;

      const notifications = setting.notification_channels || ["email"];
      const severityThreshold = setting.severity_threshold || ["high", "critical"];
      
      // Check if alert severity meets threshold
      if (!severityThreshold.includes(alert.severity)) {
        console.log(`Alert severity ${alert.severity} doesn't meet threshold ${severityThreshold}`);
        continue;
      }

      let emailSent = false;
      let slackSent = false;

      // Send email notification
      if (notifications.includes("email") && setting.email_recipients && setting.email_recipients.length > 0) {
        try {
          await resend.emails.send({
            from: "ChainPass Alerts <alerts@resend.dev>",
            to: setting.email_recipients,
            subject: `[${alert.severity.toUpperCase()}] ${alert.alert_name}`,
            html: `
              <h2>API Threshold Alert</h2>
              <p><strong>Alert:</strong> ${alert.alert_name}</p>
              <p><strong>Type:</strong> ${alert.alert_type}</p>
              <p><strong>Severity:</strong> ${alert.severity}</p>
              <p><strong>Message:</strong> ${alert.message}</p>
              <h3>Details:</h3>
              <pre>${JSON.stringify(alert.event_data, null, 2)}</pre>
              <p><em>Triggered at ${new Date().toISOString()}</em></p>
            `,
          });
          emailSent = true;
          console.log(`Email sent for alert: ${alert.alert_name}`);
        } catch (error) {
          console.error("Error sending email:", error);
        }
      }

      // Send Slack notification
      if (notifications.includes("slack") && setting.slack_webhook_url) {
        try {
          const slackPayload = {
            text: `🚨 *${alert.alert_name}*`,
            blocks: [
              {
                type: "header",
                text: {
                  type: "plain_text",
                  text: `🚨 ${alert.alert_name}`,
                },
              },
              {
                type: "section",
                fields: [
                  {
                    type: "mrkdwn",
                    text: `*Type:*\n${alert.alert_type}`,
                  },
                  {
                    type: "mrkdwn",
                    text: `*Severity:*\n${alert.severity}`,
                  },
                ],
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Message:*\n${alert.message}`,
                },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `\`\`\`${JSON.stringify(alert.event_data, null, 2)}\`\`\``,
                },
              },
            ],
          };

          const slackResponse = await fetch(setting.slack_webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(slackPayload),
          });

          if (slackResponse.ok) {
            slackSent = true;
            console.log(`Slack notification sent for alert: ${alert.alert_name}`);
          }
        } catch (error) {
          console.error("Error sending Slack notification:", error);
        }
      }

      // Log to alert history
      await supabase.from("alert_history").insert({
        alert_setting_id: alert.alert_id,
        alert_type: alert.alert_type,
        title: alert.alert_name,
        message: alert.message,
        severity: alert.severity,
        event_data: alert.event_data,
        notification_channels: notifications,
        sent_successfully: emailSent || slackSent,
        error_message: !emailSent && !slackSent ? "Failed to send notifications" : null,
      });

      // Update last_triggered_at
      await supabase
        .from("alert_settings")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", alert.alert_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_triggered: alerts.length,
        message: `Processed ${alertSettings.length} alert settings, triggered ${alerts.length} alerts`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in check-api-thresholds:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
