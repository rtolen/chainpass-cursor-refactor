import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WebhookSignatureGuide from "@/components/partner/WebhookSignatureGuide";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Key, RefreshCw, Copy, Check, Activity, BookOpen, Beaker } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ApiUsageMonitor from "@/components/admin/ApiUsageMonitor";
import WebhookTestingSandbox from "@/components/admin/WebhookTestingSandbox";
import WebhookQueueDashboard from "@/components/admin/WebhookQueueDashboard";
import { format } from "date-fns";

interface BusinessPartner {
  id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  api_key: string;
  callback_url: string;
  return_url: string;
  status: string;
  created_at: string;
  approved_at: string;
}

interface UsageStats {
  total_requests: number;
  requests_today: number;
  avg_response_time: number;
  success_rate: number;
}

export default function BusinessPartnerPortal() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  
  const [partner, setPartner] = useState<BusinessPartner | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats>({
    total_requests: 0,
    requests_today: 0,
    avg_response_time: 0,
    success_rate: 0,
  });
  const [isLoadingPartner, setIsLoadingPartner] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isUpdatingUrls, setIsUpdatingUrls] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  
  const [callbackUrl, setCallbackUrl] = useState("");
  const [returnUrl, setReturnUrl] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadPartnerData();
      loadUsageStats();
    }
  }, [user]);

  const loadPartnerData = async () => {
    try {
      const { data, error } = await supabase
        .from("business_partners")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "approved")
        .single();

      if (error) throw error;

      setPartner(data);
      setCallbackUrl(data.callback_url);
      setReturnUrl(data.return_url);
    } catch (error) {
      console.error("Error loading partner data:", error);
      toast({
        title: "Error",
        description: "Failed to load partner information",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPartner(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const { data: partnerData } = await supabase
        .from("business_partners")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!partnerData) return;

      // Get all-time usage
      const { count: totalCount } = await supabase
        .from("api_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("business_partner_id", partnerData.id);

      // Get today's usage
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from("api_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("business_partner_id", partnerData.id)
        .gte("created_at", today.toISOString());

      // Get average response time and success rate
      const { data: statsData } = await supabase
        .from("api_usage_logs")
        .select("response_time_ms, status_code")
        .eq("business_partner_id", partnerData.id);

      let avgResponseTime = 0;
      let successCount = 0;

      if (statsData && statsData.length > 0) {
        const totalResponseTime = statsData.reduce((sum, log) => sum + (log.response_time_ms || 0), 0);
        avgResponseTime = Math.round(totalResponseTime / statsData.length);
        successCount = statsData.filter((log) => log.status_code >= 200 && log.status_code < 300).length;
      }

      setUsageStats({
        total_requests: totalCount || 0,
        requests_today: todayCount || 0,
        avg_response_time: avgResponseTime,
        success_rate: statsData && statsData.length > 0 ? Math.round((successCount / statsData.length) * 100) : 0,
      });
    } catch (error) {
      console.error("Error loading usage stats:", error);
    }
  };

  const handleRegenerateApiKey = async () => {
    setIsRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("regenerate-api-key", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "API key regenerated successfully",
      });

      loadPartnerData();
    } catch (error) {
      console.error("Error regenerating API key:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate API key",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleUpdateUrls = async () => {
    setIsUpdatingUrls(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("update-partner-urls", {
        body: {
          callback_url: callbackUrl,
          return_url: returnUrl,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "URLs updated successfully",
      });

      loadPartnerData();
    } catch (error) {
      console.error("Error updating URLs:", error);
      toast({
        title: "Error",
        description: "Failed to update URLs",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingUrls(false);
    }
  };

  const copyApiKey = () => {
    if (partner?.api_key) {
      navigator.clipboard.writeText(partner.api_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast({
        title: "Copied",
        description: "API key copied to clipboard",
      });
    }
  };

  const downloadDocumentation = () => {
    const doc = `
ChainPass V.A.I. Integration Documentation
=========================================

Business: ${partner?.business_name}
API Key: ${partner?.api_key}

Integration Steps:
-----------------

1. Redirect users to ChainPass for verification:
   URL: https://yourapp.com?business_id=${partner?.id}&user_id=USER_ID

2. We'll send verification results to your callback URL:
   ${partner?.callback_url}
   
   POST request body:
   {
     "user_id": "USER_ID",
     "verification_status": "completed|failed",
     "vai_code": "V.A.I.-XXXXXX",
     "timestamp": "ISO8601_timestamp"
   }

3. Users will be redirected back to:
   ${partner?.return_url}

Security:
--------
- Keep your API key secure
- Never expose it in client-side code
- Use HTTPS for all webhook endpoints
- Verify webhook signatures (coming soon)

Support:
-------
For questions or issues, contact: support@chainpass.com
    `.trim();

    const blob = new Blob([doc], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chainpass-integration-guide.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading || isLoadingPartner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No Partner Account</CardTitle>
            <CardDescription>
              You don't have an approved business partner account yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/business-partner-registration")}>
              Apply Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{partner.business_name}</h1>
            <p className="text-muted-foreground">Business Partner Portal</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/sandbox")}>
              <Beaker className="h-4 w-4 mr-2" />
              Try Sandbox
            </Button>
            <Button variant="outline" onClick={() => navigate("/api-docs")}>
              <BookOpen className="h-4 w-4 mr-2" />
              API Docs
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="monitoring">
              <Activity className="h-4 w-4 mr-2" />
              Real-time Monitoring
            </TabsTrigger>
            <TabsTrigger value="webhook-testing">Webhook Testing</TabsTrigger>
            <TabsTrigger value="webhook-queue">Webhook Queue</TabsTrigger>
            <TabsTrigger value="webhook-security">Webhook Security</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* API Usage Stats */}
            <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats.total_requests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats.requests_today}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats.avg_response_time}ms</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats.success_rate}%</div>
            </CardContent>
          </Card>
        </div>

            {/* API Key Management */}
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Credentials
            </CardTitle>
            <CardDescription>
              Your API key for integrating ChainPass verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Keep your API key secure. Never expose it in client-side code or public repositories.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={() => navigate("/api-docs")}
              className="w-full"
              variant="outline"
              size="lg"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              View Complete API Documentation
            </Button>
            
            <div className="flex gap-2">
              <Input
                value={partner.api_key}
                readOnly
                type="password"
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyApiKey}
              >
                {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={handleRegenerateApiKey}
                disabled={isRegenerating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
            </div>
          </CardContent>
        </Card>

            {/* URL Configuration */}
            <Card>
          <CardHeader>
            <CardTitle>Integration URLs</CardTitle>
            <CardDescription>
              Configure your callback and return URLs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="callback-url">Callback URL</Label>
              <Input
                id="callback-url"
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
                placeholder="https://your-app.com/api/vairify-callback"
              />
              <p className="text-sm text-muted-foreground">
                We'll POST verification results to this URL
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-url">Return URL</Label>
              <Input
                id="return-url"
                value={returnUrl}
                onChange={(e) => setReturnUrl(e.target.value)}
                placeholder="https://your-app.com/verification-complete"
              />
              <p className="text-sm text-muted-foreground">
                Users will be redirected here after verification
              </p>
            </div>
            <Button
              onClick={handleUpdateUrls}
              disabled={isUpdatingUrls}
            >
              Update URLs
            </Button>
          </CardContent>
        </Card>

            {/* Documentation */}
            <Card>
          <CardHeader>
            <CardTitle>Integration Documentation</CardTitle>
            <CardDescription>
              Download the complete integration guide
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadDocumentation} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Integration Guide
            </Button>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="monitoring">
            <ApiUsageMonitor businessPartnerId={partner.id} />
          </TabsContent>

          <TabsContent value="webhook-testing">
            <WebhookTestingSandbox 
              businessPartnerId={partner.id}
              callbackUrl={partner.callback_url}
            />
          </TabsContent>

          <TabsContent value="webhook-queue">
            <WebhookQueueDashboard />
          </TabsContent>

          <TabsContent value="webhook-security">
            <WebhookSignatureGuide />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your business partner account settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Business Name</Label>
                    <Input value={partner.business_name} disabled />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input value={partner.contact_email} disabled />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                      <Badge className="bg-green-500 text-white">{partner.status}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Approved At</Label>
                    <Input value={format(new Date(partner.approved_at), "PPP")} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
