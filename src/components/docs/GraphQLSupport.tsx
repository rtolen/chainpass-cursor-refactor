import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Play, Code2, BookOpen, Zap, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const graphqlSchema = `type Query {
  verificationRecord(id: ID!): VerificationRecord
  verificationRecords(limit: Int, offset: Int): [VerificationRecord!]!
  vaiAssignment(id: ID!): VAIAssignment
  vaiAssignments(userId: ID): [VAIAssignment!]!
  payment(id: ID!): Payment
  payments(verificationRecordId: ID): [Payment!]!
}

type Mutation {
  createVerificationRecord(input: CreateVerificationInput!): VerificationRecord!
  updateVerificationRecord(id: ID!, input: UpdateVerificationInput!): VerificationRecord!
  createVAIAssignment(input: CreateVAIInput!): VAIAssignment!
  createPayment(input: CreatePaymentInput!): Payment!
  createLegalAgreement(input: CreateLegalInput!): LegalAgreement!
}

type VerificationRecord {
  id: ID!
  sessionId: String!
  verificationStatus: VerificationStatus!
  idDocumentUrl: String
  selfieUrl: String
  biometricConfirmed: Boolean
  complycubeVerificationId: String
  createdAt: DateTime!
  updatedAt: DateTime!
  vaiAssignments: [VAIAssignment!]!
  payments: [Payment!]!
}

type VAIAssignment {
  id: ID!
  vaiCode: String!
  status: VAIStatus!
  verificationRecord: VerificationRecord!
  createdAt: DateTime!
}

type Payment {
  id: ID!
  amount: Int!
  status: PaymentStatus!
  stripePaymentIntentId: String
  verificationRecord: VerificationRecord!
  createdAt: DateTime!
}

type LegalAgreement {
  id: ID!
  vaiAssignment: VAIAssignment!
  signatureData: String
  signatureAgreementSigned: Boolean
  leoDeclarationSigned: Boolean
  createdAt: DateTime!
}

enum VerificationStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
}

enum VAIStatus {
  ACTIVE
  REVOKED
  SUSPENDED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

input CreateVerificationInput {
  sessionId: String!
  verificationStatus: VerificationStatus
}

input UpdateVerificationInput {
  verificationStatus: VerificationStatus
  idDocumentUrl: String
  selfieUrl: String
  biometricConfirmed: Boolean
}

input CreateVAIInput {
  verificationRecordId: ID!
  vaiCode: String!
  status: VAIStatus
}

input CreatePaymentInput {
  verificationRecordId: ID!
  amount: Int!
  status: PaymentStatus
}

input CreateLegalInput {
  vaiAssignmentId: ID!
  signatureData: String
  signatureAgreementSigned: Boolean
  leoDeclarationSigned: Boolean
}

scalar DateTime`;

const exampleQueries = [
  {
    name: "Get Verification Record",
    description: "Fetch a single verification record with related data",
    query: `query GetVerification($id: ID!) {
  verificationRecord(id: $id) {
    id
    sessionId
    verificationStatus
    createdAt
    vaiAssignments {
      id
      vaiCode
      status
    }
    payments {
      id
      amount
      status
    }
  }
}`,
    variables: `{
  "id": "verification_123"
}`
  },
  {
    name: "List Recent Verifications",
    description: "Get the most recent verification records",
    query: `query ListVerifications($limit: Int!, $offset: Int!) {
  verificationRecords(limit: $limit, offset: $offset) {
    id
    sessionId
    verificationStatus
    createdAt
    vaiAssignments {
      vaiCode
      status
    }
  }
}`,
    variables: `{
  "limit": 10,
  "offset": 0
}`
  },
  {
    name: "Get User's VAI Assignments",
    description: "Fetch all V.A.I. codes for a specific user",
    query: `query GetUserVAIs($userId: ID!) {
  vaiAssignments(userId: $userId) {
    id
    vaiCode
    status
    createdAt
    verificationRecord {
      sessionId
      verificationStatus
    }
  }
}`,
    variables: `{
  "userId": "user_123"
}`
  }
];

const exampleMutations = [
  {
    name: "Create Verification Record",
    description: "Start a new verification process",
    query: `mutation CreateVerification($input: CreateVerificationInput!) {
  createVerificationRecord(input: $input) {
    id
    sessionId
    verificationStatus
    createdAt
  }
}`,
    variables: `{
  "input": {
    "sessionId": "session_${Date.now()}",
    "verificationStatus": "PENDING"
  }
}`
  },
  {
    name: "Create V.A.I. Assignment",
    description: "Assign a V.A.I. code to a verification",
    query: `mutation CreateVAI($input: CreateVAIInput!) {
  createVAIAssignment(input: $input) {
    id
    vaiCode
    status
    createdAt
  }
}`,
    variables: `{
  "input": {
    "verificationRecordId": "verification_123",
    "vaiCode": "VAI-${Date.now()}",
    "status": "ACTIVE"
  }
}`
  },
  {
    name: "Create Payment",
    description: "Process a verification payment",
    query: `mutation CreatePayment($input: CreatePaymentInput!) {
  createPayment(input: $input) {
    id
    amount
    status
    createdAt
  }
}`,
    variables: `{
  "input": {
    "verificationRecordId": "verification_123",
    "amount": 9900,
    "status": "PENDING"
  }
}`
  }
];

export const GraphQLSupport = () => {
  const { toast } = useToast();
  const [query, setQuery] = useState(exampleQueries[0].query);
  const [variables, setVariables] = useState(exampleQueries[0].variables);
  const [response, setResponse] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  const executeQuery = async () => {
    setIsExecuting(true);
    setResponse("");

    // Simulate GraphQL execution
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockResponse = {
      data: {
        verificationRecord: {
          id: "verification_123",
          sessionId: "session_456",
          verificationStatus: "COMPLETED",
          createdAt: new Date().toISOString(),
          vaiAssignments: [
            {
              id: "vai_789",
              vaiCode: "VAI-12345",
              status: "ACTIVE"
            }
          ],
          payments: [
            {
              id: "payment_101",
              amount: 9900,
              status: "COMPLETED"
            }
          ]
        }
      }
    };

    setResponse(JSON.stringify(mockResponse, null, 2));
    setIsExecuting(false);

    toast({
      title: "Query Executed",
      description: "GraphQL query completed successfully",
    });
  };

  const loadExample = (example: typeof exampleQueries[0]) => {
    setQuery(example.query);
    setVariables(example.variables);
    setResponse("");
    toast({
      title: "Example Loaded",
      description: example.name,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Zap className="w-4 h-4" />
        <AlertTitle>GraphQL API Access</AlertTitle>
        <AlertDescription>
          Use GraphQL for more flexible queries and to fetch exactly the data you need in a single request.
          Endpoint: <code className="bg-muted px-2 py-1 rounded">https://pbxpkfotysozdmdophhg.supabase.co/graphql/v1</code>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="playground">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="playground">Playground</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="queries">Query Examples</TabsTrigger>
          <TabsTrigger value="mutations">Mutation Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="playground" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Query</CardTitle>
                <CardDescription>Write your GraphQL query here</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={12}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Variables</CardTitle>
                <CardDescription>Query variables in JSON format</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={12}
                  value={variables}
                  onChange={(e) => setVariables(e.target.value)}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button onClick={executeQuery} disabled={isExecuting} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              {isExecuting ? "Executing..." : "Execute Query"}
            </Button>
            <Button variant="outline" onClick={() => copyToClipboard(query)}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Query
            </Button>
          </div>

          {response && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Response</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  {response}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                GraphQL Schema
              </CardTitle>
              <CardDescription>
                Complete type definitions for the ChainPass GraphQL API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => copyToClipboard(graphqlSchema)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Schema
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-[600px]">
                {graphqlSchema}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <div className="grid gap-4">
            {exampleQueries.map((example) => (
              <Card key={example.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{example.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {example.description}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Query</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Query:</h4>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                      {example.query}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Variables:</h4>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                      {example.variables}
                    </pre>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => loadExample(example)} size="sm">
                      <Code2 className="w-4 h-4 mr-2" />
                      Try in Playground
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(example.query)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mutations" className="space-y-4">
          <div className="grid gap-4">
            {exampleMutations.map((example) => (
              <Card key={example.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{example.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {example.description}
                      </CardDescription>
                    </div>
                    <Badge>Mutation</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Mutation:</h4>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                      {example.query}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Variables:</h4>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                      {example.variables}
                    </pre>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => loadExample(example)} size="sm">
                      <Code2 className="w-4 h-4 mr-2" />
                      Try in Playground
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(example.query)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Include your API key in the Authorization header:
          </p>
          <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
{`curl -X POST https://pbxpkfotysozdmdophhg.supabase.co/graphql/v1 \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "{ verificationRecords(limit: 10) { id sessionId } }"}'`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};
