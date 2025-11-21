import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { TrendingUp, Activity, Clock, Target } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const ActivityAnalytics = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: logsData, error: logsError } = await supabase
        .from("admin_activity_logs")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (logsError) throw logsError;

      setLogs(logsData || []);

      // Fetch admin profiles
      const adminIds = [...new Set(logsData?.map(log => log.admin_user_id) || [])];
      if (adminIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", adminIds);

        if (profilesError) throw profilesError;

        const profilesMap = (profilesData || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, Profile>);

        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Process data for activity over time chart
  const getActivityOverTime = () => {
    const days = parseInt(timeRange);
    const dateMap: Record<string, number> = {};
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[dateStr] = 0;
    }

    logs.forEach(log => {
      const date = new Date(log.created_at);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dateStr in dateMap) {
        dateMap[dateStr]++;
      }
    });

    return Object.entries(dateMap).map(([date, count]) => ({ date, count }));
  };

  // Process data for action types
  const getActionTypeData = () => {
    const actionMap: Record<string, number> = {};
    
    logs.forEach(log => {
      actionMap[log.action_type] = (actionMap[log.action_type] || 0) + 1;
    });

    return Object.entries(actionMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Process data for peak hours
  const getPeakHoursData = () => {
    const hourMap: Record<number, number> = {};
    
    for (let i = 0; i < 24; i++) {
      hourMap[i] = 0;
    }

    logs.forEach(log => {
      const hour = new Date(log.created_at).getHours();
      hourMap[hour]++;
    });

    return Object.entries(hourMap).map(([hour, count]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      count,
    }));
  };

  // Process data for admin activity
  const getAdminActivityData = () => {
    const adminMap: Record<string, number> = {};
    
    logs.forEach(log => {
      adminMap[log.admin_user_id] = (adminMap[log.admin_user_id] || 0) + 1;
    });

    return Object.entries(adminMap)
      .map(([adminId, count]) => ({
        name: profiles[adminId]?.email || profiles[adminId]?.full_name || 'Unknown Admin',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  // Calculate summary statistics
  const totalActions = logs.length;
  const uniqueAdmins = new Set(logs.map(log => log.admin_user_id)).size;
  const avgActionsPerDay = (totalActions / parseInt(timeRange)).toFixed(1);
  const mostCommonAction = getActionTypeData()[0]?.name || "N/A";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights into admin activity patterns</p>
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActions}</div>
            <p className="text-xs text-muted-foreground">
              {avgActionsPerDay} per day average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueAdmins}</div>
            <p className="text-xs text-muted-foreground">
              Unique administrators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Common Action</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate" title={mostCommonAction}>
              {mostCommonAction}
            </div>
            <p className="text-xs text-muted-foreground">
              Top action type
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getPeakHoursData().reduce((max, curr) => curr.count > max.count ? curr : max).hour}
            </div>
            <p className="text-xs text-muted-foreground">
              Busiest hour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="actions">Action Types</TabsTrigger>
          <TabsTrigger value="hours">Peak Hours</TabsTrigger>
          <TabsTrigger value="admins">Admin Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Over Time</CardTitle>
              <CardDescription>
                Number of admin actions per day over the last {timeRange} days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={getActivityOverTime()}>
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
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Actions"
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Action Type Distribution</CardTitle>
              <CardDescription>
                Breakdown of different action types performed by admins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={getActionTypeData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={120}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {getActionTypeData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Peak Activity Hours</CardTitle>
              <CardDescription>
                Distribution of admin actions throughout the day (24-hour format)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={getPeakHoursData()}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hour" 
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
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    name="Actions"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Active Admins</CardTitle>
              <CardDescription>
                Administrators with the most activity in the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={getAdminActivityData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    width={200}
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
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    name="Actions"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
