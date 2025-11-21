import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, MessageSquare, Phone, Plus, Trash2, Edit, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AlertSetting {
  id: string;
  enabled: boolean;
  alert_name: string;
  alert_type: string;
  severity_threshold: string[];
  notification_channels: string[];
  email_recipients: string[];
  slack_webhook_url?: string;
  slack_channel?: string;
  sms_recipients: string[];
  cooldown_minutes: number;
  last_triggered_at?: string;
}

export function AlertManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertSetting | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState({
    alert_name: "",
    alert_type: "anomaly",
    severity_threshold: ["high", "critical"],
    notification_channels: ["email"],
    email_recipients: [""],
    slack_webhook_url: "",
    slack_channel: "",
    sms_recipients: [""],
    cooldown_minutes: 15,
    enabled: true,
  });

  const { data: alertSettings } = useQuery({
    queryKey: ["alert-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_settings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AlertSetting[];
    },
  });

  const { data: alertHistory } = useQuery({
    queryKey: ["alert-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_history")
        .select("*")
        .order("triggered_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("alert_settings")
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-settings"] });
      toast({ title: "Alert created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("alert_settings")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-settings"] });
      toast({ title: "Alert updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alert_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-settings"] });
      toast({ title: "Alert deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testAlertMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-alert-notification');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alert-history"] });
      toast({
        title: "Test alert triggered",
        description: `Alert sent successfully. Check your configured notification channels.`,
      });
      console.log('Test alert result:', data);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send test alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      alert_name: "",
      alert_type: "anomaly",
      severity_threshold: ["high", "critical"],
      notification_channels: ["email"],
      email_recipients: [""],
      slack_webhook_url: "",
      slack_channel: "",
      sms_recipients: [""],
      cooldown_minutes: 15,
      enabled: true,
    });
    setEditingAlert(null);
  };

  const handleEdit = (alert: AlertSetting) => {
    setEditingAlert(alert);
    setFormData({
      alert_name: alert.alert_name,
      alert_type: alert.alert_type,
      severity_threshold: alert.severity_threshold,
      notification_channels: alert.notification_channels,
      email_recipients: alert.email_recipients || [""],
      slack_webhook_url: alert.slack_webhook_url || "",
      slack_channel: alert.slack_channel || "",
      sms_recipients: alert.sms_recipients || [""],
      cooldown_minutes: alert.cooldown_minutes,
      enabled: alert.enabled,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      email_recipients: formData.email_recipients.filter(e => e.trim()),
      sms_recipients: formData.sms_recipients.filter(s => s.trim()),
    };

    if (editingAlert) {
      updateMutation.mutate({ id: editingAlert.id, data });
      setIsDialogOpen(false);
      resetForm();
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      notification_channels: prev.notification_channels.includes(channel)
        ? prev.notification_channels.filter(c => c !== channel)
        : [...prev.notification_channels, channel],
    }));
  };

  const toggleSeverity = (severity: string) => {
    setFormData(prev => ({
      ...prev,
      severity_threshold: prev.severity_threshold.includes(severity)
        ? prev.severity_threshold.filter(s => s !== severity)
        : [...prev.severity_threshold, severity],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Alert Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure automated notifications for security events
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => testAlertMutation.mutate()}
            disabled={testAlertMutation.isPending}
          >
            <Bell className="mr-2 h-4 w-4" />
            {testAlertMutation.isPending ? "Sending..." : "Test Alerts"}
          </Button>
          <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
            <History className="mr-2 h-4 w-4" />
            {showHistory ? "Hide" : "Show"} History
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAlert ? "Edit Alert" : "Create New Alert"}
                </DialogTitle>
                <DialogDescription>
                  Configure when and how you want to be notified
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="alert_name">Alert Name</Label>
                  <Input
                    id="alert_name"
                    value={formData.alert_name}
                    onChange={(e) => setFormData({ ...formData, alert_name: e.target.value })}
                    placeholder="e.g., Critical Security Events"
                  />
                </div>

                <div>
                  <Label htmlFor="alert_type">Alert Type</Label>
                  <Select value={formData.alert_type} onValueChange={(value) => setFormData({ ...formData, alert_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anomaly">Anomaly</SelectItem>
                      <SelectItem value="security_event">Security Event</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Severity Threshold</Label>
                  <div className="flex gap-4 mt-2">
                    {["low", "medium", "high", "critical"].map((severity) => (
                      <div key={severity} className="flex items-center space-x-2">
                        <Checkbox
                          checked={formData.severity_threshold.includes(severity)}
                          onCheckedChange={() => toggleSeverity(severity)}
                        />
                        <label className="text-sm capitalize">{severity}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label>Notification Channels</Label>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.notification_channels.includes("email")}
                        onCheckedChange={() => toggleChannel("email")}
                      />
                      <Mail className="h-4 w-4" />
                      <label className="text-sm">Email</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.notification_channels.includes("slack")}
                        onCheckedChange={() => toggleChannel("slack")}
                      />
                      <MessageSquare className="h-4 w-4" />
                      <label className="text-sm">Slack</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.notification_channels.includes("sms")}
                        onCheckedChange={() => toggleChannel("sms")}
                      />
                      <Phone className="h-4 w-4" />
                      <label className="text-sm">SMS</label>
                    </div>
                  </div>
                </div>

                {formData.notification_channels.includes("email") && (
                  <div>
                    <Label>Email Recipients</Label>
                    {formData.email_recipients.map((email, idx) => (
                      <Input
                        key={idx}
                        value={email}
                        onChange={(e) => {
                          const newRecipients = [...formData.email_recipients];
                          newRecipients[idx] = e.target.value;
                          setFormData({ ...formData, email_recipients: newRecipients });
                        }}
                        placeholder="email@example.com"
                        className="mt-2"
                      />
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setFormData({ ...formData, email_recipients: [...formData.email_recipients, ""] })}
                    >
                      Add Recipient
                    </Button>
                  </div>
                )}

                {formData.notification_channels.includes("slack") && (
                  <>
                    <div>
                      <Label htmlFor="slack_webhook">Slack Webhook URL</Label>
                      <Input
                        id="slack_webhook"
                        value={formData.slack_webhook_url}
                        onChange={(e) => setFormData({ ...formData, slack_webhook_url: e.target.value })}
                        placeholder="https://hooks.slack.com/services/..."
                      />
                    </div>
                    <div>
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

                {formData.notification_channels.includes("sms") && (
                  <div>
                    <Label>SMS Recipients</Label>
                    {formData.sms_recipients.map((phone, idx) => (
                      <Input
                        key={idx}
                        value={phone}
                        onChange={(e) => {
                          const newRecipients = [...formData.sms_recipients];
                          newRecipients[idx] = e.target.value;
                          setFormData({ ...formData, sms_recipients: newRecipients });
                        }}
                        placeholder="+1234567890"
                        className="mt-2"
                      />
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setFormData({ ...formData, sms_recipients: [...formData.sms_recipients, ""] })}
                    >
                      Add Recipient
                    </Button>
                  </div>
                )}

                <div>
                  <Label htmlFor="cooldown">Cooldown Period (minutes)</Label>
                  <Input
                    id="cooldown"
                    type="number"
                    value={formData.cooldown_minutes}
                    onChange={(e) => setFormData({ ...formData, cooldown_minutes: parseInt(e.target.value) })}
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum time between alerts to prevent spam
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                  />
                  <Label>Enable this alert</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingAlert ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showHistory ? (
        <Card>
          <CardHeader>
            <CardTitle>Alert History</CardTitle>
            <CardDescription>Recent notification activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {alertHistory && alertHistory.length > 0 ? (
                <div className="space-y-3">
                  {alertHistory.map((history: any) => (
                    <div key={history.id} className="p-3 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{history.title}</p>
                          <p className="text-sm text-muted-foreground">{history.message}</p>
                        </div>
                        <Badge variant={history.sent_successfully ? "default" : "destructive"}>
                          {history.sent_successfully ? "Sent" : "Failed"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Severity: {history.severity}</span>
                        <span>•</span>
                        <span>{new Date(history.triggered_at).toLocaleString()}</span>
                        <span>•</span>
                        <span>Channels: {history.notification_channels.join(", ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No alert history</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {alertSettings && alertSettings.length > 0 ? (
            alertSettings.map((alert) => (
              <Card key={alert.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {alert.alert_name}
                        {!alert.enabled && (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {alert.alert_type} • Severity: {alert.severity_threshold.join(", ")}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(alert)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(alert.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={alert.enabled}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({ id: alert.id, data: { enabled: checked } })
                        }
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Channels:</span>
                      {alert.notification_channels.includes("email") && (
                        <Badge variant="outline"><Mail className="h-3 w-3 mr-1" />Email</Badge>
                      )}
                      {alert.notification_channels.includes("slack") && (
                        <Badge variant="outline"><MessageSquare className="h-3 w-3 mr-1" />Slack</Badge>
                      )}
                      {alert.notification_channels.includes("sms") && (
                        <Badge variant="outline"><Phone className="h-3 w-3 mr-1" />SMS</Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      Cooldown: {alert.cooldown_minutes}m
                    </span>
                    {alert.last_triggered_at && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          Last: {new Date(alert.last_triggered_at).toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  No alerts configured. Create your first alert to start receiving notifications.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
