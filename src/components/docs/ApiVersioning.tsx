import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch, AlertTriangle, CheckCircle, Clock, Info } from "lucide-react";
import { format } from "date-fns";

const apiVersions = [
  {
    version: "1.0.0",
    status: "current",
    releaseDate: "2025-01-15",
    sunsetDate: null,
    description: "Current stable version with full support",
    changes: [
      "Initial release of ChainPass V.A.I. API",
      "Complete verification workflow endpoints",
      "Webhook integration with HMAC signature verification",
      "Payment processing integration",
      "Legal agreement management"
    ],
    breaking: [],
    deprecated: []
  },
  {
    version: "0.9.0",
    status: "deprecated",
    releaseDate: "2024-11-01",
    sunsetDate: "2025-04-01",
    description: "Legacy version with limited support until April 2025",
    changes: [
      "Beta release of V.A.I. verification endpoints",
      "Basic webhook notifications",
      "Payment intent creation"
    ],
    breaking: [],
    deprecated: [
      {
        endpoint: "POST /api/v1/verify",
        replacement: "POST /rest/v1/verification_records",
        reason: "Migrated to new endpoint structure"
      },
      {
        endpoint: "GET /api/v1/status/:id",
        replacement: "GET /rest/v1/verification_records?id=eq.:id",
        reason: "Migrated to Supabase query pattern"
      }
    ]
  }
];

const changelog = [
  {
    version: "1.0.0",
    date: "2025-01-15",
    type: "major",
    items: [
      {
        type: "feature",
        title: "Webhook Signature Verification",
        description: "Added HMAC-SHA256 signature verification for all webhook callbacks with timestamp-based replay attack prevention",
        breaking: false
      },
      {
        type: "feature",
        title: "Real-time API Monitoring",
        description: "Partners can now view real-time API usage analytics, response times, and error rates in the portal",
        breaking: false
      },
      {
        type: "feature",
        title: "Enhanced Error Responses",
        description: "All error responses now include detailed error codes, messages, and suggested remediation steps",
        breaking: false
      },
      {
        type: "improvement",
        title: "Rate Limit Headers",
        description: "All responses now include X-RateLimit-* headers for better rate limit tracking",
        breaking: false
      }
    ]
  },
  {
    version: "0.9.5",
    date: "2024-12-20",
    type: "minor",
    items: [
      {
        type: "breaking",
        title: "Authentication Header Changes",
        description: "API key must now be provided in both 'apikey' and 'Authorization: Bearer' headers",
        breaking: true,
        migration: "Update your API client to include both headers: apikey: YOUR_KEY and Authorization: Bearer YOUR_KEY"
      },
      {
        type: "fix",
        title: "Payment Status Updates",
        description: "Fixed issue where payment status wasn't updating correctly after Stripe webhook",
        breaking: false
      }
    ]
  },
  {
    version: "0.9.0",
    date: "2024-11-01",
    type: "minor",
    items: [
      {
        type: "feature",
        title: "Beta Release",
        description: "Initial beta release of ChainPass API for selected partners",
        breaking: false
      }
    ]
  }
];

const migrationGuides = [
  {
    from: "0.9.x",
    to: "1.0.0",
    difficulty: "medium",
    estimatedTime: "2-4 hours",
    steps: [
      {
        title: "Update Authentication Headers",
        description: "Add both 'apikey' and 'Authorization: Bearer' headers to all requests",
        code: `// Before (0.9.x)
headers: {
  'X-API-Key': 'your_api_key'
}

// After (1.0.0)
headers: {
  'apikey': 'your_api_key',
  'Authorization': 'Bearer your_api_key'
}`
      },
      {
        title: "Update Endpoint URLs",
        description: "Migrate from /api/v1/* to /rest/v1/* endpoints",
        code: `// Before
POST /api/v1/verify

// After
POST /rest/v1/verification_records`
      },
      {
        title: "Implement Webhook Signature Verification",
        description: "Add HMAC-SHA256 signature verification for webhook security",
        code: `const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}`
      },
      {
        title: "Update Error Handling",
        description: "Handle new structured error response format",
        code: `// New error format
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests",
  "retry_after": 60,
  "code": 429
}`
      }
    ]
  }
];

export const ApiVersioning = () => {
  const currentVersion = apiVersions.find(v => v.status === "current");
  const deprecatedVersions = apiVersions.filter(v => v.status === "deprecated");

  return (
    <div className="space-y-6">
      <Card className="border-primary/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                Current API Version
              </CardTitle>
              <CardDescription className="mt-2">
                Using the latest version ensures access to all features and security updates
              </CardDescription>
            </div>
            <Badge className="text-lg px-4 py-2" variant="default">
              v{currentVersion?.version}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Released: {currentVersion && format(new Date(currentVersion.releaseDate), "MMMM d, yyyy")}
          </div>
          <p className="text-sm">{currentVersion?.description}</p>
          
          <Alert>
            <CheckCircle className="w-4 h-4 text-success" />
            <AlertTitle>Recommended Version</AlertTitle>
            <AlertDescription>
              This is the current stable version with full support and all the latest features.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {deprecatedVersions.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Deprecated Versions
            </CardTitle>
            <CardDescription>
              These versions have limited support and will be sunset soon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deprecatedVersions.map((version) => (
              <Alert key={version.version} variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>Version {version.version}</span>
                  <Badge variant="destructive">Deprecated</Badge>
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{version.description}</p>
                  {version.sunsetDate && (
                    <p className="font-semibold">
                      Sunset Date: {format(new Date(version.sunsetDate), "MMMM d, yyyy")}
                    </p>
                  )}
                  {version.deprecated.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="font-semibold text-sm">Deprecated Endpoints:</p>
                      {version.deprecated.map((dep, idx) => (
                        <div key={idx} className="bg-background/50 p-3 rounded-lg text-sm">
                          <code className="text-destructive">{dep.endpoint}</code>
                          <p className="mt-1">→ Use: <code className="text-success">{dep.replacement}</code></p>
                          <p className="text-xs mt-1 text-muted-foreground">{dep.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Version Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={currentVersion?.version}>
            <TabsList>
              {apiVersions.map((version) => (
                <TabsTrigger key={version.version} value={version.version}>
                  v{version.version}
                  {version.status === "current" && (
                    <Badge variant="default" className="ml-2 text-xs">Current</Badge>
                  )}
                  {version.status === "deprecated" && (
                    <Badge variant="destructive" className="ml-2 text-xs">Deprecated</Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {apiVersions.map((version) => (
              <TabsContent key={version.version} value={version.version} className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Release Information</h4>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Released: {format(new Date(version.releaseDate), "MMMM d, yyyy")}
                      </p>
                      {version.sunsetDate && (
                        <p className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="w-4 h-4" />
                          Sunset: {format(new Date(version.sunsetDate), "MMMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>

                  {version.changes.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Changes</h4>
                      <ul className="space-y-1">
                        {version.changes.map((change, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changelog</CardTitle>
          <CardDescription>
            Detailed history of API changes, improvements, and bug fixes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {changelog.map((release) => (
              <div key={release.version} className="border-l-2 border-primary pl-4">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant={release.type === "major" ? "default" : "secondary"}>
                    v{release.version}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(release.date), "MMMM d, yyyy")}
                  </span>
                  <Badge variant="outline">{release.type}</Badge>
                </div>

                <div className="space-y-3">
                  {release.items.map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${
                      item.breaking ? "bg-destructive/10 border border-destructive/20" : "bg-muted"
                    }`}>
                      <div className="flex items-start gap-2">
                        {item.type === "feature" && <Info className="w-4 h-4 text-primary mt-0.5" />}
                        {item.type === "breaking" && <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />}
                        {item.type === "fix" && <CheckCircle className="w-4 h-4 text-success mt-0.5" />}
                        {item.type === "improvement" && <CheckCircle className="w-4 h-4 text-primary mt-0.5" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{item.title}</span>
                            {item.breaking && (
                              <Badge variant="destructive" className="text-xs">Breaking</Badge>
                            )}
                            <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          {item.migration && (
                            <Alert className="mt-2">
                              <AlertTitle className="text-sm">Migration Required</AlertTitle>
                              <AlertDescription className="text-xs">{item.migration}</AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Migration Guides</CardTitle>
          <CardDescription>
            Step-by-step guides for upgrading between API versions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {migrationGuides.map((guide, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">
                      Migrating from v{guide.from} to v{guide.to}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Badge variant={
                          guide.difficulty === "easy" ? "default" : 
                          guide.difficulty === "medium" ? "secondary" : "destructive"
                        }>
                          {guide.difficulty}
                        </Badge>
                        difficulty
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {guide.estimatedTime}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {guide.steps.map((step, stepIdx) => (
                    <div key={stepIdx} className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{stepIdx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{step.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                          {step.code && (
                            <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto mt-2">
                              <code>{step.code}</code>
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="w-4 h-4" />
        <AlertTitle>Need Help Migrating?</AlertTitle>
        <AlertDescription>
          Contact our support team at support@chainpass.io for assistance with API migrations
          or if you need an extended deprecation period for your integration.
        </AlertDescription>
      </Alert>
    </div>
  );
};
