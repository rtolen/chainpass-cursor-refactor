import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Send, Clock, CheckCircle, XCircle, History, Code } from "lucide-react";
import { format } from "date-fns";

interface WebhookTestingSandboxProps {
  businessPartnerId: string;
  callbackUrl: string;
}

interface TestResult {
  success: boolean;
  response_status: number;
  response_body: string;
  response_time_ms: number;
  error_message: string | null;
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

const SAMPLE_PAYLOADS = {
  success: {
    user_id: "user_123456",
    verification_status: "completed",
    vai_code: "V.A.I.-789012",
    timestamp: new Date().toISOString(),
    verification_details: {
      identity_verified: true,
      biometric_match: true,
      document_valid: true,
    },
  },
  failed: {
    user_id: "user_123456",
    verification_status: "failed",
    vai_code: null,
    timestamp: new Date().toISOString(),
    verification_details: {
      identity_verified: false,
      biometric_match: false,
      document_valid: false,
    },
    failure_reason: "Document could not be verified",
  },
  pending: {
    user_id: "user_123456",
    verification_status: "pending",
    vai_code: null,
    timestamp: new Date().toISOString(),
    verification_details: {
      identity_verified: false,
      biometric_match: false,
      document_valid: false,
    },
  },
};

export default function WebhookTestingSandbox({ businessPartnerId, callbackUrl }: WebhookTestingSandboxProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("success");
  const [payload, setPayload] = useState(JSON.stringify(SAMPLE_PAYLOADS.success, null, 2));
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);

  useEffect(() => {
    loadTestHistory();
  }, [businessPartnerId]);

  useEffect(() => {
    // Update payload when template changes
    const templatePayload = SAMPLE_PAYLOADS[selectedTemplate as keyof typeof SAMPLE_PAYLOADS];
    setPayload(JSON.stringify(templatePayload, null, 2));
  }, [selectedTemplate]);

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

  const handleTestWebhook = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Validate JSON
      const parsedPayload = JSON.parse(payload);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("test-webhook", {
        body: {
          payload: parsedPayload,
          callback_url: callbackUrl,
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
          title: "Webhook Test Successful",
          description: `Response received in ${data.response_time_ms}ms with status ${data.response_status}`,
        });
      } else {
        toast({
          title: "Webhook Test Failed",
          description: data.error_message || `Server returned status ${data.response_status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing webhook:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send test webhook";
      toast({
        title: "Test Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const loadHistoryPayload = (history: TestHistory) => {
    setPayload(JSON.stringify(history.test_payload, null, 2));
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="test" className="w-full">
        <TabsList>
          <TabsTrigger value="test">Test Webhook</TabsTrigger>
          <TabsTrigger value="history">Test History</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-6">
          {/* Payload Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Test Payload
              </CardTitle>
              <CardDescription>
                Choose a template or customize the JSON payload to test your webhook endpoint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template">Payload Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="success">Successful Verification</SelectItem>
                    <SelectItem value="failed">Failed Verification</SelectItem>
                    <SelectItem value="pending">Pending Verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payload">JSON Payload</Label>
                <Textarea
                  id="payload"
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  className="font-mono text-sm min-h-[300px]"
                  placeholder="Enter JSON payload..."
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Target: <span className="font-mono">{callbackUrl}</span>
                </div>
                <Button onClick={handleTestWebhook} disabled={isTesting}>
                  <Send className="h-4 w-4 mr-2" />
                  {isTesting ? "Sending..." : "Send Test Webhook"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Result */}
          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  Test Result
                </CardTitle>
                <CardDescription>
                  Response received in {testResult.response_time_ms}ms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status Code</Label>
                    <div className="mt-1">
                      <Badge variant={testResult.success ? "default" : "destructive"}>
                        {testResult.response_status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Response Time</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{testResult.response_time_ms}ms</span>
                    </div>
                  </div>
                </div>

                {testResult.error_message && (
                  <div>
                    <Label>Error Message</Label>
                    <div className="mt-1 p-3 bg-destructive/10 rounded-md">
                      <p className="text-sm text-destructive">{testResult.error_message}</p>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Response Body</Label>
                  <Textarea
                    value={testResult.response_body || "No response body"}
                    readOnly
                    className="font-mono text-sm mt-1"
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Test History
              </CardTitle>
              <CardDescription>
                Recent webhook tests (last 20)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {testHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No test history yet. Send your first test webhook to see results here.
                    </div>
                  ) : (
                    testHistory.map((history) => (
                      <div
                        key={history.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {history.success ? (
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant={history.success ? "default" : "destructive"}>
                                {history.response_status || "Error"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {history.response_time_ms}ms
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {format(new Date(history.created_at), "PPpp")}
                            </div>
                            {history.error_message && (
                              <div className="text-xs text-destructive mt-1">
                                {history.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadHistoryPayload(history)}
                        >
                          Load Payload
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
