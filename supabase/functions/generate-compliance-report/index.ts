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
    console.log("Starting compliance report generation");

    const { startDate, endDate, includeActivityLogs, includeAnomalies, includeComparisons } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log(`Generating report for ${start.toISOString()} to ${end.toISOString()}`);

    const reportData: any = {
      metadata: {
        generatedAt: new Date().toISOString(),
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        reportType: "Compliance Audit Report",
      },
      sections: [],
    };

    // 1. Activity Logs
    if (includeActivityLogs) {
      console.log("Fetching activity logs");
      const { data: logs, error: logsError } = await supabaseAdmin
        .from("admin_activity_logs")
        .select(`
          *,
          admin:admin_user_id(email, full_name)
        `)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (logsError) {
        console.error("Error fetching logs:", logsError);
      } else {
        // Get admin profiles for names
        const adminIds = [...new Set(logs.map(l => l.admin_user_id))];
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, email, full_name")
          .in("id", adminIds);

        const profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.email || p.full_name || "Unknown Admin";
          return acc;
        }, {} as Record<string, string>);

        reportData.sections.push({
          title: "Activity Logs",
          type: "activity_logs",
          summary: {
            totalActions: logs?.length || 0,
            uniqueAdmins: adminIds.length,
            dateRange: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
          },
          data: (logs || []).map(log => ({
            timestamp: new Date(log.created_at).toLocaleString(),
            admin: profileMap[log.admin_user_id] || "Unknown",
            action: log.action_type,
            targetUser: log.target_user_email || log.target_user_id || "N/A",
            ipAddress: log.ip_address || "N/A",
            details: log.details ? JSON.stringify(log.details) : "N/A",
          })),
        });
      }
    }

    // 2. Anomalies
    if (includeAnomalies) {
      console.log("Fetching anomalies");
      const { data: anomalies, error: anomaliesError } = await supabaseAdmin
        .from("detected_anomalies")
        .select("*")
        .gte("detected_at", start.toISOString())
        .lte("detected_at", end.toISOString())
        .order("severity", { ascending: false });

      if (anomaliesError) {
        console.error("Error fetching anomalies:", anomaliesError);
      } else {
        const severityCounts = (anomalies || []).reduce((acc, a) => {
          acc[a.severity] = (acc[a.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        reportData.sections.push({
          title: "Security Anomalies",
          type: "anomalies",
          summary: {
            totalAnomalies: anomalies?.length || 0,
            resolved: anomalies?.filter(a => a.resolved).length || 0,
            unresolved: anomalies?.filter(a => !a.resolved).length || 0,
            bySeverity: severityCounts,
          },
          data: (anomalies || []).map(anomaly => ({
            detectedAt: new Date(anomaly.detected_at || anomaly.created_at).toLocaleString(),
            type: anomaly.anomaly_type,
            severity: anomaly.severity,
            description: anomaly.description,
            confidence: `${Math.round(anomaly.confidence_score * 100)}%`,
            status: anomaly.resolved ? "Resolved" : "Active",
            resolvedAt: anomaly.resolved_at ? new Date(anomaly.resolved_at).toLocaleString() : "N/A",
            notes: anomaly.notes || "N/A",
          })),
        });
      }
    }

    // 3. Admin Comparisons
    if (includeComparisons) {
      console.log("Generating admin comparisons");
      const { data: logs } = await supabaseAdmin
        .from("admin_activity_logs")
        .select("*")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      const adminStats: Record<string, any> = {};

      (logs || []).forEach(log => {
        if (!adminStats[log.admin_user_id]) {
          adminStats[log.admin_user_id] = {
            totalActions: 0,
            actionTypes: {},
            firstAction: log.created_at,
            lastAction: log.created_at,
          };
        }

        adminStats[log.admin_user_id].totalActions++;
        adminStats[log.admin_user_id].actionTypes[log.action_type] = 
          (adminStats[log.admin_user_id].actionTypes[log.action_type] || 0) + 1;
        
        if (new Date(log.created_at) < new Date(adminStats[log.admin_user_id].firstAction)) {
          adminStats[log.admin_user_id].firstAction = log.created_at;
        }
        if (new Date(log.created_at) > new Date(adminStats[log.admin_user_id].lastAction)) {
          adminStats[log.admin_user_id].lastAction = log.created_at;
        }
      });

      // Get admin names
      const adminIds = Object.keys(adminStats);
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", adminIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p.email || p.full_name || "Unknown Admin";
        return acc;
      }, {} as Record<string, string>);

      reportData.sections.push({
        title: "Admin Activity Comparison",
        type: "admin_comparison",
        summary: {
          totalAdmins: adminIds.length,
          totalActions: logs?.length || 0,
          averageActionsPerAdmin: Math.round((logs?.length || 0) / adminIds.length),
        },
        data: Object.entries(adminStats).map(([adminId, stats]) => ({
          admin: profileMap[adminId] || "Unknown",
          totalActions: stats.totalActions,
          topAction: Object.entries(stats.actionTypes)
            .sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "N/A",
          firstActivity: new Date(stats.firstAction).toLocaleString(),
          lastActivity: new Date(stats.lastAction).toLocaleString(),
          uniqueActions: Object.keys(stats.actionTypes).length,
        })).sort((a, b) => b.totalActions - a.totalActions),
      });
    }

    // 4. Audit Trail Summary
    const { data: allLogs } = await supabaseAdmin
      .from("admin_activity_logs")
      .select("action_type, created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    const actionSummary = (allLogs || []).reduce((acc, log) => {
      acc[log.action_type] = (acc[log.action_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    reportData.sections.push({
      title: "Audit Trail Summary",
      type: "audit_summary",
      summary: {
        totalEvents: allLogs?.length || 0,
        uniqueActionTypes: Object.keys(actionSummary).length,
        reportPeriodDays: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      },
      data: Object.entries(actionSummary)
        .map(([action, count]) => ({
          action,
          count,
          percentage: `${Math.round((count / (allLogs?.length || 1)) * 100)}%`,
        }))
        .sort((a, b) => b.count - a.count),
    });

    console.log("Report generation complete");

    return new Response(
      JSON.stringify({
        success: true,
        report: reportData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-compliance-report function:", error);
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
