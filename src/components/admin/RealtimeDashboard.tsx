import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  Users, 
  Bell, 
  AlertTriangle, 
  Clock,
  Zap,
  Eye,
  CircleDot
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActivityLogEntry {
  id: string;
  action_type: string;
  admin_user_id: string;
  target_user_email?: string;
  created_at: string;
  details?: any;
}

interface AnomalyAlert {
  id: string;
  anomaly_type: string;
  severity: string;
  description: string;
  detected_at: string;
  confidence_score: number;
}

interface PresenceState {
  [key: string]: Array<{
    user_id: string;
    email: string;
    online_at: string;
  }>;
}

export function RealtimeDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeAdmins, setActiveAdmins] = useState<PresenceState>({});
  const [recentActions, setRecentActions] = useState<ActivityLogEntry[]>([]);
  const [recentAnomalies, setRecentAnomalies] = useState<AnomalyAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Create a presence channel for tracking active admins
    const presenceChannel = supabase.channel("admin-presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track presence state
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState() as unknown as PresenceState;
        setActiveAdmins(state);
        setIsConnected(true);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("Admin joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("Admin left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track this user's presence
          await presenceChannel.track({
            user_id: user.id,
            email: user.email || "Unknown",
            online_at: new Date().toISOString(),
          });
        }
      });

    // Subscribe to activity logs
    const activityChannel = supabase
      .channel("realtime-activity-logs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_activity_logs",
        },
        async (payload) => {
          console.log("New activity log:", payload);
          const newLog = payload.new as ActivityLogEntry;
          
          // Fetch admin email for the log
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", newLog.admin_user_id)
            .single();

          setRecentActions((prev) => [
            { ...newLog, admin_email: profile?.email || "Unknown" } as any,
            ...prev.slice(0, 19), // Keep last 20 actions
          ]);

          // Show toast for new activity
          toast({
            title: "New Admin Activity",
            description: `${profile?.email || "Admin"} performed: ${newLog.action_type}`,
          });
        }
      )
      .subscribe();

    // Subscribe to anomalies
    const anomalyChannel = supabase
      .channel("realtime-anomalies")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "detected_anomalies",
        },
        (payload) => {
          console.log("New anomaly detected:", payload);
          const newAnomaly = payload.new as AnomalyAlert;
          
          setRecentAnomalies((prev) => [
            newAnomaly,
            ...prev.slice(0, 9), // Keep last 10 anomalies
          ]);

          // Show warning toast for high severity anomalies
          if (newAnomaly.severity === "high" || newAnomaly.severity === "critical") {
            toast({
              title: `${newAnomaly.severity.toUpperCase()} Security Anomaly`,
              description: newAnomaly.description,
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    // Load initial recent data
    loadRecentData();

    // Cleanup
    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(anomalyChannel);
    };
  }, [user, toast]);

  const loadRecentData = async () => {
    // Load recent activity logs
    const { data: logs } = await supabase
      .from("admin_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (logs) {
      // Fetch admin emails
      const adminIds = [...new Set(logs.map(l => l.admin_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", adminIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p.email || p.full_name || "Unknown";
        return acc;
      }, {} as Record<string, string>);

      setRecentActions(logs.map(log => ({
        ...log,
        admin_email: profileMap[log.admin_user_id]
      })) as any);
    }

    // Load recent anomalies
    const { data: anomalies } = await supabase
      .from("detected_anomalies")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(10);

    if (anomalies) {
      setRecentAnomalies(anomalies);
    }
  };

  const getActiveAdminsList = () => {
    const admins: any[] = [];
    Object.values(activeAdmins).forEach((presences) => {
      presences.forEach((presence) => {
        admins.push(presence);
      });
    });
    return admins;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const activeAdminsList = getActiveAdminsList();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Real-Time Activity Monitor
          </h2>
          <p className="text-sm text-muted-foreground">
            Live tracking of admin actions, active users, and security alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="default" className="gap-2">
              <CircleDot className="h-3 w-3 animate-pulse" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">Connecting...</Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Active Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeAdminsList.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Recent Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recentActions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 20 activities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {recentAnomalies.filter(a => a.severity === "high" || a.severity === "critical").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">High/Critical anomalies</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Admins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Admins
            </CardTitle>
            <CardDescription>Real-time presence tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {activeAdminsList.length > 0 ? (
                <div className="space-y-3">
                  {activeAdminsList.map((admin, idx) => (
                    <div
                      key={`${admin.user_id}-${idx}`}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {admin.email?.[0]?.toUpperCase() || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{admin.email}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CircleDot className="h-2 w-2 text-green-500" />
                          Online {getTimeAgo(admin.online_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Eye className="h-8 w-8 mb-2" />
                  <p className="text-sm">No active admins</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Anomalies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Security Alerts
            </CardTitle>
            <CardDescription>Real-time anomaly detection</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {recentAnomalies.length > 0 ? (
                <div className="space-y-3">
                  {recentAnomalies.map((anomaly) => (
                    <Alert key={anomaly.id} className="py-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between mb-1">
                        <span className="text-sm">{anomaly.anomaly_type}</span>
                        <Badge variant={getSeverityColor(anomaly.severity)} className="text-xs">
                          {anomaly.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>
                        <p className="text-xs mb-1">{anomaly.description}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(anomaly.detected_at)}
                          </span>
                          <span>Confidence: {Math.round(anomaly.confidence_score * 100)}%</span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2" />
                  <p className="text-sm">No recent alerts</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Activity Feed
          </CardTitle>
          <CardDescription>Real-time stream of admin actions</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {recentActions.length > 0 ? (
              <div className="space-y-2">
                {recentActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="mt-1">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">
                          {(action as any).admin_email || "Unknown Admin"}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(action.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <Badge variant="outline" className="mr-2">
                          {action.action_type}
                        </Badge>
                        {action.target_user_email && (
                          <span>Target: {action.target_user_email}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Activity className="h-8 w-8 mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
