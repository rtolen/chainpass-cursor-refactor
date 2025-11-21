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
    console.log("Starting admin activity forecast analysis");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch last 90 days of activity logs
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const { data: logs, error: logsError } = await supabaseAdmin
      .from("admin_activity_logs")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (logsError) throw logsError;

    console.log(`Analyzing ${logs?.length || 0} activity logs`);

    // Aggregate data by day and hour
    const dailyStats: Record<string, any> = {};
    const hourlyStats: Record<number, number> = {};
    const actionTypeStats: Record<string, number> = {};
    const weekdayStats: Record<string, number> = {};

    (logs || []).forEach(log => {
      const date = new Date(log.created_at);
      const dayKey = date.toISOString().split('T')[0];
      const hour = date.getHours();
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

      // Daily aggregation
      if (!dailyStats[dayKey]) {
        dailyStats[dayKey] = { count: 0, actions: {} };
      }
      dailyStats[dayKey].count++;

      // Hourly aggregation
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;

      // Action type aggregation
      actionTypeStats[log.action_type] = (actionTypeStats[log.action_type] || 0) + 1;

      // Weekday aggregation
      weekdayStats[weekday] = (weekdayStats[weekday] || 0) + 1;
    });

    // Prepare data summary for AI analysis
    const dataSummary = {
      totalLogs: logs?.length || 0,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
      dailyAverage: Math.round((logs?.length || 0) / 90),
      topHours: Object.entries(hourlyStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([hour, count]) => ({ hour: parseInt(hour), count })),
      topActions: Object.entries(actionTypeStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([action, count]) => ({ action, count })),
      weekdayDistribution: weekdayStats,
      recentTrend: Object.entries(dailyStats)
        .slice(-14)
        .map(([date, stats]) => ({ date, count: stats.count })),
    };

    console.log("Sending data to Lovable AI for analysis");

    // Call Lovable AI for forecasting
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert data analyst specializing in time series forecasting and anomaly detection for administrative systems. 
Analyze patterns in admin activity and provide actionable insights about future trends.`
          },
          {
            role: "user",
            content: `Analyze the following admin activity data from the last 90 days and provide a forecast:

${JSON.stringify(dataSummary, null, 2)}

Please provide:
1. A 7-day forecast with predicted activity levels (low/medium/high) for each day
2. Identification of expected busy periods in the next 7 days
3. Peak activity hours based on historical patterns
4. Any unusual patterns or deviations detected in recent data
5. Recommendations for admin resource allocation

Format your response as valid JSON with this structure:
{
  "forecast": [
    { "date": "YYYY-MM-DD", "predicted_level": "low|medium|high", "confidence": 0.0-1.0, "estimated_count": number }
  ],
  "busy_periods": [
    { "date": "YYYY-MM-DD", "reason": "explanation", "severity": "moderate|high" }
  ],
  "peak_hours": [
    { "hour": number, "activity_level": "percentage or description" }
  ],
  "deviations": [
    { "type": "trend|spike|drop", "description": "what was detected", "date": "YYYY-MM-DD", "severity": "low|medium|high" }
  ],
  "recommendations": [
    { "title": "recommendation title", "description": "detailed recommendation" }
  ],
  "insights": {
    "weekly_pattern": "description of weekly patterns",
    "growth_trend": "increasing|stable|decreasing",
    "seasonality": "any seasonal patterns detected"
  }
}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_forecast",
              description: "Generate a detailed forecast of admin activity",
              parameters: {
                type: "object",
                properties: {
                  forecast: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        predicted_level: { type: "string", enum: ["low", "medium", "high"] },
                        confidence: { type: "number" },
                        estimated_count: { type: "number" }
                      },
                      required: ["date", "predicted_level", "confidence", "estimated_count"]
                    }
                  },
                  busy_periods: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        reason: { type: "string" },
                        severity: { type: "string", enum: ["moderate", "high"] }
                      },
                      required: ["date", "reason", "severity"]
                    }
                  },
                  peak_hours: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        hour: { type: "number" },
                        activity_level: { type: "string" }
                      },
                      required: ["hour", "activity_level"]
                    }
                  },
                  deviations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["trend", "spike", "drop"] },
                        description: { type: "string" },
                        date: { type: "string" },
                        severity: { type: "string", enum: ["low", "medium", "high"] }
                      },
                      required: ["type", "description", "severity"]
                    }
                  },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" }
                      },
                      required: ["title", "description"]
                    }
                  },
                  insights: {
                    type: "object",
                    properties: {
                      weekly_pattern: { type: "string" },
                      growth_trend: { type: "string", enum: ["increasing", "stable", "decreasing"] },
                      seasonality: { type: "string" }
                    },
                    required: ["weekly_pattern", "growth_trend", "seasonality"]
                  }
                },
                required: ["forecast", "busy_periods", "peak_hours", "deviations", "recommendations", "insights"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_forecast" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${aiResponse.status} ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    console.log("AI analysis complete");

    // Extract tool call result
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let forecastData;

    if (toolCall?.function?.arguments) {
      forecastData = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback if no tool call
      forecastData = {
        forecast: [],
        busy_periods: [],
        peak_hours: [],
        deviations: [],
        recommendations: [],
        insights: {
          weekly_pattern: "Unable to generate forecast",
          growth_trend: "stable",
          seasonality: "Unknown"
        }
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: forecastData,
        metadata: {
          analyzed_logs: logs?.length || 0,
          date_range: dataSummary.dateRange,
          generated_at: new Date().toISOString(),
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in forecast-admin-activity function:", error);
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
