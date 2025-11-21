import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, Key, AlertTriangle, CheckCircle } from "lucide-react";

export const AuthenticationGuide = () => {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Authentication Overview
          </CardTitle>
          <CardDescription>
            Secure your API requests with proper authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-slate max-w-none dark:prose-invert">
          <h3>API Key Authentication</h3>
          <p>
            All API requests must be authenticated using an API key. You receive this key after
            your business partner application is approved by ChainPass administrators.
          </p>

          <Alert>
            <Key className="w-4 h-4" />
            <AlertTitle>Required Headers</AlertTitle>
            <AlertDescription>
              <pre className="mt-2 bg-muted p-3 rounded-lg">
                {`apikey: YOUR_API_KEY
Authorization: Bearer YOUR_API_KEY`}
              </pre>
            </AlertDescription>
          </Alert>

          <h3>Authentication Flow</h3>
          <div className="not-prose">
            <div className="bg-muted p-6 rounded-lg my-4">
              <svg viewBox="0 0 800 400" className="w-full">
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--primary))" />
                  </marker>
                </defs>

                {/* Boxes */}
                <rect x="50" y="50" width="150" height="80" rx="8" fill="hsl(var(--primary))" fillOpacity="0.2" stroke="hsl(var(--primary))" strokeWidth="2" />
                <text x="125" y="95" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold">
                  Business Partner
                </text>

                <rect x="325" y="50" width="150" height="80" rx="8" fill="hsl(var(--accent))" fillOpacity="0.2" stroke="hsl(var(--accent))" strokeWidth="2" />
                <text x="400" y="95" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold">
                  ChainPass Admin
                </text>

                <rect x="600" y="50" width="150" height="80" rx="8" fill="hsl(var(--success))" fillOpacity="0.2" stroke="hsl(var(--success))" strokeWidth="2" />
                <text x="675" y="95" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold">
                  API Access
                </text>

                {/* Arrows */}
                <line x1="200" y1="90" x2="320" y2="90" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="260" y="80" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">
                  1. Register
                </text>

                <line x1="475" y1="90" x2="595" y2="90" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="535" y="80" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">
                  2. Approve
                </text>

                <line x1="595" y1="110" x2="475" y2="110" stroke="hsl(var(--success))" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="535" y="135" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">
                  3. Receive API Key
                </text>

                <line x1="320" y1="110" x2="200" y2="110" stroke="hsl(var(--success))" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="260" y="155" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">
                  4. Send API Key
                </text>

                {/* Steps */}
                <rect x="50" y="200" width="700" height="150" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" />
                <text x="400" y="230" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold">
                  Making Authenticated Requests
                </text>
                <text x="80" y="260" fill="hsl(var(--muted-foreground))" fontSize="12">
                  5. Include API key in request headers (apikey + Authorization)
                </text>
                <text x="80" y="285" fill="hsl(var(--muted-foreground))" fontSize="12">
                  6. ChainPass validates the API key
                </text>
                <text x="80" y="310" fill="hsl(var(--muted-foreground))" fontSize="12">
                  7. Request is processed and response is returned
                </text>
              </svg>
            </div>
          </div>

          <h3>Security Best Practices</h3>
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Keep Your API Key Secret</AlertTitle>
            <AlertDescription>
              Never expose your API key in client-side code, version control, or public repositories.
              Always store it securely as an environment variable.
            </AlertDescription>
          </Alert>

          <div className="grid gap-3 my-4">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <CheckCircle className="w-5 h-5 text-success mt-0.5" />
              <div>
                <strong>Store keys in environment variables</strong>
                <p className="text-sm text-muted-foreground">Use .env files or secure secret management</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <CheckCircle className="w-5 h-5 text-success mt-0.5" />
              <div>
                <strong>Use HTTPS only</strong>
                <p className="text-sm text-muted-foreground">Never send API keys over unencrypted connections</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <CheckCircle className="w-5 h-5 text-success mt-0.5" />
              <div>
                <strong>Rotate keys regularly</strong>
                <p className="text-sm text-muted-foreground">Generate new API keys periodically for enhanced security</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <CheckCircle className="w-5 h-5 text-success mt-0.5" />
              <div>
                <strong>Implement server-side calls</strong>
                <p className="text-sm text-muted-foreground">Make API requests from your backend, not from browsers</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example Request</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
            <code>{`curl -X POST 'https://pbxpkfotysozdmdophhg.supabase.co/rest/v1/verification_records' \\
  -H 'apikey: your_api_key_here' \\
  -H 'Authorization: Bearer your_api_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "session_id": "session_123",
    "verification_status": "pending"
  }'`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};
