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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get detection settings
    const { data: settings, error: settingsError } = await supabase
      .from('anomaly_detection_settings')
      .select('*')
      .single();

    if (settingsError || !settings || !settings.enabled) {
      return new Response(
        JSON.stringify({ message: 'Anomaly detection is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get historical data for learning period
    const learningStartDate = new Date();
    learningStartDate.setDate(learningStartDate.getDate() - settings.learning_period_days);

    const { data: historicalLogs, error: logsError } = await supabase
      .from('admin_activity_logs')
      .select('*')
      .gte('created_at', learningStartDate.toISOString())
      .order('created_at', { ascending: true });

    if (logsError || !historicalLogs || historicalLogs.length < settings.min_data_points) {
      return new Response(
        JSON.stringify({ 
          message: 'Insufficient data for anomaly detection',
          required: settings.min_data_points,
          available: historicalLogs?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin profiles
    const adminIds = [...new Set(historicalLogs.map(log => log.admin_user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', adminIds);

    const profileMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p.email || p.full_name || 'Unknown';
      return acc;
    }, {} as Record<string, string>);

    // Aggregate data by admin
    const adminStats: Record<string, any> = {};
    
    historicalLogs.forEach(log => {
      if (!adminStats[log.admin_user_id]) {
        adminStats[log.admin_user_id] = {
          name: profileMap[log.admin_user_id],
          totalActions: 0,
          actionTypes: {} as Record<string, number>,
          hourlyDistribution: Array(24).fill(0),
          dailyActions: {} as Record<string, number>,
          recentActions: [] as any[],
        };
      }

      const stats = adminStats[log.admin_user_id];
      stats.totalActions++;
      
      const actionType = log.action_type;
      stats.actionTypes[actionType] = (stats.actionTypes[actionType] || 0) + 1;
      
      const hour = new Date(log.created_at).getHours();
      stats.hourlyDistribution[hour]++;
      
      const date = new Date(log.created_at).toDateString();
      stats.dailyActions[date] = (stats.dailyActions[date] || 0) + 1;

      // Keep last 24 hours for recent analysis
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (new Date(log.created_at) > dayAgo) {
        stats.recentActions.push(log);
      }
    });

    // Use AI to detect anomalies
    const detectedAnomalies: any[] = [];

    for (const [adminId, stats] of Object.entries(adminStats)) {
      const prompt = `You are an expert security analyst detecting anomalous admin behavior patterns.

Analyze the following admin activity data and identify any anomalies:

Admin: ${stats.name}
Sensitivity Level: ${settings.sensitivity_level}
Learning Period: ${settings.learning_period_days} days

Historical Baseline:
- Total actions: ${stats.totalActions}
- Average actions per day: ${(stats.totalActions / settings.learning_period_days).toFixed(1)}
- Action types distribution: ${JSON.stringify(stats.actionTypes)}
- Hourly activity pattern: ${JSON.stringify(stats.hourlyDistribution)}

Recent Activity (last 24 hours):
- Recent actions count: ${stats.recentActions.length}
- Recent action types: ${JSON.stringify(stats.recentActions.map((a: any) => a.action_type))}

Detect anomalies considering:
1. Unusual volume spikes (significantly higher than baseline)
2. Actions at unusual hours (compared to normal pattern)
3. New or rare action types
4. Rapid successive actions (potential automation/compromise)
5. Patterns inconsistent with historical behavior

Sensitivity: ${settings.sensitivity_level === 'low' ? 'Only flag severe anomalies' : settings.sensitivity_level === 'high' ? 'Flag even minor deviations' : 'Balanced detection'}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a security analyst. Respond with structured JSON containing detected anomalies.' },
            { role: 'user', content: prompt }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'report_anomalies',
              description: 'Report detected anomalies in admin behavior',
              parameters: {
                type: 'object',
                properties: {
                  anomalies: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', description: 'Type of anomaly detected' },
                        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                        description: { type: 'string', description: 'Clear description of the anomaly' },
                        confidence: { type: 'number', description: 'Confidence score 0-1' },
                        evidence: { type: 'string', description: 'Supporting evidence' }
                      },
                      required: ['type', 'severity', 'description', 'confidence', 'evidence']
                    }
                  }
                },
                required: ['anomalies']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'report_anomalies' } }
        }),
      });

      const aiData = await aiResponse.json();
      console.log('AI Response:', JSON.stringify(aiData, null, 2));

      if (aiData.choices?.[0]?.message?.tool_calls?.[0]) {
        const toolCall = aiData.choices[0].message.tool_calls[0];
        const anomalies = JSON.parse(toolCall.function.arguments).anomalies;

        for (const anomaly of anomalies) {
          detectedAnomalies.push({
            admin_user_id: adminId,
            anomaly_type: anomaly.type,
            severity: anomaly.severity,
            description: anomaly.description,
            confidence_score: anomaly.confidence,
            supporting_data: {
              evidence: anomaly.evidence,
              baseline: {
                avgActionsPerDay: (stats.totalActions / settings.learning_period_days).toFixed(1),
                totalActions: stats.totalActions,
              },
              recent: {
                actionsLast24h: stats.recentActions.length,
              }
            },
          });
        }
      }
    }

    // Insert detected anomalies
    if (detectedAnomalies.length > 0) {
      const { error: insertError } = await supabase
        .from('detected_anomalies')
        .insert(detectedAnomalies);

      if (insertError) {
        console.error('Error inserting anomalies:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: Object.keys(adminStats).length,
        detected: detectedAnomalies.length,
        anomalies: detectedAnomalies.map(a => ({
          admin: profileMap[a.admin_user_id],
          type: a.anomaly_type,
          severity: a.severity,
          confidence: a.confidence_score,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in detect-anomalies:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
