import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

const errorCodes = [
  {
    code: "400",
    name: "Bad Request",
    description: "The request was invalid or cannot be served. Check your request parameters.",
    example: '{"error": "bad_request", "message": "Invalid session_id format"}',
    severity: "warn",
  },
  {
    code: "401",
    name: "Unauthorized",
    description: "Authentication failed. Check your API key and authorization headers.",
    example: '{"error": "unauthorized", "message": "Invalid or missing API key"}',
    severity: "error",
  },
  {
    code: "403",
    name: "Forbidden",
    description: "You don't have permission to access this resource.",
    example: '{"error": "forbidden", "message": "Insufficient permissions for this operation"}',
    severity: "error",
  },
  {
    code: "404",
    name: "Not Found",
    description: "The requested resource could not be found.",
    example: '{"error": "not_found", "message": "Verification record not found"}',
    severity: "warn",
  },
  {
    code: "409",
    name: "Conflict",
    description: "Request conflicts with current state of the resource.",
    example: '{"error": "conflict", "message": "V.A.I. code already assigned to another user"}',
    severity: "warn",
  },
  {
    code: "422",
    name: "Unprocessable Entity",
    description: "Request was well-formed but contains semantic errors.",
    example: '{"error": "validation_error", "message": "Email format is invalid", "fields": ["contact_email"]}',
    severity: "warn",
  },
  {
    code: "429",
    name: "Too Many Requests",
    description: "Rate limit exceeded. Wait before making more requests.",
    example: '{"error": "rate_limit_exceeded", "message": "Too many requests", "retry_after": 60}',
    severity: "warn",
  },
  {
    code: "500",
    name: "Internal Server Error",
    description: "An error occurred on the server. Contact support if it persists.",
    example: '{"error": "internal_error", "message": "An unexpected error occurred"}',
    severity: "error",
  },
  {
    code: "503",
    name: "Service Unavailable",
    description: "Service is temporarily unavailable. Try again later.",
    example: '{"error": "service_unavailable", "message": "Service is undergoing maintenance"}',
    severity: "error",
  },
  {
    code: "WEBHOOK_SIGNATURE_INVALID",
    name: "Invalid Webhook Signature",
    description: "Webhook signature verification failed. Check your shared secret.",
    example: '{"error": "webhook_signature_invalid", "message": "Invalid X-Webhook-Signature header"}',
    severity: "error",
  },
  {
    code: "WEBHOOK_TIMESTAMP_EXPIRED",
    name: "Webhook Timestamp Expired",
    description: "Webhook timestamp is too old. Possible replay attack.",
    example: '{"error": "webhook_timestamp_expired", "message": "Webhook timestamp is older than 5 minutes"}',
    severity: "error",
  },
  {
    code: "PAYMENT_FAILED",
    name: "Payment Failed",
    description: "Payment processing failed. Check payment details.",
    example: '{"error": "payment_failed", "message": "Card was declined", "decline_code": "insufficient_funds"}',
    severity: "error",
  },
  {
    code: "VERIFICATION_EXPIRED",
    name: "Verification Expired",
    description: "Verification session has expired. Start a new verification.",
    example: '{"error": "verification_expired", "message": "Verification session expired after 24 hours"}',
    severity: "warn",
  },
  {
    code: "VAI_REVOKED",
    name: "V.A.I. Revoked",
    description: "The V.A.I. code has been revoked and is no longer valid.",
    example: '{"error": "vai_revoked", "message": "V.A.I. code was revoked by user request"}',
    severity: "error",
  },
];

export const ErrorCodesReference = () => {
  const [search, setSearch] = useState("");

  const filteredErrors = errorCodes.filter(
    (error) =>
      error.code.toLowerCase().includes(search.toLowerCase()) ||
      error.name.toLowerCase().includes(search.toLowerCase()) ||
      error.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Error Codes Reference
          </CardTitle>
          <CardDescription>
            Complete catalog of API error codes and how to handle them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search error codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />

          <div className="space-y-4">
            {filteredErrors.map((error) => (
              <Card key={error.code} className="border-l-4" style={{
                borderLeftColor: error.severity === "error" ? "hsl(var(--destructive))" : "hsl(var(--warning))"
              }}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge variant={error.severity === "error" ? "destructive" : "secondary"}>
                          {error.code}
                        </Badge>
                        {error.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {error.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Example Response:</p>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                      {error.example}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredErrors.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No error codes found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Handling Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <strong className="block">Always Check Status Codes</strong>
                <p className="text-sm text-muted-foreground">
                  Implement proper error handling for all HTTP status codes, not just success cases.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <strong className="block">Parse Error Messages</strong>
                <p className="text-sm text-muted-foreground">
                  Error responses include detailed messages. Use these to provide helpful feedback to users.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <strong className="block">Log Errors for Debugging</strong>
                <p className="text-sm text-muted-foreground">
                  Keep detailed logs of API errors including request details and timestamps for troubleshooting.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <div>
                <strong className="block">Implement Retry Logic</strong>
                <p className="text-sm text-muted-foreground">
                  For transient errors (429, 500, 503), implement exponential backoff retry strategies.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
