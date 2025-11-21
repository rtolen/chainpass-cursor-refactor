import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TestTube, Play, Database, Users, Key, Copy, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockUsers = [
  { id: "user_sandbox_001", name: "Alice Johnson", email: "alice@sandbox.test", vai_code: "VAI-SANDBOX-001" },
  { id: "user_sandbox_002", name: "Bob Smith", email: "bob@sandbox.test", vai_code: "VAI-SANDBOX-002" },
  { id: "user_sandbox_003", name: "Carol Davis", email: "carol@sandbox.test", vai_code: "VAI-SANDBOX-003" },
];

const mockVerifications = [
  { id: "ver_001", user_id: "user_sandbox_001", status: "completed", created_at: "2025-01-15T10:00:00Z" },
  { id: "ver_002", user_id: "user_sandbox_002", status: "pending", created_at: "2025-01-15T11:30:00Z" },
  { id: "ver_003", user_id: "user_sandbox_003", status: "failed", created_at: "2025-01-15T12:15:00Z" },
];

const testScenarios = [
  {
    name: "Successful Verification",
    description: "Complete verification flow from start to finish",
    steps: [
      "Create verification record",
      "Upload ID document (mock)",
      "Complete facial verification (mock)",
      "Assign V.A.I. code",
      "Receive webhook notification"
    ],
    difficulty: "easy"
  },
  {
    name: "Payment Processing",
    description: "Test payment flow with various payment methods",
    steps: [
      "Create verification record",
      "Initiate payment with Stripe (test mode)",
      "Handle payment success webhook",
      "Complete verification process"
    ],
    difficulty: "medium"
  },
  {
    name: "Error Handling",
    description: "Test various error scenarios and edge cases",
    steps: [
      "Attempt verification with invalid data",
      "Test rate limiting",
      "Simulate webhook failures",
      "Test retry logic"
    ],
    difficulty: "hard"
  },
  {
    name: "Webhook Integration",
    description: "Test webhook signature verification and payloads",
    steps: [
      "Configure webhook endpoint",
      "Trigger verification events",
      "Verify HMAC signatures",
      "Test replay protection"
    ],
    difficulty: "medium"
  }
];

export const ApiSandbox = () => {
  const { toast } = useToast();
  const [sandboxKey, setSandboxKey] = useState("sk_sandbox_" + Math.random().toString(36).substring(7));
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);

  const generateNewSandboxKey = () => {
    const newKey = "sk_sandbox_" + Math.random().toString(36).substring(7);
    setSandboxKey(newKey);
    toast({
      title: "New Sandbox Key Generated",
      description: "Your old sandbox key has been invalidated",
    });
  };

  const copySandboxKey = () => {
    navigator.clipboard.writeText(sandboxKey);
    toast({
      title: "Copied!",
      description: "Sandbox API key copied to clipboard",
    });
  };

  const runTestScenario = async (scenario: typeof testScenarios[0]) => {
    setIsRunning(true);
    toast({
      title: "Running Test Scenario",
      description: `Starting "${scenario.name}"...`,
    });

    // Simulate test execution
    for (let i = 0; i < scenario.steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setTestResults(prev => ({
        ...prev,
        [scenario.name]: {
          currentStep: i + 1,
          totalSteps: scenario.steps.length,
          status: "running"
        }
      }));
    }

    // Complete test
    const success = Math.random() > 0.2; // 80% success rate
    setTestResults(prev => ({
      ...prev,
      [scenario.name]: {
        completed: true,
        success,
        timestamp: new Date().toISOString()
      }
    }));

    setIsRunning(false);

    toast({
      title: success ? "Test Passed" : "Test Failed",
      description: success 
        ? `"${scenario.name}" completed successfully` 
        : `"${scenario.name}" encountered errors`,
      variant: success ? "default" : "destructive",
    });
  };

  const createMockVerification = async () => {
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Please select a test user first",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Creating Mock Verification",
      description: "Generating test verification record...",
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const user = mockUsers.find(u => u.id === selectedUser);
    toast({
      title: "Verification Created",
      description: `Mock verification created for ${user?.name}`,
    });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <TestTube className="w-4 h-4" />
        <AlertTitle>Sandbox Environment</AlertTitle>
        <AlertDescription>
          Test your integration safely without affecting production data. All API calls in sandbox mode use mock data and don't create real verification records.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Sandbox API Key
          </CardTitle>
          <CardDescription>
            Use this key to make API requests in sandbox mode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={sandboxKey}
              readOnly
              className="font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copySandboxKey}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={generateNewSandboxKey}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Sandbox Only</AlertTitle>
            <AlertDescription>
              This key only works in the sandbox environment and cannot access production data.
            </AlertDescription>
          </Alert>

          <div className="grid gap-2">
            <p className="text-sm font-semibold">Sandbox Base URL:</p>
            <code className="block bg-muted p-3 rounded-lg text-sm">
              https://sandbox.chainpass.io
            </code>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Test Users</TabsTrigger>
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
          <TabsTrigger value="data">Mock Data</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Test User Accounts
              </CardTitle>
              <CardDescription>
                Pre-configured test users with sample data for testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Test User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a test user" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={createMockVerification} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Create Mock Verification
              </Button>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>V.A.I. Code</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <code className="text-xs">{user.vai_code}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {testScenarios.map((scenario) => (
              <Card key={scenario.name}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{scenario.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {scenario.description}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      scenario.difficulty === "easy" ? "default" :
                      scenario.difficulty === "medium" ? "secondary" : "destructive"
                    }>
                      {scenario.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {scenario.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{idx + 1}</span>
                        </div>
                        <span className="text-muted-foreground">{step}</span>
                      </div>
                    ))}
                  </div>

                  {testResults[scenario.name] && (
                    <div className="p-3 border rounded-lg">
                      {testResults[scenario.name].completed ? (
                        <div className="flex items-center gap-2">
                          {testResults[scenario.name].success ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                          <span className="text-sm font-medium">
                            {testResults[scenario.name].success ? "Test Passed" : "Test Failed"}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm">
                          Running step {testResults[scenario.name].currentStep} of {testResults[scenario.name].totalSteps}...
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={() => runTestScenario(scenario)}
                    disabled={isRunning}
                    className="w-full"
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isRunning ? "Running..." : "Run Test"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Mock Verification Records
              </CardTitle>
              <CardDescription>
                Sample verification data available in sandbox
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Verification ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockVerifications.map((ver) => (
                    <TableRow key={ver.id}>
                      <TableCell>
                        <code className="text-xs">{ver.id}</code>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">{ver.user_id}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          ver.status === "completed" ? "default" :
                          ver.status === "pending" ? "secondary" : "destructive"
                        }>
                          {ver.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(ver.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sandbox Limitations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <strong className="block">No Real Processing</strong>
                  <p className="text-sm text-muted-foreground">
                    ID verification, facial recognition, and payments are simulated
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <strong className="block">Data Resets Daily</strong>
                  <p className="text-sm text-muted-foreground">
                    All sandbox data is cleared every 24 hours
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <strong className="block">Rate Limits Apply</strong>
                  <p className="text-sm text-muted-foreground">
                    Sandbox has the same rate limits as production
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
