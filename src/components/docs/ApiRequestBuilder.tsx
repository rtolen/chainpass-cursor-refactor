import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const endpoints = [
  { value: "/rest/v1/verification_records", label: "Create Verification Record", method: "POST" },
  { value: "/rest/v1/vai_assignments", label: "Create V.A.I. Assignment", method: "POST" },
  { value: "/rest/v1/payments", label: "Create Payment", method: "POST" },
  { value: "/rest/v1/legal_agreements", label: "Create Legal Agreement", method: "POST" },
  { value: "/functions/v1/send-to-vairify", label: "Send to Vairify", method: "POST" },
];

export const ApiRequestBuilder = () => {
  const { toast } = useToast();
  const [endpoint, setEndpoint] = useState(endpoints[0].value);
  const [apiKey, setApiKey] = useState("");
  const [requestBody, setRequestBody] = useState(`{
  "session_id": "session_123",
  "verification_status": "pending"
}`);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedEndpoint = endpoints.find((e) => e.value === endpoint);
  const baseUrl = "https://pbxpkfotysozdmdophhg.supabase.co";

  const generateCurl = () => {
    return `curl -X ${selectedEndpoint?.method} '${baseUrl}${endpoint}' \\
  -H 'apikey: YOUR_API_KEY' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '${requestBody.replace(/\n/g, " ")}'`;
  };

  const generateJavaScript = () => {
    return `const response = await fetch('${baseUrl}${endpoint}', {
  method: '${selectedEndpoint?.method}',
  headers: {
    'apikey': 'YOUR_API_KEY',
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(${requestBody})
});

const data = await response.json();
console.log(data);`;
  };

  const generatePython = () => {
    return `import requests

response = requests.${selectedEndpoint?.method.toLowerCase()}(
    '${baseUrl}${endpoint}',
    headers={
        'apikey': 'YOUR_API_KEY',
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json=${requestBody}
)

print(response.json())`;
  };

  const sendRequest = async () => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your API key to test the endpoint",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: selectedEndpoint?.method,
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResponse(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Interactive Request Builder</CardTitle>
          <CardDescription>
            Build and test API requests with your credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Select Endpoint</Label>
            <Select value={endpoint} onValueChange={setEndpoint}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {endpoints.map((ep) => (
                  <SelectItem key={ep.value} value={ep.value}>
                    <div className="flex items-center gap-2">
                      <Badge variant={ep.method === "POST" ? "default" : "secondary"}>
                        {ep.method}
                      </Badge>
                      {ep.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Request Body</Label>
            <Textarea
              rows={8}
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <Button onClick={sendRequest} disabled={loading} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            {loading ? "Sending..." : "Send Request"}
          </Button>

          {response && (
            <div className="space-y-2">
              <Label>Response</Label>
              <Textarea
                rows={12}
                value={response}
                readOnly
                className="font-mono text-sm bg-muted"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
          <CardDescription>
            Copy these examples to use in your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>
            <TabsContent value="curl" className="space-y-2">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{generateCurl()}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(generateCurl())}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="javascript" className="space-y-2">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{generateJavaScript()}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(generateJavaScript())}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="python" className="space-y-2">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{generatePython()}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(generatePython())}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
