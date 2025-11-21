import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Brain, AlertTriangle, Shield, CheckCircle2, Play, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

interface AnomalySettings {
  id: string;
  sensitivity_level: string;
  enabled: boolean;
  learning_period_days: number;
  min_data_points: number;
}

interface DetectedAnomaly {
  id: string;
  admin_user_id: string;
  anomaly_type: string;
  severity: string;
  description: string;
  confidence_score: number;
  supporting_data: any;
  resolved: boolean;
  detected_at: string;
  notes: string | null;
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
}

export const AnomalyDetection = () => {
  const [settings, setSettings] = useState<AnomalySettings | null>(null);
  const [anomalies, setAnomalies] = useState<DetectedAnomaly[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadAnomalies();
    setupRealtimeSubscription();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("anomaly_detection_settings")
        .select("*")
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error",
        description: "Failed to load anomaly detection settings",
        variant: "destructive",
      });
    }
  };

  const loadAnomalies = async () => {
    setIsLoading(true);
    try {
      const { data: anomaliesData, error } = await supabase
        .from("detected_anomalies")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setAnomalies(anomaliesData || []);

      // Load profiles
      const adminIds = [...new Set(anomaliesData?.map(a => a.admin_user_id) || [])];
      if (adminIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", adminIds);

        if (profilesData) {
          const profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, Profile>);
          setProfiles(profilesMap);
        }
      }
    } catch (error) {
      console.error("Error loading anomalies:", error);
      toast({
        title: "Error",
        description: "Failed to load detected anomalies",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("anomaly-detection-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "detected_anomalies",
        },
        (payload) => {
          const newAnomaly = payload.new as DetectedAnomaly;
          setAnomalies(prev => [newAnomaly, ...prev]);
          
          toast({
            title: "🚨 New Anomaly Detected",
            description: newAnomaly.description,
            variant: newAnomaly.severity === "critical" ? "destructive" : "default",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateSettings = async (updates: Partial<AnomalySettings>) => {
    if (!settings) return;

    try {
      const { error } = await supabase
        .from("anomaly_detection_settings")
        .update(updates)
        .eq("id", settings.id);

      if (error) throw error;

      setSettings({ ...settings, ...updates });
      toast({
        title: "Settings Updated",
        description: "Anomaly detection settings have been saved",
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  const runDetection = async () => {
    setIsRunning(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/detect-anomalies`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to run anomaly detection");
      }

      toast({
        title: "Detection Complete",
        description: `Analyzed ${result.analyzed} admins, detected ${result.detected} anomalies`,
      });

      loadAnomalies();
    } catch (error) {
      console.error("Error running detection:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to run anomaly detection",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const resolveAnomaly = async (anomalyId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from("detected_anomalies")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          notes,
        })
        .eq("id", anomalyId);

      if (error) throw error;

      setAnomalies(prev =>
        prev.map(a => (a.id === anomalyId ? { ...a, resolved: true, notes } : a))
      );

      toast({
        title: "Anomaly Resolved",
        description: "The anomaly has been marked as resolved",
      });
    } catch (error) {
      console.error("Error resolving anomaly:", error);
      toast({
        title: "Error",
        description: "Failed to resolve anomaly",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const unresolvedAnomalies = anomalies.filter(a => !a.resolved);
  const resolvedAnomalies = anomalies.filter(a => a.resolved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI-Powered Anomaly Detection
          </h2>
          <p className="text-muted-foreground">
            Machine learning detects unusual admin behavior patterns
          </p>
        </div>
        <Button
          onClick={runDetection}
          disabled={isRunning || !settings?.enabled}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          {isRunning ? "Analyzing..." : "Run Detection"}
        </Button>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Detection Settings
          </CardTitle>
          <CardDescription>
            Configure sensitivity and learning parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Anomaly Detection</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable automatic detection
              </p>
            </div>
            <Switch
              checked={settings?.enabled || false}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          {/* Sensitivity Level */}
          <div className="space-y-2">
            <Label>Sensitivity Level</Label>
            <Select
              value={settings?.sensitivity_level || "medium"}
              onValueChange={(sensitivity_level) => updateSettings({ sensitivity_level })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Only critical anomalies</SelectItem>
                <SelectItem value="medium">Medium - Balanced detection</SelectItem>
                <SelectItem value="high">High - Detect minor deviations</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Higher sensitivity may result in more false positives
            </p>
          </div>

          {/* Info */}
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              Learning period: {settings?.learning_period_days || 30} days | 
              Minimum data points: {settings?.min_data_points || 50}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Anomalies Tabs */}
      <Tabs defaultValue="unresolved">
        <TabsList>
          <TabsTrigger value="unresolved">
            Unresolved ({unresolvedAnomalies.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({resolvedAnomalies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unresolved" className="space-y-4 mt-4">
          {unresolvedAnomalies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">No unresolved anomalies detected</p>
              </CardContent>
            </Card>
          ) : (
            unresolvedAnomalies.map((anomaly) => (
              <AnomalyCard
                key={anomaly.id}
                anomaly={anomaly}
                profile={profiles[anomaly.admin_user_id]}
                getSeverityColor={getSeverityColor}
                onResolve={resolveAnomaly}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4 mt-4">
          {resolvedAnomalies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No resolved anomalies yet</p>
              </CardContent>
            </Card>
          ) : (
            resolvedAnomalies.map((anomaly) => (
              <AnomalyCard
                key={anomaly.id}
                anomaly={anomaly}
                profile={profiles[anomaly.admin_user_id]}
                getSeverityColor={getSeverityColor}
                onResolve={resolveAnomaly}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Separate component for anomaly card
const AnomalyCard = ({
  anomaly,
  profile,
  getSeverityColor,
  onResolve,
}: {
  anomaly: DetectedAnomaly;
  profile?: Profile;
  getSeverityColor: (severity: string) => string;
  onResolve: (id: string, notes: string) => void;
}) => {
  const [resolveNotes, setResolveNotes] = useState("");
  const [showResolve, setShowResolve] = useState(false);

  return (
    <Card className={`border-l-4 ${anomaly.resolved ? "opacity-60" : ""}`} style={{ borderLeftColor: `hsl(var(--${anomaly.severity}))` }}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <CardTitle className="text-base">{anomaly.anomaly_type}</CardTitle>
              <Badge className={getSeverityColor(anomaly.severity)}>
                {anomaly.severity}
              </Badge>
              <Badge variant="outline">
                {(anomaly.confidence_score * 100).toFixed(0)}% confidence
              </Badge>
              {anomaly.resolved && (
                <Badge variant="secondary">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Resolved
                </Badge>
              )}
            </div>
            <CardDescription>
              Admin: {profile?.email || profile?.full_name || "Unknown"} | 
              Detected: {new Date(anomaly.detected_at).toLocaleString()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{anomaly.description}</p>

        {anomaly.supporting_data?.evidence && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <strong>Evidence:</strong> {anomaly.supporting_data.evidence}
          </div>
        )}

        {anomaly.supporting_data?.baseline && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Baseline avg/day:</span>{" "}
              <strong>{anomaly.supporting_data.baseline.avgActionsPerDay}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Last 24h actions:</span>{" "}
              <strong>{anomaly.supporting_data.recent?.actionsLast24h || 0}</strong>
            </div>
          </div>
        )}

        {anomaly.notes && (
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm">
            <strong>Resolution notes:</strong> {anomaly.notes}
          </div>
        )}

        {!anomaly.resolved && (
          <div className="space-y-2">
            {!showResolve ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowResolve(true)}
              >
                Resolve Anomaly
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add resolution notes..."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onResolve(anomaly.id, resolveNotes);
                      setShowResolve(false);
                      setResolveNotes("");
                    }}
                    disabled={!resolveNotes.trim()}
                  >
                    Confirm Resolution
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowResolve(false);
                      setResolveNotes("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
