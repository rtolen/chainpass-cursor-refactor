import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, Shield, AlertTriangle, UserCog, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface ActivityLog {
  id: string;
  action_type: string;
  admin_user_id: string;
  target_user_email: string | null;
  created_at: string;
  details: any;
}

interface Notification {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  log?: ActivityLog;
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
}

export const AdminNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadRecentLogs();
    setupRealtimeSubscription();
  }, []);

  const loadRecentLogs = async () => {
    try {
      // Load last 50 logs to check for patterns
      const { data: logs } = await supabase
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (logs) {
        // Load profiles for all admins
        const adminIds = [...new Set(logs.map(log => log.admin_user_id))];
        if (adminIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("*")
            .in("id", adminIds);

          if (profilesData) {
            const profilesMap = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {} as Record<string, Profile>);
            setProfiles(profilesMap);
          }
        }

        // Initialize activity counts
        const counts: Record<string, number> = {};
        logs.forEach(log => {
          const key = `${log.admin_user_id}_${new Date(log.created_at).toDateString()}`;
          counts[key] = (counts[key] || 0) + 1;
        });
        setActivityCounts(counts);
      }
    } catch (error) {
      console.error("Error loading recent logs:", error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("admin-activity-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_activity_logs",
        },
        (payload) => {
          const log = payload.new as ActivityLog;
          analyzeAndNotify(log);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const analyzeAndNotify = async (log: ActivityLog) => {
    const notifications: Notification[] = [];

    // Load profile if not cached
    if (!profiles[log.admin_user_id]) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", log.admin_user_id)
        .single();

      if (profile) {
        setProfiles(prev => ({ ...prev, [log.admin_user_id]: profile }));
      }
    }

    const adminName = profiles[log.admin_user_id]?.email || 
                      profiles[log.admin_user_id]?.full_name || 
                      "Unknown Admin";

    // 1. Critical: Admin role changes
    if (log.action_type === "grant_admin_role" || log.action_type === "revoke_admin_role") {
      const notification: Notification = {
        id: `${log.id}-critical`,
        type: "critical",
        title: "Admin Role Changed",
        message: `${adminName} ${log.action_type === "grant_admin_role" ? "granted" : "revoked"} admin role ${log.target_user_email ? `for ${log.target_user_email}` : ""}`,
        timestamp: log.created_at,
        log,
      };

      notifications.push(notification);

      toast({
        title: "🚨 Critical Action",
        description: notification.message,
        variant: "destructive",
      });
    }

    // 2. Detect rapid successive actions (potential bot/abuse)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentLogs } = await supabase
      .from("admin_activity_logs")
      .select("*")
      .eq("admin_user_id", log.admin_user_id)
      .gte("created_at", fiveMinutesAgo);

    if (recentLogs && recentLogs.length >= 10) {
      const notification: Notification = {
        id: `${log.id}-rapid`,
        type: "warning",
        title: "Unusual Activity Detected",
        message: `${adminName} performed ${recentLogs.length} actions in the last 5 minutes`,
        timestamp: log.created_at,
        log,
      };

      notifications.push(notification);

      toast({
        title: "⚠️ Suspicious Activity",
        description: notification.message,
        variant: "default",
      });
    }

    // 3. Detect off-hours activity (before 6 AM or after 10 PM)
    const hour = new Date(log.created_at).getHours();
    if (hour < 6 || hour >= 22) {
      const notification: Notification = {
        id: `${log.id}-offhours`,
        type: "warning",
        title: "Off-Hours Activity",
        message: `${adminName} performed action at ${new Date(log.created_at).toLocaleTimeString()}`,
        timestamp: log.created_at,
        log,
      };

      notifications.push(notification);

      toast({
        title: "🌙 Off-Hours Activity",
        description: notification.message,
      });
    }

    // 4. High volume of actions per day
    const todayKey = `${log.admin_user_id}_${new Date(log.created_at).toDateString()}`;
    const currentCount = activityCounts[todayKey] || 0;
    const newCount = currentCount + 1;
    
    setActivityCounts(prev => ({ ...prev, [todayKey]: newCount }));

    if (newCount >= 50 && newCount % 10 === 0) {
      const notification: Notification = {
        id: `${log.id}-volume`,
        type: "info",
        title: "High Activity Volume",
        message: `${adminName} has performed ${newCount} actions today`,
        timestamp: log.created_at,
        log,
      };

      notifications.push(notification);
    }

    // Add all notifications
    if (notifications.length > 0) {
      setNotifications(prev => [...notifications, ...prev].slice(0, 100)); // Keep last 100
      setUnreadCount(prev => prev + notifications.length);
    }
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "critical":
        return <Shield className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <UserCog className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "critical":
        return "border-l-4 border-destructive bg-destructive/5";
      case "warning":
        return "border-l-4 border-yellow-500 bg-yellow-500/5";
      case "info":
        return "border-l-4 border-blue-500 bg-blue-500/5";
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative"
          onClick={markAsRead}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Admin Activity Alerts
          </SheetTitle>
          <SheetDescription>
            Real-time notifications for critical actions and suspicious patterns
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <Card className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No notifications yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You'll be notified of critical actions and suspicious patterns
                </p>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`p-4 ${getNotificationColor(notification.type)}`}
                >
                  <div className="flex gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm">
                          {notification.title}
                        </h4>
                        <Badge 
                          variant={
                            notification.type === "critical" 
                              ? "destructive" 
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {notification.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Clock className="h-3 w-3" />
                        {new Date(notification.timestamp).toLocaleString()}
                      </div>
                      {notification.log && (
                        <details className="text-xs mt-2">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(notification.log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
