import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Plus, Trash2, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DigestSettings {
  id: string;
  enabled: boolean;
  frequency: string;
  send_time: string;
  include_activity_summary: boolean;
  include_anomaly_report: boolean;
  include_comparison_charts: boolean;
  include_performance_metrics: boolean;
  last_sent_at: string | null;
}

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
}

interface DigestHistory {
  id: string;
  sent_at: string;
  recipients: string[];
  frequency: string;
  success: boolean;
}

export const EmailDigestManager = () => {
  const [settings, setSettings] = useState<DigestSettings | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [history, setHistory] = useState<DigestHistory[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadRecipients();
    loadHistory();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("email_digest_settings")
        .select("*")
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error",
        description: "Failed to load digest settings",
        variant: "destructive",
      });
    }
  };

  const loadRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from("email_digest_recipients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecipients(data || []);
    } catch (error) {
      console.error("Error loading recipients:", error);
    }
  };

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("email_digest_history")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const updateSettings = async (updates: Partial<DigestSettings>) => {
    if (!settings) return;

    try {
      const { error } = await supabase
        .from("email_digest_settings")
        .update(updates)
        .eq("id", settings.id);

      if (error) throw error;

      setSettings({ ...settings, ...updates });
      toast({
        title: "Settings Updated",
        description: "Email digest settings have been saved",
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

  const addRecipient = async () => {
    if (!newEmail.trim()) return;

    try {
      const { error } = await supabase
        .from("email_digest_recipients")
        .insert({ email: newEmail, name: newName || null });

      if (error) throw error;

      setNewEmail("");
      setNewName("");
      loadRecipients();
      toast({
        title: "Recipient Added",
        description: `${newEmail} will receive digest emails`,
      });
    } catch (error) {
      console.error("Error adding recipient:", error);
      toast({
        title: "Error",
        description: "Failed to add recipient",
        variant: "destructive",
      });
    }
  };

  const removeRecipient = async (id: string) => {
    try {
      const { error } = await supabase
        .from("email_digest_recipients")
        .delete()
        .eq("id", id);

      if (error) throw error;

      loadRecipients();
      toast({
        title: "Recipient Removed",
        description: "Recipient has been removed from the list",
      });
    } catch (error) {
      console.error("Error removing recipient:", error);
      toast({
        title: "Error",
        description: "Failed to remove recipient",
        variant: "destructive",
      });
    }
  };

  const toggleRecipient = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("email_digest_recipients")
        .update({ active })
        .eq("id", id);

      if (error) throw error;
      loadRecipients();
    } catch (error) {
      console.error("Error toggling recipient:", error);
    }
  };

  const sendNow = async () => {
    setIsSending(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-admin-digest`,
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
        throw new Error(result.error || result.message || "Failed to send digest");
      }

      toast({
        title: "Digest Sent!",
        description: `Successfully sent to ${result.sent} recipient(s)`,
      });

      loadHistory();
      loadSettings();
    } catch (error) {
      console.error("Error sending digest:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send digest",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const activeRecipients = recipients.filter(r => r.active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Email Digest Manager
          </h2>
          <p className="text-muted-foreground">
            Schedule automated activity reports via email
          </p>
        </div>
        <Button
          onClick={sendNow}
          disabled={isSending || !settings?.enabled || activeRecipients.length === 0}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {isSending ? "Sending..." : "Send Now"}
        </Button>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Digest Configuration</CardTitle>
          <CardDescription>
            Configure frequency and content of email digests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Email Digests</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send scheduled reports
              </p>
            </div>
            <Switch
              checked={settings?.enabled || false}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={settings?.frequency || "weekly"}
              onValueChange={(frequency) => updateSettings({ frequency })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Send Time */}
          <div className="space-y-2">
            <Label>Send Time (24h format)</Label>
            <Input
              type="time"
              value={settings?.send_time || "09:00"}
              onChange={(e) => updateSettings({ send_time: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              Time zone: Server time (UTC)
            </p>
          </div>

          {/* Content Options */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base">Include in Digest</Label>
            
            <div className="flex items-center justify-between">
              <Label className="font-normal">Activity Summary</Label>
              <Switch
                checked={settings?.include_activity_summary || false}
                onCheckedChange={(include_activity_summary) =>
                  updateSettings({ include_activity_summary })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="font-normal">Anomaly Report</Label>
              <Switch
                checked={settings?.include_anomaly_report || false}
                onCheckedChange={(include_anomaly_report) =>
                  updateSettings({ include_anomaly_report })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="font-normal">Performance Metrics</Label>
              <Switch
                checked={settings?.include_performance_metrics || false}
                onCheckedChange={(include_performance_metrics) =>
                  updateSettings({ include_performance_metrics })
                }
              />
            </div>
          </div>

          {settings?.last_sent_at && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Last sent: {new Date(settings.last_sent_at).toLocaleString()}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recipients Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
          <CardDescription>
            Manage who receives the digest emails ({activeRecipients.length} active)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Recipient */}
          <div className="flex gap-2">
            <Input
              placeholder="Email address"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addRecipient()}
            />
            <Input
              placeholder="Name (optional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addRecipient()}
              className="max-w-[200px]"
            />
            <Button onClick={addRecipient} disabled={!newEmail.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Recipients List */}
          <div className="space-y-2">
            {recipients.map((recipient) => (
              <div
                key={recipient.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={recipient.active}
                    onCheckedChange={(active) => toggleRecipient(recipient.id, active)}
                  />
                  <div>
                    <div className="font-medium">{recipient.email}</div>
                    {recipient.name && (
                      <div className="text-sm text-muted-foreground">{recipient.name}</div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRecipient(recipient.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {recipients.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No recipients added yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History Card */}
      <Card>
        <CardHeader>
          <CardTitle>Send History</CardTitle>
          <CardDescription>Recent digest deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {item.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium">
                      {new Date(item.sent_at).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.recipients.length} recipient(s)
                    </div>
                  </div>
                </div>
                <Badge variant={item.success ? "default" : "destructive"}>
                  {item.frequency}
                </Badge>
              </div>
            ))}

            {history.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No digests sent yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
