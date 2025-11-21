import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Send, CheckCircle, XCircle, Clock, Copy, History } from "lucide-react";
import { format } from "date-fns";

interface WebhookTestingSandboxProps {
  businessPartnerId: string;
  callbackUrl: string;
}

interface TestHistory {
  id: string;
  test_payload: any;
  callback_url: string;
  response_status: number | null;
  response_body: string | null;
  response_time_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

const samplePayloads = {
  success: {
    user_id: "user_12345",
    verification_status: "completed",
    vai_code: "V.A.I.-2024-001234",
    timestamp: new Date().toISOString(),
    verification_details: {
      document_verified: true,
      biometric_match: true,
      liveness_check: true,
    },
  },
  failed: {
    user_id: "user_12345",
    verification_status: "failed",
    vai_code: null,
    timestamp: new Date().toISOString(),
    error_reason: "Document could not be verified",
    verification_details: {
      document_verified: false,
      biometric_match: false,
      liveness_check: false,
    },
  },
  pending: {
    user_id: "user_12345",
    verification_status: "pending",
    vai_code: null,
    timestamp: new Date().toISOString(),
    message: "Verification in progress",
  },
};

export default function WebhookTestingSandbox({
  businessPartnerId,
  callbackUrl,
}: WebhookTestingSandboxProps) {
  const { toast } = useToast();
  const [payload, setPayload] = useState(JSON.stringify(samplePayloads.success, null, 2));
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);

  useEffect(() => {
    loadTestHistory();
  }, [businessPartnerId]);

  const loadTestHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("webhook_test_history")
        .select("*")
        .eq("business_partner_id", businessPartnerId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data) setTestHistory(data);
    } catch (error) {
      console.error("Error loading test history:", error);
    }
  };

  const loadSamplePayload = (type: keyof typeof samplePayloads) => {
    setPayload(JSON.stringify(samplePayloads[type], null, 2));
  };

  const validatePayload = (): boolean => {
    try {
      JSON.parse(payload);
      return true;
    } catch {
      toast({
        title: "Invalid JSON",
        description: "Please check your payload format",
        variant: "destructive",
      });
      return false;
    }
  };

  const sendTestWebhook = async () => {
    if (!validatePayload()) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("test-webhook", {
        body: {
          callback_url: callbackUrl,
          test_payload: JSON.parse(payload),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setTestResult(data);
      loadTestHistory();

      if (data.success) {
        toast({
          title: "Test Successful",
          description: `Response received in ${data.response_time_ms}ms`,
        });
      } else {
        toast({
          title: "Test Failed",
          description: data.error_message || "Webhook endpoint returned an error",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : "Failed to send test webhook",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Webhook Testing Sandbox</CardTitle>
          <CardDescription>
            Test your callback URL with sample verification payloads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Callback URL</Label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1 p-2 rounded-md bg-muted font-mono text-sm">
                {callbackUrl}
              </div>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(callbackUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>Sample Payloads</Label>
            <div className="flex gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadSamplePayload("success")}
              >
                Success
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadSamplePayload("failed")}
              >
                Failed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadSamplePayload("pending")}
              >
                Pending
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="payload">Test Payload (JSON)</Label>
            <Textarea
              id="payload"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="font-mono text-sm min-h-[300px] mt-1"
              placeholder="Enter JSON payload..."
            />
          </div>

          <Button onClick={sendTestWebhook} disabled={isTesting} className="w-full">
            {isTesting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test Webhook
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Test Successful
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Test Failed
                </>
              )}
            </CardTitle>
            <CardDescription>
              Response received in {testResult.response_time_ms}ms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="response">
              <TabsList>
                <TabsTrigger value="response">Response</TabsTrigger>
                <TabsTrigger value="request">Request</TabsTrigger>
              </TabsList>

              <TabsContent value="response" className="space-y-4">
                <div>
                  <Label>Status Code</Label>
                  <div className="mt-1">
                    <Badge
                      variant={testResult.success ? "default" : "destructive"}
                    >
                      {testResult.response_status || "N/A"}
                    </Badge>
                  </div>
                </div>

                {testResult.error_message && (
                  <div>
                    <Label>Error</Label>
                    <div className="p-3 mt-1 rounded-md bg-destructive/10 text-destructive text-sm">
                      {testResult.error_message}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Response Body</Label>
                  <ScrollArea className="h-[200px] mt-1">
                    <pre className="p-3 rounded-md bg-muted text-sm">
                      {testResult.response_body || "No response body"}
                    </pre>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="request" className="space-y-4">
                <div>
                  <Label>Request URL</Label>
                  <div className="p-3 mt-1 rounded-md bg-muted font-mono text-sm break-all">
                    {callbackUrl}
                  </div>
                </div>

                <div>
                  <Label>Request Body</Label>
                  <ScrollArea className="h-[200px] mt-1">
                    <pre className="p-3 rounded-md bg-muted text-sm">
                      {payload}
                    </pre>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Test History
          </CardTitle>
          <CardDescription>Recent webhook tests (last 20)</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {testHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No test history yet. Send your first test webhook above.
                </div>
              ) : (
                testHistory.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {test.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {test.test_payload?.verification_status || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(test.created_at), "PPp")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={test.success ? "default" : "destructive"}
                      >
                        {test.response_status || "Error"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {test.response_time_ms}ms
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
