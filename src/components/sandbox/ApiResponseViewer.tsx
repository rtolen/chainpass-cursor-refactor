import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const apiEndpoints = [
  {
    method: 'POST',
    path: '/rest/v1/verification_records',
    name: 'Create Verification',
    request: {
      session_id: 'sess_sandbox_123',
      verification_status: 'pending',
      biometric_confirmed: false,
    },
    response: {
      id: 'ver_sandbox_123',
      session_id: 'sess_sandbox_123',
      verification_status: 'pending',
      biometric_confirmed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    status: 201,
  },
  {
    method: 'GET',
    path: '/rest/v1/verification_records?session_id=eq.sess_sandbox_123',
    name: 'Get Verification',
    response: [{
      id: 'ver_sandbox_123',
      session_id: 'sess_sandbox_123',
      verification_status: 'completed',
      biometric_confirmed: true,
      id_document_url: 'https://storage.example.com/docs/sandbox_id.jpg',
      selfie_url: 'https://storage.example.com/selfies/sandbox_selfie.jpg',
      complycube_verification_id: 'cc_sandbox_verify_123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
    status: 200,
  },
  {
    method: 'POST',
    path: '/rest/v1/vai_assignments',
    name: 'Create V.A.I.',
    request: {
      verification_record_id: 'ver_sandbox_123',
      vai_code: 'VAI-SAND-BOX1-2345',
      status: 'active',
    },
    response: {
      id: 'vai_sandbox_001',
      verification_record_id: 'ver_sandbox_123',
      vai_code: 'VAI-SAND-BOX1-2345',
      status: 'active',
      created_at: new Date().toISOString(),
    },
    status: 201,
  },
  {
    method: 'GET',
    path: '/rest/v1/vai_assignments?vai_code=eq.VAI-SAND-BOX1-2345',
    name: 'Get V.A.I.',
    response: [{
      id: 'vai_sandbox_001',
      verification_record_id: 'ver_sandbox_123',
      vai_code: 'VAI-SAND-BOX1-2345',
      status: 'active',
      created_at: new Date().toISOString(),
    }],
    status: 200,
  },
  {
    method: 'POST',
    path: '/rest/v1/payments',
    name: 'Create Payment',
    request: {
      verification_record_id: 'ver_sandbox_123',
      amount: 2999,
      status: 'succeeded',
      stripe_payment_intent_id: 'pi_sandbox_123',
    },
    response: {
      id: 'pay_sandbox_123',
      verification_record_id: 'ver_sandbox_123',
      amount: 2999,
      status: 'succeeded',
      stripe_payment_intent_id: 'pi_sandbox_123',
      created_at: new Date().toISOString(),
    },
    status: 201,
  },
  {
    method: 'POST',
    path: '/functions/v1/send-to-vairify',
    name: 'Send to Vairify',
    request: {
      vai_code: 'VAI-SAND-BOX1-2345',
      verification_record_id: 'ver_sandbox_123',
    },
    response: {
      success: true,
      message: 'V.A.I. successfully transmitted to Vairify',
      vai_code: 'VAI-SAND-BOX1-2345',
    },
    status: 200,
  },
];

export const ApiResponseViewer = () => {
  const { toast } = useToast();
  const [selectedEndpoint, setSelectedEndpoint] = useState(apiEndpoints[0]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Content copied successfully",
    });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'POST': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'PATCH': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'DELETE': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Endpoint Selection */}
      <div className="space-y-2">
        <Label>API Endpoint</Label>
        <Select 
          value={selectedEndpoint.path} 
          onValueChange={(value) => {
            const endpoint = apiEndpoints.find(e => e.path === value);
            if (endpoint) setSelectedEndpoint(endpoint);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {apiEndpoints.map((endpoint) => (
              <SelectItem key={endpoint.path} value={endpoint.path}>
                <div className="flex items-center gap-2">
                  <Badge className={getMethodColor(endpoint.method)}>
                    {endpoint.method}
                  </Badge>
                  <span>{endpoint.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Endpoint Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={getMethodColor(selectedEndpoint.method)}>
              {selectedEndpoint.method}
            </Badge>
            <code className="text-sm font-mono">{selectedEndpoint.path}</code>
          </div>
          <Badge variant="outline">
            Status: {selectedEndpoint.status}
          </Badge>
        </div>

        {/* Request/Response Tabs */}
        <Tabs defaultValue="response">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="sdk">SDK Code</TabsTrigger>
          </TabsList>

          {/* Request */}
          <TabsContent value="request" className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Request Body</Label>
              {selectedEndpoint.request && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(JSON.stringify(selectedEndpoint.request, null, 2))}
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Copy
                </Button>
              )}
            </div>
            {selectedEndpoint.request ? (
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                <code>{JSON.stringify(selectedEndpoint.request, null, 2)}</code>
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground italic">No request body required</p>
            )}
          </TabsContent>

          {/* Response */}
          <TabsContent value="response" className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Response Body</Label>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => copyToClipboard(JSON.stringify(selectedEndpoint.response, null, 2))}
              >
                <Copy className="w-3 h-3 mr-2" />
                Copy
              </Button>
            </div>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
              <code>{JSON.stringify(selectedEndpoint.response, null, 2)}</code>
            </pre>
          </TabsContent>

          {/* SDK Code */}
          <TabsContent value="sdk" className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>ChainPass SDK Example</Label>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  const code = generateSDKCode(selectedEndpoint);
                  copyToClipboard(code);
                }}
              >
                <Copy className="w-3 h-3 mr-2" />
                Copy
              </Button>
            </div>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
              <code>{generateSDKCode(selectedEndpoint)}</code>
            </pre>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

function generateSDKCode(endpoint: typeof apiEndpoints[0]): string {
  const methodMap: Record<string, string> = {
    'POST /rest/v1/verification_records': `const verification = await chainpass.createVerification(${JSON.stringify(endpoint.request, null, 2)});
console.log(verification.data);`,
    'GET /rest/v1/verification_records?session_id=eq.sess_sandbox_123': `const verification = await chainpass.getVerification('sess_sandbox_123');
console.log(verification.data);`,
    'POST /rest/v1/vai_assignments': `const vai = await chainpass.createVAI(${JSON.stringify(endpoint.request, null, 2)});
console.log(vai.data);`,
    'GET /rest/v1/vai_assignments?vai_code=eq.VAI-SAND-BOX1-2345': `const vai = await chainpass.getVAI('VAI-SAND-BOX1-2345');
console.log(vai.data);`,
    'POST /rest/v1/payments': `const payment = await chainpass.createPayment(${JSON.stringify(endpoint.request, null, 2)});
console.log(payment.data);`,
    'POST /functions/v1/send-to-vairify': `const result = await chainpass.sendToVairify(${JSON.stringify(endpoint.request, null, 2)});
console.log(result.data);`,
  };

  const key = `${endpoint.method} ${endpoint.path.split('?')[0]}`;
  return methodMap[key] || `// SDK code example not available for this endpoint`;
}
