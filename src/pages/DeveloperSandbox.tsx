import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Beaker, 
  Users, 
  Play, 
  Code, 
  Webhook, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Copy,
  Download,
  Book,
  Save,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MockUserGenerator } from "@/components/sandbox/MockUserGenerator";
import { VerificationFlowSimulator } from "@/components/sandbox/VerificationFlowSimulator";
import { WebhookPayloadViewer } from "@/components/sandbox/WebhookPayloadViewer";
import { ApiResponseViewer } from "@/components/sandbox/ApiResponseViewer";
import { SandboxTestHistory } from "@/components/sandbox/SandboxTestHistory";
import { CodePlayground } from "@/components/sandbox/CodePlayground";
import { WebhookReplayViewer } from "@/components/sandbox/WebhookReplayViewer";
import { SavedScenariosManager } from "@/components/sandbox/SavedScenariosManager";

export default function DeveloperSandbox() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTest, setActiveTest] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Beaker className="w-8 h-8 text-primary" />
                Developer Sandbox
              </h1>
              <p className="text-muted-foreground mt-2">
                Test VAI verification flows with mock data in a safe environment
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/api-docs")}>
                <Book className="w-4 h-4 mr-2" />
                API Docs
              </Button>
              <Button variant="outline" onClick={() => navigate("/partner-portal")}>
                Partner Portal
              </Button>
              <Badge variant="outline" className="text-lg px-4 py-2">
                <AlertCircle className="w-4 h-4 mr-2" />
                Test Environment
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Alert className="mb-6">
          <CheckCircle className="w-4 h-4" />
          <AlertTitle>Safe Testing Environment</AlertTitle>
          <AlertDescription>
            All operations in this sandbox use mock data and will not affect your production environment. 
            No actual verifications, payments, or V.A.I. codes will be created.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="simulator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="simulator" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Flow
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="playground" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Code
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="replay" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Replay
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Scenarios
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              API
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Verification Flow Simulator */}
          <TabsContent value="simulator">
            <Card>
              <CardHeader>
                <CardTitle>Verification Flow Simulator</CardTitle>
                <CardDescription>
                  Simulate the complete VAI verification process step by step
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VerificationFlowSimulator onTestStart={setActiveTest} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mock Users */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Mock User Generator</CardTitle>
                <CardDescription>
                  Generate realistic test users with different scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MockUserGenerator />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Code Playground */}
          <TabsContent value="playground">
            <CodePlayground />
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Payload Viewer</CardTitle>
                <CardDescription>
                  Preview webhook payloads for different event types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WebhookPayloadViewer />
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Response */}
          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>API Response Viewer</CardTitle>
                <CardDescription>
                  View mock API responses for all endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApiResponseViewer />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhook Replay */}
          <TabsContent value="replay">
            <WebhookReplayViewer />
          </TabsContent>

          {/* Saved Scenarios */}
          <TabsContent value="scenarios">
            <Card>
              <CardHeader>
                <CardTitle>Saved Test Scenarios</CardTitle>
                <CardDescription>
                  Save and load test scenarios to speed up your development
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SavedScenariosManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test History */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Test History</CardTitle>
                <CardDescription>
                  Review your past sandbox test runs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SandboxTestHistory activeTest={activeTest} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto flex-col gap-2 py-4">
                <Copy className="w-5 h-5" />
                <span>Copy SDK Code</span>
                <span className="text-xs text-muted-foreground">
                  Get integration code snippets
                </span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4">
                <Download className="w-5 h-5" />
                <span>Export Test Data</span>
                <span className="text-xs text-muted-foreground">
                  Download test results as JSON
                </span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4">
                <RefreshCw className="w-5 h-5" />
                <span>Reset Sandbox</span>
                <span className="text-xs text-muted-foreground">
                  Clear all test data
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
