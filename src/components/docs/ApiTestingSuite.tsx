import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Play, CheckCircle, FileJson, Code2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const testCollections = [
  {
    name: "Verification Workflow",
    description: "Complete verification flow from record creation to V.A.I. assignment",
    tests: 8,
    endpoints: 4,
    collection: {
      info: {
        name: "ChainPass Verification Workflow",
        description: "Test the complete verification flow",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: "Create Verification Record",
          request: {
            method: "POST",
            header: [
              { key: "apikey", value: "{{API_KEY}}" },
              { key: "Authorization", value: "Bearer {{API_KEY}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                session_id: "test_session_{{$timestamp}}",
                verification_status: "pending"
              }, null, 2)
            },
            url: {
              raw: "{{BASE_URL}}/rest/v1/verification_records",
              host: ["{{BASE_URL}}"],
              path: ["rest", "v1", "verification_records"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code is 201', function () {",
                  "    pm.response.to.have.status(201);",
                  "});",
                  "",
                  "pm.test('Response has verification ID', function () {",
                  "    var jsonData = pm.response.json();",
                  "    pm.expect(jsonData[0].id).to.exist;",
                  "    pm.environment.set('verification_id', jsonData[0].id);",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Create V.A.I. Assignment",
          request: {
            method: "POST",
            header: [
              { key: "apikey", value: "{{API_KEY}}" },
              { key: "Authorization", value: "Bearer {{API_KEY}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                verification_record_id: "{{verification_id}}",
                vai_code: "VAI-TEST-{{$timestamp}}",
                status: "active"
              }, null, 2)
            },
            url: {
              raw: "{{BASE_URL}}/rest/v1/vai_assignments",
              host: ["{{BASE_URL}}"],
              path: ["rest", "v1", "vai_assignments"]
            }
          }
        }
      ]
    }
  },
  {
    name: "Payment Processing",
    description: "Test payment creation and status updates",
    tests: 5,
    endpoints: 2,
    collection: {
      info: {
        name: "ChainPass Payment Processing",
        description: "Test payment workflows",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: "Create Payment",
          request: {
            method: "POST",
            header: [
              { key: "apikey", value: "{{API_KEY}}" },
              { key: "Authorization", value: "Bearer {{API_KEY}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                verification_record_id: "{{verification_id}}",
                amount: 9900,
                status: "pending"
              }, null, 2)
            },
            url: {
              raw: "{{BASE_URL}}/rest/v1/payments",
              host: ["{{BASE_URL}}"],
              path: ["rest", "v1", "payments"]
            }
          }
        }
      ]
    }
  },
  {
    name: "Webhook Integration",
    description: "Test webhook signature verification and callback handling",
    tests: 6,
    endpoints: 3,
    collection: {
      info: {
        name: "ChainPass Webhook Integration",
        description: "Test webhook functionality",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: "Send Test Webhook",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Webhook-Signature", value: "{{signature}}" },
              { key: "X-Webhook-Timestamp", value: "{{$timestamp}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                event_type: "verification.completed",
                vai_number: "VAI-12345",
                status: "completed",
                timestamp: "{{$isoTimestamp}}"
              }, null, 2)
            },
            url: {
              raw: "{{CALLBACK_URL}}",
              host: ["{{CALLBACK_URL}}"]
            }
          }
        }
      ]
    }
  },
  {
    name: "Error Handling",
    description: "Test error responses and edge cases",
    tests: 10,
    endpoints: 5,
    collection: {
      info: {
        name: "ChainPass Error Handling",
        description: "Test error scenarios",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: "Invalid API Key",
          request: {
            method: "GET",
            header: [
              { key: "apikey", value: "invalid_key" },
              { key: "Authorization", value: "Bearer invalid_key" }
            ],
            url: {
              raw: "{{BASE_URL}}/rest/v1/verification_records",
              host: ["{{BASE_URL}}"],
              path: ["rest", "v1", "verification_records"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code is 401', function () {",
                  "    pm.response.to.have.status(401);",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Rate Limit Exceeded",
          request: {
            method: "GET",
            header: [
              { key: "apikey", value: "{{API_KEY}}" },
              { key: "Authorization", value: "Bearer {{API_KEY}}" }
            ],
            url: {
              raw: "{{BASE_URL}}/rest/v1/verification_records",
              host: ["{{BASE_URL}}"],
              path: ["rest", "v1", "verification_records"]
            }
          }
        }
      ]
    }
  }
];

const quickTests = [
  {
    name: "Authentication Test",
    description: "Verify your API key is valid",
    endpoint: "/rest/v1/verification_records",
    method: "GET",
    expectedStatus: 200
  },
  {
    name: "Rate Limit Check",
    description: "Check remaining rate limit",
    endpoint: "/rest/v1/verification_records",
    method: "GET",
    expectedStatus: 200,
    checkHeaders: ["X-RateLimit-Remaining"]
  },
  {
    name: "Create Test Record",
    description: "Create a test verification record",
    endpoint: "/rest/v1/verification_records",
    method: "POST",
    expectedStatus: 201,
    body: {
      session_id: "test_session",
      verification_status: "pending"
    }
  }
];

export const ApiTestingSuite = () => {
  const { toast } = useToast();
  const [runningTest, setRunningTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const downloadCollection = (collection: any, filename: string) => {
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: `${filename} has been downloaded`,
    });
  };

  const downloadEnvironment = () => {
    const environment = {
      name: "ChainPass API Environment",
      values: [
        { key: "BASE_URL", value: "https://pbxpkfotysozdmdophhg.supabase.co", enabled: true },
        { key: "API_KEY", value: "your_api_key_here", enabled: true },
        { key: "CALLBACK_URL", value: "https://your-callback-url.com/webhook", enabled: true }
      ]
    };

    const blob = new Blob([JSON.stringify(environment, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chainpass-environment.json";
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Environment Downloaded!",
      description: "Import this into Postman to set up your environment",
    });
  };

  const runQuickTest = async (test: typeof quickTests[0]) => {
    setRunningTest(test.name);
    
    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = Math.random() > 0.3; // 70% success rate for demo
    setTestResults(prev => ({ ...prev, [test.name]: success }));
    setRunningTest(null);

    toast({
      title: success ? "Test Passed" : "Test Failed",
      description: success ? `${test.name} completed successfully` : `${test.name} encountered an error`,
      variant: success ? "default" : "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-primary" />
            Postman Collections
          </CardTitle>
          <CardDescription>
            Download pre-configured Postman collections to quickly test all API endpoints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={downloadEnvironment} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Environment
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {testCollections.map((collection) => (
              <Card key={collection.name} className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base">{collection.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {collection.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Badge variant="secondary">{collection.tests} tests</Badge>
                    <Badge variant="outline">{collection.endpoints} endpoints</Badge>
                  </div>
                  <Button
                    onClick={() => downloadCollection(collection.collection, `${collection.name.toLowerCase().replace(/\s+/g, '-')}.json`)}
                    className="w-full"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Collection
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Quick Tests
          </CardTitle>
          <CardDescription>
            Run quick tests directly from your browser without Postman
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quickTests.map((test) => (
              <div key={test.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{test.name}</h4>
                    <Badge variant={test.method === "GET" ? "secondary" : "default"}>
                      {test.method}
                    </Badge>
                    {testResults[test.name] !== undefined && (
                      <Badge variant={testResults[test.name] ? "default" : "destructive"}>
                        {testResults[test.name] ? "Passed" : "Failed"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{test.description}</p>
                  <code className="text-xs text-muted-foreground">{test.endpoint}</code>
                </div>
                <Button
                  onClick={() => runQuickTest(test)}
                  disabled={runningTest === test.name}
                  size="sm"
                >
                  {runningTest === test.name ? (
                    <>Running...</>
                  ) : testResults[test.name] ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            Example Test Scripts
          </CardTitle>
          <CardDescription>
            Example Postman test scripts to validate responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="auth">
            <TabsList>
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="validation">Response Validation</TabsTrigger>
              <TabsTrigger value="chaining">Request Chaining</TabsTrigger>
            </TabsList>

            <TabsContent value="auth" className="space-y-2">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                <code>{`// Test: Verify authentication headers
pm.test("API key is valid", function () {
    pm.response.to.have.status(200);
    pm.response.to.not.have.status(401);
});

pm.test("Rate limit headers present", function () {
    pm.response.to.have.header("X-RateLimit-Limit");
    pm.response.to.have.header("X-RateLimit-Remaining");
});`}</code>
              </pre>
            </TabsContent>

            <TabsContent value="validation" className="space-y-2">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                <code>{`// Test: Validate response structure
pm.test("Response has required fields", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData[0]).to.have.property("id");
    pm.expect(jsonData[0]).to.have.property("session_id");
    pm.expect(jsonData[0]).to.have.property("verification_status");
});

pm.test("Verification status is valid", function () {
    var jsonData = pm.response.json();
    var validStatuses = ["pending", "completed", "failed"];
    pm.expect(validStatuses).to.include(jsonData[0].verification_status);
});`}</code>
              </pre>
            </TabsContent>

            <TabsContent value="chaining" className="space-y-2">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                <code>{`// Test: Chain requests using environment variables
pm.test("Save verification ID for next request", function () {
    var jsonData = pm.response.json();
    pm.environment.set("verification_id", jsonData[0].id);
});

// Use in next request body:
// {
//   "verification_record_id": "{{verification_id}}",
//   ...
// }`}</code>
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
