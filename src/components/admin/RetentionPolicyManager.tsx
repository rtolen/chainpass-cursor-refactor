import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Archive, Trash2, Shield, Clock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RetentionPolicy {
  id: string;
  policy_name: string;
  retention_days: number;
  archive_before_delete: boolean;
  auto_delete_enabled: boolean;
  last_run_at: string | null;
}

export const RetentionPolicyManager = () => {
  const [policy, setPolicy] = useState<RetentionPolicy | null>(null);
  const [retentionDays, setRetentionDays] = useState(90);
  const [archiveEnabled, setArchiveEnabled] = useState(true);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("retention_policies")
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        setPolicy(data);
        setRetentionDays(data.retention_days);
        setArchiveEnabled(data.archive_before_delete);
        setAutoDeleteEnabled(data.auto_delete_enabled);
      }
    } catch (error) {
      console.error("Error fetching retention policy:", error);
      toast({
        title: "Error",
        description: "Failed to load retention policy",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (autoDeleteEnabled && !policy?.auto_delete_enabled) {
      setShowDeleteWarning(true);
      return;
    }

    await savePolicy();
  };

  const savePolicy = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("retention_policies")
        .update({
          retention_days: retentionDays,
          archive_before_delete: archiveEnabled,
          auto_delete_enabled: autoDeleteEnabled,
        })
        .eq("id", policy?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Retention policy updated successfully",
      });

      fetchPolicy();
    } catch (error) {
      console.error("Error saving retention policy:", error);
      toast({
        title: "Error",
        description: "Failed to update retention policy",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setShowDeleteWarning(false);
    }
  };

  const runPolicyNow = async () => {
    setIsLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/run-retention-policy`,
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
        throw new Error(result.error || "Failed to run retention policy");
      }

      toast({
        title: "Retention Policy Executed",
        description: `Archived: ${result.archivedCount} logs, Deleted: ${result.deletedCount} logs`,
      });

      fetchPolicy();
    } catch (error) {
      console.error("Error running retention policy:", error);
      toast({
        title: "Error",
        description: "Failed to execute retention policy",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !policy) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading policy...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Retention Policy Manager
          </CardTitle>
          <CardDescription>
            Configure automatic archiving and deletion of old activity logs for compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Retention Period */}
          <div className="space-y-2">
            <Label htmlFor="retention-days" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Retention Period (Days)
            </Label>
            <Input
              id="retention-days"
              type="number"
              min="1"
              max="3650"
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value))}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              Logs older than {retentionDays} days will be processed
            </p>
          </div>

          {/* Archive Option */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Archive Before Delete
              </Label>
              <p className="text-sm text-muted-foreground">
                Move logs to archive table before deletion for compliance
              </p>
            </div>
            <Switch
              checked={archiveEnabled}
              onCheckedChange={setArchiveEnabled}
            />
          </div>

          {/* Auto Delete Option */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Auto-Delete Enabled
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically delete logs after retention period expires
                </p>
              </div>
              <Switch
                checked={autoDeleteEnabled}
                onCheckedChange={setAutoDeleteEnabled}
              />
            </div>

            {autoDeleteEnabled && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Auto-deletion is enabled. Logs older than {retentionDays} days will be permanently removed. 
                  {archiveEnabled ? " They will be archived first." : " No archive will be kept."}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Last Run Info */}
          {policy?.last_run_at && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">
                Last executed:{" "}
                <span className="font-medium text-foreground">
                  {new Date(policy.last_run_at).toLocaleString()}
                </span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? "Saving..." : "Save Policy"}
            </Button>
            <Button
              onClick={runPolicyNow}
              disabled={isLoading}
              variant="outline"
            >
              Run Now
            </Button>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              For automated execution, set up a scheduled job (cron) to call the run-retention-policy edge function periodically.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Enable Auto-Delete?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to enable automatic deletion of activity logs. This action will:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Permanently delete logs older than {retentionDays} days</li>
                {archiveEnabled && <li>Archive logs before deletion</li>}
                {!archiveEnabled && (
                  <li className="text-destructive font-medium">
                    Delete logs WITHOUT archiving them first
                  </li>
                )}
              </ul>
              <p className="font-medium">
                This may impact compliance requirements. Are you sure you want to proceed?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAutoDeleteEnabled(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={savePolicy} className="bg-destructive hover:bg-destructive/90">
              Enable Auto-Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
