import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { UserCheck, TrendingUp, Clock, Activity, Target } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActivityLog {
  id: string;
  action_type: string;
  admin_user_id: string;
  created_at: string;
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface AdminStats {
  adminId: string;
  name: string;
  totalActions: number;
  uniqueActionTypes: number;
  avgActionsPerDay: number;
  peakHour: string;
  mostCommonAction: string;
  activityScore: number;
  logs: ActivityLog[];
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

export const AdminComparison = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats[]>([]);
  const [timeRange, setTimeRange] = useState("30");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAdminProfiles();
  }, []);

  useEffect(() => {
    if (selectedAdmins.length > 0) {
      loadAdminStats();
    }
  }, [selectedAdmins, timeRange]);

  const loadAdminProfiles = async () => {
    try {
      // Get all admins
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles) {
        const adminIds = adminRoles.map(role => role.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", adminIds);

        if (profilesData) {
          setProfiles(profilesData);
        }
      }
    } catch (error) {
      console.error("Error loading admin profiles:", error);
      toast({
        title: "Error",
        description: "Failed to load admin profiles",
        variant: "destructive",
      });
    }
  };

  const loadAdminStats = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats: AdminStats[] = [];

      for (const adminId of selectedAdmins) {
        const { data: logs } = await supabase
          .from("admin_activity_logs")
          .select("*")
          .eq("admin_user_id", adminId)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true });

        if (logs) {
          const profile = profiles.find(p => p.id === adminId);
          const name = profile?.email || profile?.full_name || "Unknown Admin";

          // Calculate stats
          const actionTypes = new Set(logs.map(log => log.action_type));
          const avgPerDay = (logs.length / days).toFixed(1);

          // Find peak hour
          const hourCounts: Record<number, number> = {};
          logs.forEach(log => {
            const hour = new Date(log.created_at).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
          });
          const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

          // Most common action
          const actionCounts: Record<string, number> = {};
          logs.forEach(log => {
            actionCounts[log.action_type] = (actionCounts[log.action_type] || 0) + 1;
          });
          const mostCommonAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

          // Activity score (weighted metric)
          const consistencyScore = Math.min(100, (logs.length / days) * 10);
          const diversityScore = Math.min(100, actionTypes.size * 10);
          const activityScore = Math.round((consistencyScore + diversityScore) / 2);

          stats.push({
            adminId,
            name,
            totalActions: logs.length,
            uniqueActionTypes: actionTypes.size,
            avgActionsPerDay: parseFloat(avgPerDay),
            peakHour: `${peakHour}:00`,
            mostCommonAction,
            activityScore,
            logs,
          });
        }
      }

      setAdminStats(stats);
    } catch (error) {
      console.error("Error loading admin stats:", error);
      toast({
        title: "Error",
        description: "Failed to load admin statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdmin = (adminId: string) => {
    setSelectedAdmins(prev => {
      if (prev.includes(adminId)) {
        return prev.filter(id => id !== adminId);
      } else if (prev.length < 4) {
        return [...prev, adminId];
      } else {
        toast({
          title: "Maximum Reached",
          description: "You can compare up to 4 admins at a time",
          variant: "default",
        });
        return prev;
      }
    });
  };

  // Prepare data for action comparison chart
  const getActionComparisonData = () => {
    const allActionTypes = new Set<string>();
    adminStats.forEach(admin => {
      admin.logs.forEach(log => allActionTypes.add(log.action_type));
    });

    return Array.from(allActionTypes).map(actionType => {
      const dataPoint: any = { action: actionType };
      adminStats.forEach(admin => {
        const count = admin.logs.filter(log => log.action_type === actionType).length;
        dataPoint[admin.name] = count;
      });
      return dataPoint;
    }).slice(0, 10); // Top 10 actions
  };

  // Prepare data for activity over time
  const getActivityTimelineData = () => {
    const days = parseInt(timeRange);
    const dateMap: Record<string, any> = {};
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[dateStr] = { date: dateStr };
    }

    adminStats.forEach(admin => {
      admin.logs.forEach(log => {
        const date = new Date(log.created_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dateStr in dateMap) {
          dateMap[dateStr][admin.name] = (dateMap[dateStr][admin.name] || 0) + 1;
        }
      });
    });

    return Object.values(dateMap);
  };

  // Prepare data for radar chart (performance comparison)
  const getPerformanceRadarData = () => {
    const maxTotal = Math.max(...adminStats.map(a => a.totalActions), 1);
    const maxDiversity = Math.max(...adminStats.map(a => a.uniqueActionTypes), 1);
    const maxAvg = Math.max(...adminStats.map(a => a.avgActionsPerDay), 1);

    return adminStats.map(admin => ({
      admin: admin.name,
      "Total Actions": Math.round((admin.totalActions / maxTotal) * 100),
      "Action Diversity": Math.round((admin.uniqueActionTypes / maxDiversity) * 100),
      "Daily Average": Math.round((admin.avgActionsPerDay / maxAvg) * 100),
      "Activity Score": admin.activityScore,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin Performance Comparison</h2>
          <p className="text-muted-foreground">Compare activity patterns and metrics across administrators</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Admin Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Select Admins to Compare
          </CardTitle>
          <CardDescription>
            Choose up to 4 administrators for comparison (currently selected: {selectedAdmins.length}/4)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {profiles.map(profile => {
              const isSelected = selectedAdmins.includes(profile.id);
              const colorIndex = selectedAdmins.indexOf(profile.id);
              
              return (
                <Button
                  key={profile.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleAdmin(profile.id)}
                  style={isSelected ? { backgroundColor: CHART_COLORS[colorIndex] } : undefined}
                >
                  {profile.email || profile.full_name || "Unknown"}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedAdmins.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Select admins above to start comparison</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading comparison data...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {adminStats.map((admin, index) => (
              <Card key={admin.adminId} className="border-l-4" style={{ borderLeftColor: CHART_COLORS[index] }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base truncate" title={admin.name}>
                    {admin.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Actions</span>
                    <Badge variant="secondary">{admin.totalActions}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Daily Avg</span>
                    <Badge variant="secondary">{admin.avgActionsPerDay}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Peak Hour</span>
                    <Badge variant="secondary">{admin.peakHour}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Activity Score</span>
                    <Badge 
                      variant={admin.activityScore >= 70 ? "default" : "secondary"}
                      style={admin.activityScore >= 70 ? { backgroundColor: CHART_COLORS[index] } : undefined}
                    >
                      {admin.activityScore}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Activity Timeline
                </CardTitle>
                <CardDescription>
                  Daily activity comparison over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getActivityTimelineData()}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    {adminStats.map((admin, index) => (
                      <Line
                        key={admin.adminId}
                        type="monotone"
                        dataKey={admin.name}
                        stroke={CHART_COLORS[index]}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS[index] }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Radar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>
                  Multi-dimensional performance comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={getPerformanceRadarData()}>
                    <PolarGrid className="stroke-muted" />
                    <PolarAngleAxis 
                      dataKey="admin" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <PolarRadiusAxis className="text-xs" />
                    {["Total Actions", "Action Diversity", "Daily Average", "Activity Score"].map((metric, idx) => (
                      <Radar
                        key={metric}
                        name={metric}
                        dataKey={metric}
                        stroke={CHART_COLORS[idx]}
                        fill={CHART_COLORS[idx]}
                        fillOpacity={0.3}
                      />
                    ))}
                    <Legend />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Action Type Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Action Type Distribution
              </CardTitle>
              <CardDescription>
                Comparison of action types performed by each admin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={getActionComparisonData()}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="action" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  {adminStats.map((admin, index) => (
                    <Bar
                      key={admin.adminId}
                      dataKey={admin.name}
                      fill={CHART_COLORS[index]}
                      radius={[8, 8, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {adminStats.map((admin, index) => (
                  <div key={admin.adminId} className="p-3 rounded-lg border" style={{ borderLeftWidth: '4px', borderLeftColor: CHART_COLORS[index] }}>
                    <div className="font-medium mb-2">{admin.name}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Most active with: <span className="font-medium text-foreground">{admin.mostCommonAction}</span></div>
                      <div>Peak activity hour: <span className="font-medium text-foreground">{admin.peakHour}</span></div>
                      <div>Action variety: <span className="font-medium text-foreground">{admin.uniqueActionTypes} types</span></div>
                      <div>Consistency: <span className="font-medium text-foreground">{admin.avgActionsPerDay} actions/day</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
