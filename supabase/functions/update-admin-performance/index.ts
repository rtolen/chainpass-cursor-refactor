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
    console.log("Starting admin performance update");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all admin users
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminRoles || adminRoles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No admins found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminIds = adminRoles.map(r => r.user_id);
    console.log(`Processing ${adminIds.length} admins`);

    const performanceUpdates = [];

    for (const adminId of adminIds) {
      // Get all activity logs for this admin
      const { data: logs } = await supabaseAdmin
        .from("admin_activity_logs")
        .select("*")
        .eq("admin_user_id", adminId)
        .order("created_at", { ascending: true });

      if (!logs || logs.length === 0) {
        continue;
      }

      // Calculate metrics
      const totalActions = logs.length;
      
      // Calculate average response time (time between consecutive actions)
      let totalResponseTime = 0;
      for (let i = 1; i < logs.length; i++) {
        const timeDiff = new Date(logs[i].created_at).getTime() - 
                        new Date(logs[i-1].created_at).getTime();
        totalResponseTime += timeDiff / (1000 * 60); // Convert to minutes
      }
      const avgResponseTime = logs.length > 1 ? 
        totalResponseTime / (logs.length - 1) : 0;

      // Calculate quality score (based on action variety and consistency)
      const actionTypes = new Set(logs.map(l => l.action_type));
      const actionVariety = Math.min(100, (actionTypes.size / 10) * 100); // Max 10 different action types
      const qualityScore = actionVariety;

      // Calculate efficiency score (actions per day)
      const firstAction = new Date(logs[0].created_at);
      const lastAction = new Date(logs[logs.length - 1].created_at);
      const daysDiff = Math.max(1, (lastAction.getTime() - firstAction.getTime()) / (1000 * 60 * 60 * 24));
      const actionsPerDay = totalActions / daysDiff;
      const efficiencyScore = Math.min(100, actionsPerDay * 5); // 20 actions per day = 100 score

      // Calculate overall score (weighted average)
      const overallScore = Math.round(
        (qualityScore * 0.3) + 
        (efficiencyScore * 0.3) + 
        (Math.max(0, 100 - avgResponseTime) * 0.2) + // Lower response time = higher score
        (Math.min(100, totalActions / 10) * 0.2) // More actions = higher score
      );

      // Calculate level and XP
      const experiencePoints = totalActions * 10 + Math.round(overallScore);
      const level = Math.floor(Math.sqrt(experiencePoints / 100)) + 1;

      // Calculate streak
      let streakDays = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let currentDate = new Date(today);
      const logDates = new Set(
        logs.map(l => new Date(l.created_at).toDateString())
      );

      while (logDates.has(currentDate.toDateString())) {
        streakDays++;
        currentDate.setDate(currentDate.getDate() - 1);
      }

      performanceUpdates.push({
        admin_user_id: adminId,
        total_actions: totalActions,
        avg_response_time_minutes: Math.round(avgResponseTime * 10) / 10,
        quality_score: Math.round(qualityScore * 10) / 10,
        efficiency_score: Math.round(efficiencyScore * 10) / 10,
        overall_score: overallScore,
        level: level,
        experience_points: experiencePoints,
        streak_days: streakDays,
        last_activity_date: logs[logs.length - 1].created_at.split('T')[0],
        rank: 0, // Will be assigned after sorting
      });
    }

    // Sort by overall score to assign ranks
    performanceUpdates.sort((a, b) => b.overall_score - a.overall_score);
    performanceUpdates.forEach((update, index) => {
      update.rank = index + 1;
    });

    // Upsert performance scores
    for (const update of performanceUpdates) {
      const { error: upsertError } = await supabaseAdmin
        .from("admin_performance_scores")
        .upsert(update, { onConflict: "admin_user_id" });

      if (upsertError) {
        console.error(`Error updating performance for ${update.admin_user_id}:`, upsertError);
      }

      // Check and award badges
      await checkAndAwardBadges(supabaseAdmin, update.admin_user_id, update);
    }

    console.log(`Updated performance for ${performanceUpdates.length} admins`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: performanceUpdates.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in update-admin-performance function:", error);
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

async function checkAndAwardBadges(
  supabase: any,
  adminId: string,
  metrics: any
) {
  // Get all badges
  const { data: badges } = await supabase
    .from("admin_badges")
    .select("*");

  if (!badges) return;

  // Get already earned badges
  const { data: earnedBadges } = await supabase
    .from("admin_earned_badges")
    .select("badge_id")
    .eq("admin_user_id", adminId);

  const earnedBadgeIds = new Set((earnedBadges || []).map((eb: any) => eb.badge_id));

  // Check each badge
  for (const badge of badges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    let meetsRequirement = false;

    switch (badge.requirement_type) {
      case "total_actions":
        meetsRequirement = metrics.total_actions >= badge.requirement_value;
        break;
      case "avg_response_time":
        meetsRequirement = metrics.avg_response_time_minutes <= badge.requirement_value;
        break;
      case "quality_score":
        meetsRequirement = metrics.quality_score >= badge.requirement_value;
        break;
      case "efficiency_score":
        meetsRequirement = metrics.efficiency_score >= badge.requirement_value;
        break;
      case "streak_days":
        meetsRequirement = metrics.streak_days >= badge.requirement_value;
        break;
      case "overall_score":
        meetsRequirement = metrics.overall_score >= badge.requirement_value;
        break;
    }

    if (meetsRequirement) {
      await supabase
        .from("admin_earned_badges")
        .insert({
          admin_user_id: adminId,
          badge_id: badge.id,
        });
      
      console.log(`Awarded badge ${badge.name} to admin ${adminId}`);
    }
  }
}
