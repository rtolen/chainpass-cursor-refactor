import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Trash2, Mail, MessageSquare, AlertCircle, TrendingUp, Activity } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AlertSetting {
  id: string;
  alert_name: string;
  alert_type: string;
  enabled: boolean;
  severity_threshold: string[];
  notification_channels: string[];
  email_recipients: string[];
  slack_webhook_url: string | null;
  slack_channel: string | null;
  cooldown_minutes: number;
  last_triggered_at: string | null;
}

export default function ApiAlertManager() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AlertSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [testingAlert, setTestingAlert] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    alert_name: "",
    alert_type: "error_rate",
    enabled: true,
    notification_channels: ["email"],
    email_recipients: "",
    slack_webhook_url: "",
    slack_channel: "",
    severity_threshold: ["high", "critical"],
    cooldown_minutes: 15,
  });

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("alert_settings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading alerts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    try {
      const emailRecipients = formData.email_recipients
        .split(",")
        .map(e => e.trim())
        .filter(e => e);

      const { error } = await supabase.from("alert_settings").insert({
        alert_name: formData.alert_name,
        alert_type: formData.alert_type,
        enabled: formData.enabled,
        notification_channels: formData.notification_channels,
        email_recipients: emailRecipients,
        slack_webhook_url: formData.slack_webhook_url || null,
        slack_channel: formData.slack_channel || null,
        severity_threshold: formData.severity_threshold,
        cooldown_minutes: formData.cooldown_minutes,
      });

      if (error) throw error;

      toast({
        title: "Alert created",
        description: "Alert setting has been created successfully",
      });

      setIsCreating(false);
      setFormData({
        alert_name: "",
        alert_type: "error_rate",
        enabled: true,
        notification_channels: ["email"],
        email_recipients: "",
        slack_webhook_url: "",
        slack_channel: "",
        severity_threshold: ["high", "critical"],
        cooldown_minutes: 15,
      });
      loadAlerts();
    } catch (error: any) {
      toast({
        title: "Error creating alert",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleAlert = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("alert_settings")
        .update({ enabled })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: enabled ? "Alert enabled" : "Alert disabled",
        description: `Alert has been ${enabled ? "enabled" : "disabled"}`,
      });

      loadAlerts();
    } catch (error: any) {
      toast({
        title: "Error updating alert",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from("alert_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Alert deleted",
        description: "Alert setting has been deleted",
      });

      loadAlerts();
    } catch (error: any) {
      toast({
        title: "Error deleting alert",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const testAlert = async (id: string) => {
    setTestingAlert(id);
    try {
      const { error } = await supabase.functions.invoke("test-alert-notification", {
        body: { alert_id: id },
      });

      if (error) throw error;

      toast({
        title: "Test alert sent",
        description: "Check your email/Slack for the test notification",
      });
    } catch (error: any) {
      toast({
        title: "Error sending test alert",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestingAlert(null);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error_rate": return <AlertCircle className="h-4 w-4" />;
      case "response_time": return <Activity className="h-4 w-4" />;
      case "request_spike": return <TrendingUp className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case "error_rate": return "Error Rate";
      case "response_time": return "Response Time";
      case "request_spike": return "Request Spike";
      case "endpoint_anomaly": return "Endpoint Anomaly";
      default: return type;
    }
  };

  if (loading) {
    return <div>Loading alerts...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                API Alert Manager
              </CardTitle>
              <CardDescription>Configure automatic alerts for API usage thresholds</CardDescription>
            </div>
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Alert</DialogTitle>
                  <DialogDescription>Configure a new monitoring alert for API usage</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="alert_name">Alert Name</Label>
                    <Input
                      id="alert_name"
                      value={formData.alert_name}
                      onChange={(e) => setFormData({ ...formData, alert_name: e.target.value })}
                      placeholder="High Error Rate Alert"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alert_type">Alert Type</Label>
                    <Select value={formData.alert_type} onValueChange={(value) => setFormData({ ...formData, alert_type: value })}>
                      <SelectTrigger id="alert_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error_rate">Error Rate ({'>'}5%)</SelectItem>
                        <SelectItem value="response_time">Response Time ({'>'}2s)</SelectItem>
                        <SelectItem value="request_spike">Request Spike (3x increase)</SelectItem>
                        <SelectItem value="endpoint_anomaly">Endpoint Anomaly ({'>'}50% traffic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notification Channels</Label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.notification_channels.includes("email")}
                          onChange={(e) => {
                            const channels = e.target.checked
                              ? [...formData.notification_channels, "email"]
                              : formData.notification_channels.filter(c => c !== "email");
                            setFormData({ ...formData, notification_channels: channels });
                          }}
                        />
                        <Mail className="h-4 w-4" />
                        Email
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.notification_channels.includes("slack")}
                          onChange={(e) => {
                            const channels = e.target.checked
                              ? [...formData.notification_channels, "slack"]
                              : formData.notification_channels.filter(c => c !== "slack");
                            setFormData({ ...formData, notification_channels: channels });
                          }}
                        />
                        <MessageSquare className="h-4 w-4" />
                        Slack
                      </label>
                    </div>
                  </div>

                  {formData.notification_channels.includes("email") && (
                    <div className="space-y-2">
                      <Label htmlFor="email_recipients">Email Recipients</Label>
                      <Input
                        id="email_recipients"
                        value={formData.email_recipients}
                        onChange={(e) => setFormData({ ...formData, email_recipients: e.target.value })}
                        placeholder="admin@example.com, team@example.com"
                      />
                      <p className="text-xs text-muted-foreground">Comma-separated email addresses</p>
                    </div>
                  )}

                  {formData.notification_channels.includes("slack") && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="slack_webhook_url">Slack Webhook URL</Label>
                        <Input
                          id="slack_webhook_url"
                          value={formData.slack_webhook_url}
                          onChange={(e) => setFormData({ ...formData, slack_webhook_url: e.target.value })}
                          placeholder="https://hooks.slack.com/services/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slack_channel">Slack Channel (optional)</Label>
                        <Input
                          id="slack_channel"
                          value={formData.slack_channel}
                          onChange={(e) => setFormData({ ...formData, slack_channel: e.target.value })}
                          placeholder="#alerts"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="cooldown">Cooldown Period (minutes)</Label>
                    <Input
                      id="cooldown"
                      type="number"
                      value={formData.cooldown_minutes}
                      onChange={(e) => setFormData({ ...formData, cooldown_minutes: parseInt(e.target.value) })}
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground">Minimum time between alerts</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                  <Button onClick={createAlert}>Create Alert</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No alerts configured. Create your first alert to start monitoring.
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getAlertIcon(alert.alert_type)}
                        <div>
                          <CardTitle className="text-base">{alert.alert_name}</CardTitle>
                          <CardDescription>
                            {getAlertTypeLabel(alert.alert_type)} • Cooldown: {alert.cooldown_minutes}min
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={alert.enabled}
                          onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testAlert(alert.id)}
                          disabled={testingAlert === alert.id}
                        >
                          {testingAlert === alert.id ? "Testing..." : "Test"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAlert(alert.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {alert.notification_channels.map((channel) => (
                        <Badge key={channel} variant="secondary">
                          {channel === "email" ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                          {channel}
                        </Badge>
                      ))}
                      {alert.last_triggered_at && (
                        <Badge variant="outline">
                          Last: {new Date(alert.last_triggered_at).toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
