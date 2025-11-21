import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get digest settings
    const { data: settings, error: settingsError } = await supabase
      .from('email_digest_settings')
      .select('*')
      .single();

    if (settingsError || !settings || !settings.enabled) {
      return new Response(
        JSON.stringify({ message: 'Email digest is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('email_digest_recipients')
      .select('*')
      .eq('active', true);

    if (recipientsError || !recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active recipients configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine date range based on frequency
    const now = new Date();
    const startDate = new Date();
    if (settings.frequency === 'daily') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (settings.frequency === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (settings.frequency === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Gather data
    const summaryData: any = {
      period: settings.frequency,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    };

    // 1. Activity Summary
    if (settings.include_activity_summary) {
      const { data: logs } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .gte('created_at', startDate.toISOString());

      const adminIds = [...new Set((logs || []).map(log => log.admin_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', adminIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p.email || p.full_name || 'Unknown';
        return acc;
      }, {} as Record<string, string>);

      const actionCounts: Record<string, number> = {};
      const adminCounts: Record<string, number> = {};
      
      (logs || []).forEach(log => {
        actionCounts[log.action_type] = (actionCounts[log.action_type] || 0) + 1;
        adminCounts[log.admin_user_id] = (adminCounts[log.admin_user_id] || 0) + 1;
      });

      summaryData.activity = {
        totalActions: logs?.length || 0,
        topActions: Object.entries(actionCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([action, count]) => ({ action, count })),
        topAdmins: Object.entries(adminCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => ({ name: profileMap[id], count })),
      };
    }

    // 2. Anomaly Report
    if (settings.include_anomaly_report) {
      const { data: anomalies } = await supabase
        .from('detected_anomalies')
        .select('*')
        .gte('detected_at', startDate.toISOString())
        .eq('resolved', false);

      summaryData.anomalies = {
        total: anomalies?.length || 0,
        bySeverity: {
          critical: anomalies?.filter(a => a.severity === 'critical').length || 0,
          high: anomalies?.filter(a => a.severity === 'high').length || 0,
          medium: anomalies?.filter(a => a.severity === 'medium').length || 0,
          low: anomalies?.filter(a => a.severity === 'low').length || 0,
        },
        unresolved: anomalies || [],
      };
    }

    // 3. Performance Metrics
    if (settings.include_performance_metrics) {
      const { data: logs } = await supabase
        .from('admin_activity_logs')
        .select('admin_user_id, created_at')
        .gte('created_at', startDate.toISOString());

      const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const avgPerDay = ((logs?.length || 0) / days).toFixed(1);

      summaryData.performance = {
        totalActions: logs?.length || 0,
        avgPerDay: parseFloat(avgPerDay),
        activeAdmins: new Set(logs?.map(l => l.admin_user_id) || []).size,
      };
    }

    // Generate HTML email
    const html = generateEmailHTML(summaryData, settings);

    // Send emails via Resend API
    const emailPromises = recipients.map(recipient =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Admin Dashboard <onboarding@resend.dev>',
          to: [recipient.email],
          subject: `Admin Activity Digest - ${settings.frequency.charAt(0).toUpperCase() + settings.frequency.slice(1)}`,
          html,
        }),
      }).then(res => {
        if (!res.ok) throw new Error(`Failed to send to ${recipient.email}`);
        return res.json();
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected');

    // Log to history
    await supabase.from('email_digest_history').insert({
      recipients: recipients.map(r => r.email),
      frequency: settings.frequency,
      success: failures.length === 0,
      error_message: failures.length > 0 ? JSON.stringify(failures) : null,
      summary_data: summaryData,
    });

    // Update last sent timestamp
    await supabase
      .from('email_digest_settings')
      .update({ last_sent_at: now.toISOString() })
      .eq('id', settings.id);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failures.length,
        recipients: recipients.map(r => r.email),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending digest:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateEmailHTML(data: any, settings: any): string {
  const { period, startDate, endDate } = data;
  const periodText = period.charAt(0).toUpperCase() + period.slice(1);
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Activity Digest</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 10px 0 0; opacity: 0.9; }
          .content { padding: 30px 20px; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #667eea; font-size: 20px; margin: 0 0 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
          .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
          .metric-card { background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #667eea; }
          .metric-card .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .metric-card .value { font-size: 28px; font-weight: bold; color: #111827; margin: 5px 0; }
          .list-item { padding: 12px; background: #f9fafb; margin-bottom: 8px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
          .list-item .name { font-weight: 500; }
          .list-item .count { background: #667eea; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; }
          .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .severity-critical { background: #fee2e2; color: #991b1b; }
          .severity-high { background: #fed7aa; color: #9a3412; }
          .severity-medium { background: #fef3c7; color: #92400e; }
          .severity-low { background: #dbeafe; color: #1e40af; }
          .anomaly-item { background: #fef2f2; border-left: 3px solid #dc2626; padding: 15px; margin-bottom: 10px; border-radius: 6px; }
          .anomaly-item .title { font-weight: 600; margin-bottom: 5px; }
          .anomaly-item .description { font-size: 14px; color: #6b7280; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛡️ Admin Activity Digest</h1>
            <p>${periodText} Report • ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
          </div>
          
          <div class="content">
            ${settings.include_performance_metrics && data.performance ? `
              <div class="section">
                <h2>📊 Performance Overview</h2>
                <div class="metric-grid">
                  <div class="metric-card">
                    <div class="label">Total Actions</div>
                    <div class="value">${data.performance.totalActions}</div>
                  </div>
                  <div class="metric-card">
                    <div class="label">Avg Per Day</div>
                    <div class="value">${data.performance.avgPerDay}</div>
                  </div>
                  <div class="metric-card">
                    <div class="label">Active Admins</div>
                    <div class="value">${data.performance.activeAdmins}</div>
                  </div>
                </div>
              </div>
            ` : ''}

            ${settings.include_activity_summary && data.activity ? `
              <div class="section">
                <h2>⚡ Top Actions</h2>
                ${data.activity.topActions.map((item: any) => `
                  <div class="list-item">
                    <span class="name">${item.action}</span>
                    <span class="count">${item.count}</span>
                  </div>
                `).join('')}
              </div>

              <div class="section">
                <h2>👥 Most Active Admins</h2>
                ${data.activity.topAdmins.map((item: any) => `
                  <div class="list-item">
                    <span class="name">${item.name}</span>
                    <span class="count">${item.count}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${settings.include_anomaly_report && data.anomalies ? `
              <div class="section">
                <h2>🚨 Security Anomalies</h2>
                <div class="metric-grid">
                  <div class="metric-card">
                    <div class="label">Total Detected</div>
                    <div class="value">${data.anomalies.total}</div>
                  </div>
                  <div class="metric-card">
                    <div class="label">Critical</div>
                    <div class="value" style="color: #dc2626;">${data.anomalies.bySeverity.critical}</div>
                  </div>
                  <div class="metric-card">
                    <div class="label">High</div>
                    <div class="value" style="color: #ea580c;">${data.anomalies.bySeverity.high}</div>
                  </div>
                  <div class="metric-card">
                    <div class="label">Medium/Low</div>
                    <div class="value">${data.anomalies.bySeverity.medium + data.anomalies.bySeverity.low}</div>
                  </div>
                </div>

                ${data.anomalies.unresolved.slice(0, 5).map((anomaly: any) => `
                  <div class="anomaly-item">
                    <div class="title">
                      <span class="severity-badge severity-${anomaly.severity}">${anomaly.severity}</span>
                      ${anomaly.anomaly_type}
                    </div>
                    <div class="description">${anomaly.description}</div>
                  </div>
                `).join('')}
                
                ${data.anomalies.total > 5 ? `
                  <p style="text-align: center; color: #6b7280; margin-top: 15px;">
                    ... and ${data.anomalies.total - 5} more anomalies
                  </p>
                ` : ''}
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <p>This is an automated digest from your Admin Dashboard</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
