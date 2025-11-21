import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Trophy, 
  Award,
  TrendingUp, 
  Zap, 
  Target,
  Star,
  Crown,
  Flame,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PerformanceScore {
  id: string;
  admin_user_id: string;
  total_actions: number;
  avg_response_time_minutes: number;
  quality_score: number;
  efficiency_score: number;
  overall_score: number;
  rank: number;
  level: number;
  experience_points: number;
  streak_days: number;
  last_activity_date: string;
}

interface BadgeData {
  id: string;
  badge_code: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  requirement_type: string;
  requirement_value: number;
}

interface EarnedBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badge: BadgeData;
}

export function PerformanceScoring() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: leaderboard, refetch: refetchLeaderboard } = useQuery({
    queryKey: ["admin-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_performance_scores")
        .select("*")
        .order("rank", { ascending: true })
        .limit(10);

      if (error) throw error;

      // Get admin emails
      const adminIds = data.map(s => s.admin_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", adminIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p.email || p.full_name || "Unknown Admin";
        return acc;
      }, {} as Record<string, string>);

      return data.map(score => ({
        ...score,
        email: profileMap[score.admin_user_id],
      }));
    },
  });

  const { data: myPerformance } = useQuery({
    queryKey: ["my-performance", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("admin_performance_scores")
        .select("*")
        .eq("admin_user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: myBadges } = useQuery({
    queryKey: ["my-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("admin_earned_badges")
        .select(`
          *,
          badge:admin_badges(*)
        `)
        .eq("admin_user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return data as EarnedBadge[];
    },
    enabled: !!user?.id,
  });

  const { data: allBadges } = useQuery({
    queryKey: ["all-badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_badges")
        .select("*")
        .order("tier", { ascending: true });

      if (error) throw error;
      return data as BadgeData[];
    },
  });

  const handleUpdatePerformance = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke("update-admin-performance");

      if (error) throw error;

      toast({
        title: "Performance Updated",
        description: "All admin performance scores have been recalculated",
      });

      refetchLeaderboard();
    } catch (error: any) {
      console.error("Error updating performance:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update performance scores",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "diamond": return "text-cyan-400";
      case "platinum": return "text-purple-400";
      case "gold": return "text-yellow-400";
      case "silver": return "text-gray-400";
      case "bronze": return "text-orange-400";
      default: return "text-muted-foreground";
    }
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case "diamond": return "default";
      case "platinum": return "secondary";
      case "gold": return "default";
      case "silver": return "secondary";
      case "bronze": return "outline";
      default: return "outline";
    }
  };

  const getXpForNextLevel = (level: number) => {
    return (level * level) * 100;
  };

  const earnedBadgeIds = new Set(myBadges?.map(eb => eb.badge_id) || []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Performance & Achievements
          </h2>
          <p className="text-sm text-muted-foreground">
            Track your performance, earn badges, and compete on the leaderboard
          </p>
        </div>
        <Button onClick={handleUpdatePerformance} disabled={isUpdating} variant="outline">
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Update Scores
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">My Performance</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {myPerformance ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      Rank
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">#{myPerformance.rank}</div>
                    <p className="text-xs text-muted-foreground mt-1">Global ranking</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Star className="h-4 w-4 text-purple-500" />
                      Level
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{myPerformance.level}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {myPerformance.experience_points} XP
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      Streak
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{myPerformance.streak_days}</div>
                    <p className="text-xs text-muted-foreground mt-1">Days active</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Overall Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{myPerformance.overall_score}</div>
                    <p className="text-xs text-muted-foreground mt-1">Out of 100</p>
                  </CardContent>
                </Card>
              </div>

              {/* Level Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Level Progress</CardTitle>
                  <CardDescription>
                    {myPerformance.experience_points} / {getXpForNextLevel(myPerformance.level)} XP
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress 
                    value={
                      (myPerformance.experience_points / getXpForNextLevel(myPerformance.level)) * 100
                    } 
                  />
                </CardContent>
              </Card>

              {/* Detailed Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Quality Score
                      </span>
                      <span className="text-sm font-bold">{myPerformance.quality_score}/100</span>
                    </div>
                    <Progress value={myPerformance.quality_score} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Efficiency Score
                      </span>
                      <span className="text-sm font-bold">{myPerformance.efficiency_score}/100</span>
                    </div>
                    <Progress value={myPerformance.efficiency_score} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Actions</p>
                      <p className="text-2xl font-bold">{myPerformance.total_actions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                      <p className="text-2xl font-bold">
                        {myPerformance.avg_response_time_minutes.toFixed(1)}m
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Badges */}
              {myBadges && myBadges.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Recent Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {myBadges.slice(0, 8).map((earned) => (
                        <div
                          key={earned.id}
                          className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center"
                        >
                          <span className="text-3xl mb-2">{earned.badge.icon}</span>
                          <Badge variant={getTierBadgeVariant(earned.badge.tier)} className="mb-1">
                            {earned.badge.tier}
                          </Badge>
                          <p className="text-sm font-medium">{earned.badge.name}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  Complete your first admin action to start tracking your performance!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Top Performers
              </CardTitle>
              <CardDescription>Global admin performance rankings</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {leaderboard && leaderboard.length > 0 ? (
                  <div className="space-y-3">
                    {leaderboard.map((admin: any, index) => (
                      <div
                        key={admin.id}
                        className={`flex items-center gap-4 p-4 rounded-lg ${
                          admin.admin_user_id === user?.id
                            ? "bg-primary/10 border-2 border-primary"
                            : "bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background">
                          {index === 0 && <Crown className="h-6 w-6 text-yellow-500" />}
                          {index === 1 && <Trophy className="h-6 w-6 text-gray-400" />}
                          {index === 2 && <Trophy className="h-6 w-6 text-orange-400" />}
                          {index > 2 && (
                            <span className="text-lg font-bold">#{admin.rank}</span>
                          )}
                        </div>
                        
                        <Avatar>
                          <AvatarFallback>
                            {admin.email?.[0]?.toUpperCase() || "A"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <p className="font-medium">{admin.email}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Level {admin.level}</span>
                            <span>•</span>
                            <span>{admin.total_actions} actions</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold">{admin.overall_score}</div>
                          <p className="text-xs text-muted-foreground">Score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No performance data available
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Badge Collection
              </CardTitle>
              <CardDescription>
                Earn badges by achieving performance milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allBadges?.map((badge) => {
                  const earned = earnedBadgeIds.has(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`p-4 rounded-lg border-2 ${
                        earned
                          ? "bg-primary/5 border-primary"
                          : "bg-muted/30 border-muted opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-4xl">{badge.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{badge.name}</p>
                            <Badge 
                              variant={getTierBadgeVariant(badge.tier)}
                              className={getTierColor(badge.tier)}
                            >
                              {badge.tier}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {badge.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Requirement: {badge.requirement_type.replace(/_/g, " ")} {" "}
                            {badge.requirement_value}
                          </p>
                          {earned && (
                            <Badge variant="default" className="mt-2">
                              ✓ Earned
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
