import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Clock, CheckCircle, XCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WebhookEvent {
  id: string;
  event_type: string;
  payload: any;
  created_at: string;
  vai_number: string;
  processed: boolean;
}

interface ReplayHistory {
  id: string;
  replayed_at: string;
  target_url: string;
  response_status: number | null;
  response_time_ms: number | null;
  success: boolean;
  error_message: string | null;
}

export function WebhookReplayViewer() {
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEvent | null>(null);
  const [targetUrl, setTargetUrl] = useState("");
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayHistory, setReplayHistory] = useState<ReplayHistory[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    const { data, error } = await supabase
      .from("vairify_webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading webhooks:", error);
      return;
    }

    setWebhooks(data || []);
  };

  const loadReplayHistory = async (webhookId: string) => {
    const { data, error } = await supabase
      .from("webhook_replay_history")
      .select("*")
      .eq("original_webhook_id", webhookId)
      .order("replayed_at", { ascending: false });

    if (error) {
      console.error("Error loading replay history:", error);
      return;
    }

    setReplayHistory(data || []);
  };

  const handleSelectWebhook = (webhook: WebhookEvent) => {
    setSelectedWebhook(webhook);
    loadReplayHistory(webhook.id);
    
    // Set default target URL from config if available
    setTargetUrl("http://localhost:3000/webhook");
  };

  const handleReplay = async () => {
    if (!selectedWebhook || !targetUrl) {
      toast({
        title: "Error",
        description: "Please select a webhook and enter a target URL",
        variant: "destructive",
      });
      return;
    }

    setIsReplaying(true);

    try {
      const { data, error } = await supabase.functions.invoke("replay-webhook", {
        body: {
          webhookEventId: selectedWebhook.id,
          targetUrl: targetUrl,
        },
      });

      if (error) throw error;

      toast({
        title: data.success ? "Replay Successful" : "Replay Failed",
        description: data.success 
          ? `Webhook replayed successfully in ${data.responseTime}ms`
          : data.errorMessage,
        variant: data.success ? "default" : "destructive",
      });

      // Reload replay history
      loadReplayHistory(selectedWebhook.id);
    } catch (error: any) {
      console.error("Error replaying webhook:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to replay webhook",
        variant: "destructive",
      });
    } finally {
      setIsReplaying(false);
    }
  };

  const copyPayload = () => {
    if (!selectedWebhook) return;
    navigator.clipboard.writeText(JSON.stringify(selectedWebhook.payload, null, 2));
    toast({
      title: "Copied",
      description: "Webhook payload copied to clipboard",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Webhook List */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Recent Webhook Events</h3>
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {webhooks.map((webhook) => (
              <Card
                key={webhook.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedWebhook?.id === webhook.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => handleSelectWebhook(webhook)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{webhook.event_type}</Badge>
                  {webhook.processed && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  VAI: {webhook.vai_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(webhook.created_at).toLocaleString()}
                </p>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Webhook Details & Replay */}
      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Replay Webhook</h3>
          
          {!selectedWebhook ? (
            <p className="text-muted-foreground">Select a webhook to replay</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Target URL</label>
                <Input
                  placeholder="https://your-endpoint.com/webhook"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                />
              </div>

              <Tabs defaultValue="payload">
                <TabsList className="w-full">
                  <TabsTrigger value="payload" className="flex-1">Payload</TabsTrigger>
                  <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="payload" className="mt-4">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={copyPayload}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[300px]">
                      {JSON.stringify(selectedWebhook.payload, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="history" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    {replayHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No replay history yet</p>
                    ) : (
                      <div className="space-y-2">
                        {replayHistory.map((replay) => (
                          <Card key={replay.id} className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              {replay.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <Badge variant={replay.success ? "default" : "destructive"}>
                                {replay.response_status || "Error"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {replay.target_url}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {replay.response_time_ms}ms
                              <span className="ml-2">
                                {new Date(replay.replayed_at).toLocaleString()}
                              </span>
                            </div>
                            {replay.error_message && (
                              <p className="text-xs text-destructive mt-2">
                                {replay.error_message}
                              </p>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              <Button
                onClick={handleReplay}
                disabled={isReplaying || !targetUrl}
                className="w-full"
              >
                {isReplaying ? (
                  "Replaying..."
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Replay Webhook
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
