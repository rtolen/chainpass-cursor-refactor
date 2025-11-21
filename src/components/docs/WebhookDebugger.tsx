import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bug, Play, Trash2, Copy, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface WebhookEvent {
  id: string;
  timestamp: Date;
  event_type: string;
  payload: any;
  headers: Record<string, string>;
  signature: string;
  verified: boolean;
  replayed: boolean;
}

export const WebhookDebugger = () => {
  const { toast } = useToast();
  const [capturedEvents, setCapturedEvents] = useState<WebhookEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [testPayload, setTestPayload] = useState(`{
  "event_type": "verification.completed",
  "vai_number": "VAI-12345",
  "user_id": "user_123",
  "status": "completed",
  "timestamp": "${new Date().toISOString()}"
}`);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");

  // Simulate webhook capture
  const startCapture = () => {
    setIsCapturing(true);
    toast({
      title: "Webhook Capture Started",
      description: "Listening for incoming webhooks...",
    });

    // Simulate receiving a webhook after 3 seconds
    setTimeout(() => {
      const mockEvent: WebhookEvent = {
        id: `wh_${Date.now()}`,
        timestamp: new Date(),
        event_type: "verification.completed",
        payload: {
          event_type: "verification.completed",
          vai_number: "VAI-" + Math.floor(Math.random() * 100000),
          user_id: "user_" + Math.floor(Math.random() * 1000),
          status: "completed",
          timestamp: new Date().toISOString()
        },
        headers: {
          "content-type": "application/json",
          "x-webhook-signature": "abc123def456",
          "x-webhook-timestamp": Date.now().toString(),
          "user-agent": "ChainPass-Webhook/1.0"
        },
        signature: "abc123def456",
        verified: true,
        replayed: false
      };

      setCapturedEvents(prev => [mockEvent, ...prev]);
      toast({
        title: "Webhook Captured!",
        description: `Received ${mockEvent.event_type} event`,
      });
    }, 3000);
  };

  const stopCapture = () => {
    setIsCapturing(false);
    toast({
      title: "Capture Stopped",
      description: "No longer listening for webhooks",
    });
  };

  const sendTestWebhook = async () => {
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sending Test Webhook...",
      description: "This may take a few seconds",
    });

    // Simulate sending webhook
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockEvent: WebhookEvent = {
      id: `wh_test_${Date.now()}`,
      timestamp: new Date(),
      event_type: JSON.parse(testPayload).event_type,
      payload: JSON.parse(testPayload),
      headers: {
        "content-type": "application/json",
        "x-webhook-signature": "test_signature_123",
        "x-webhook-timestamp": Date.now().toString()
      },
      signature: "test_signature_123",
      verified: true,
      replayed: false
    };

    setCapturedEvents(prev => [mockEvent, ...prev]);
    toast({
      title: "Test Webhook Sent!",
      description: "Check your endpoint logs",
    });
  };

  const replayWebhook = async (event: WebhookEvent) => {
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL to replay to",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Replaying Webhook...",
      description: `Resending event ${event.id}`,
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mark as replayed
    setCapturedEvents(prev =>
      prev.map(e => e.id === event.id ? { ...e, replayed: true } : e)
    );

    toast({
      title: "Webhook Replayed!",
      description: "Event sent to your endpoint",
    });
  };

  const clearEvents = () => {
    setCapturedEvents([]);
    setSelectedEvent(null);
    toast({
      title: "Events Cleared",
      description: "All captured webhooks have been removed",
    });
  };

  const copyPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast({
      title: "Copied!",
      description: "Webhook payload copied to clipboard",
    });
  };

  const verifySignature = (event: WebhookEvent) => {
    // Simulate signature verification
    const verified = Math.random() > 0.2; // 80% success rate for demo
    
    setCapturedEvents(prev =>
      prev.map(e => e.id === event.id ? { ...e, verified } : e)
    );

    toast({
      title: verified ? "Signature Valid" : "Signature Invalid",
      description: verified 
        ? "HMAC signature verification passed" 
        : "Signature does not match expected value",
      variant: verified ? "default" : "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-primary" />
            Webhook Debugger
          </CardTitle>
          <CardDescription>
            Capture, inspect, and replay webhook events for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Your Webhook URL</Label>
            <Input
              placeholder="https://your-app.com/api/webhooks/chainpass"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Shared Secret (Optional)</Label>
            <Input
              type="password"
              placeholder="Your webhook shared secret"
              value={sharedSecret}
              onChange={(e) => setSharedSecret(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {!isCapturing ? (
              <Button onClick={startCapture} className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                Start Capturing
              </Button>
            ) : (
              <Button onClick={stopCapture} variant="destructive" className="flex-1">
                Stop Capture
              </Button>
            )}
            <Button onClick={clearEvents} variant="outline">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="captured">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="captured">
            Captured Events ({capturedEvents.length})
          </TabsTrigger>
          <TabsTrigger value="send">Send Test Webhook</TabsTrigger>
        </TabsList>

        <TabsContent value="captured" className="space-y-4">
          {capturedEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bug className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No webhooks captured yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start capturing to see incoming webhook events
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capturedEvents.map((event) => (
                      <TableRow
                        key={event.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <TableCell className="text-xs">
                          {format(event.timestamp, "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs">{event.event_type}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {event.verified ? (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Unverified
                              </Badge>
                            )}
                            {event.replayed && (
                              <Badge variant="secondary" className="text-xs">
                                Replayed
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                replayWebhook(event);
                              }}
                            >
                              <RefreshCw className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyPayload(event.payload);
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {selectedEvent && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Event Details</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verifySignature(selectedEvent)}
                    >
                      Verify Signature
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => replayWebhook(selectedEvent)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Replay
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Headers</h4>
                  <div className="bg-muted p-3 rounded-lg space-y-1">
                    {Object.entries(selectedEvent.headers).map(([key, value]) => (
                      <div key={key} className="text-xs font-mono flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Payload</h4>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedEvent.payload, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Webhook</CardTitle>
              <CardDescription>
                Manually send a webhook to your endpoint for testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook Payload</Label>
                <Textarea
                  rows={12}
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <Button onClick={sendTestWebhook} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Send Test Webhook
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
