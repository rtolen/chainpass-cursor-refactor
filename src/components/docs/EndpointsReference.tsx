import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Database, CreditCard, FileText } from "lucide-react";

export const EndpointsReference = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints Reference</CardTitle>
          <CardDescription>
            Complete reference for all ChainPass API endpoints with request/response examples
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="verification" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="verification">
                <Database className="w-4 h-4 mr-2" />
                Verification
              </TabsTrigger>
              <TabsTrigger value="vai">
                <Code className="w-4 h-4 mr-2" />
                V.A.I.
              </TabsTrigger>
              <TabsTrigger value="payments">
                <CreditCard className="w-4 h-4 mr-2" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="legal">
                <FileText className="w-4 h-4 mr-2" />
                Legal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="verification" className="space-y-6 mt-6">
              <EndpointCard
                method="POST"
                path="/rest/v1/verification_records"
                title="Create Verification Record"
                description="Initialize a new identity verification session"
                requestExample={`{
  "session_id": "sess_abc123xyz",
  "verification_status": "pending",
  "biometric_confirmed": false
}`}
                responseExample={`{
  "id": "ver_def456ghi",
  "session_id": "sess_abc123xyz",
  "verification_status": "pending",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}`}
              />

              <EndpointCard
                method="GET"
                path="/rest/v1/verification_records?session_id=eq.{session_id}"
                title="Get Verification Record"
                description="Retrieve verification details by session ID"
                responseExample={`[{
  "id": "ver_def456ghi",
  "session_id": "sess_abc123xyz",
  "verification_status": "completed",
  "biometric_confirmed": true,
  "id_document_url": "https://storage.chainpass.io/...",
  "selfie_url": "https://storage.chainpass.io/...",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:45:00Z"
}]`}
              />

              <EndpointCard
                method="PATCH"
                path="/rest/v1/verification_records?id=eq.{id}"
                title="Update Verification Record"
                description="Update verification status or add verification data"
                requestExample={`{
  "verification_status": "completed",
  "biometric_confirmed": true,
  "complycube_verification_id": "cc_verify_123"
}`}
                responseExample={`{
  "id": "ver_def456ghi",
  "verification_status": "completed",
  "biometric_confirmed": true,
  "updated_at": "2025-01-15T10:45:00Z"
}`}
              />
            </TabsContent>

            <TabsContent value="vai" className="space-y-6 mt-6">
              <EndpointCard
                method="POST"
                path="/rest/v1/vai_assignments"
                title="Create V.A.I. Assignment"
                description="Generate and assign a V.A.I. code to a verified user"
                requestExample={`{
  "verification_record_id": "ver_def456ghi",
  "vai_code": "VAI-AB12-CD34-EF56",
  "status": "active"
}`}
                responseExample={`{
  "id": "vai_789xyz012",
  "verification_record_id": "ver_def456ghi",
  "vai_code": "VAI-AB12-CD34-EF56",
  "status": "active",
  "created_at": "2025-01-15T11:00:00Z"
}`}
              />

              <EndpointCard
                method="GET"
                path="/rest/v1/vai_assignments?vai_code=eq.{vai_code}"
                title="Get V.A.I. Assignment"
                description="Retrieve V.A.I. assignment details by V.A.I. code"
                responseExample={`[{
  "id": "vai_789xyz012",
  "vai_code": "VAI-AB12-CD34-EF56",
  "status": "active",
  "created_at": "2025-01-15T11:00:00Z"
}]`}
              />

              <EndpointCard
                method="POST"
                path="/functions/v1/send-to-vairify"
                title="Send to Vairify Platform"
                description="Transmit V.A.I. data to the Vairify ecosystem"
                requestExample={`{
  "vai_code": "VAI-AB12-CD34-EF56",
  "verification_record_id": "ver_def456ghi"
}`}
                responseExample={`{
  "success": true,
  "message": "V.A.I. successfully transmitted to Vairify",
  "vai_code": "VAI-AB12-CD34-EF56"
}`}
              />
            </TabsContent>

            <TabsContent value="payments" className="space-y-6 mt-6">
              <EndpointCard
                method="POST"
                path="/rest/v1/payments"
                title="Create Payment Record"
                description="Record a payment for verification services"
                requestExample={`{
  "verification_record_id": "ver_def456ghi",
  "amount": 2999,
  "status": "succeeded",
  "stripe_payment_intent_id": "pi_1234567890"
}`}
                responseExample={`{
  "id": "pay_abc123xyz",
  "verification_record_id": "ver_def456ghi",
  "amount": 2999,
  "status": "succeeded",
  "created_at": "2025-01-15T10:35:00Z"
}`}
              />

              <EndpointCard
                method="GET"
                path="/rest/v1/payments?verification_record_id=eq.{id}"
                title="Get Payment Record"
                description="Retrieve payment details for a verification"
                responseExample={`[{
  "id": "pay_abc123xyz",
  "verification_record_id": "ver_def456ghi",
  "amount": 2999,
  "status": "succeeded",
  "stripe_payment_intent_id": "pi_1234567890",
  "created_at": "2025-01-15T10:35:00Z"
}]`}
              />
            </TabsContent>

            <TabsContent value="legal" className="space-y-6 mt-6">
              <EndpointCard
                method="POST"
                path="/rest/v1/legal_agreements"
                title="Create Legal Agreement"
                description="Record legal agreement signatures"
                requestExample={`{
  "vai_assignment_id": "vai_789xyz012",
  "leo_declaration_signed": true,
  "signature_agreement_signed": true,
  "signature_data": "data:image/png;base64,..."
}`}
                responseExample={`{
  "id": "leg_456def789",
  "vai_assignment_id": "vai_789xyz012",
  "leo_declaration_signed": true,
  "signature_agreement_signed": true,
  "created_at": "2025-01-15T10:50:00Z"
}`}
              />

              <EndpointCard
                method="GET"
                path="/rest/v1/legal_agreements?vai_assignment_id=eq.{id}"
                title="Get Legal Agreement"
                description="Retrieve legal agreement records"
                responseExample={`[{
  "id": "leg_456def789",
  "vai_assignment_id": "vai_789xyz012",
  "leo_declaration_signed": true,
  "signature_agreement_signed": true,
  "created_at": "2025-01-15T10:50:00Z"
}]`}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

interface EndpointCardProps {
  method: string;
  path: string;
  title: string;
  description: string;
  requestExample?: string;
  responseExample: string;
}

const EndpointCard = ({
  method,
  path,
  title,
  description,
  requestExample,
  responseExample,
}: EndpointCardProps) => {
  const methodColors = {
    GET: "bg-green-500/10 text-green-600 border-green-500/20",
    POST: "bg-blue-500/10 text-blue-600 border-green-500/20",
    PATCH: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge className={methodColors[method as keyof typeof methodColors]}>
                {method}
              </Badge>
              <code className="text-sm text-muted-foreground font-mono">{path}</code>
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {requestExample && (
          <div>
            <h4 className="font-semibold mb-2 text-sm">Request Body</h4>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
              <code>{requestExample}</code>
            </pre>
          </div>
        )}
        <div>
          <h4 className="font-semibold mb-2 text-sm">Response</h4>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
            <code>{responseExample}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};
