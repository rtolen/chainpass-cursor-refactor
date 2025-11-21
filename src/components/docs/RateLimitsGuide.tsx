import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, TrendingUp, AlertCircle } from "lucide-react";

export const RateLimitsGuide = () => {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Rate Limits
          </CardTitle>
          <CardDescription>
            Understand API rate limits and throttling policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-slate max-w-none dark:prose-invert">
            <p>
              ChainPass implements rate limiting to ensure fair usage and maintain API performance
              for all business partners. Limits are applied per API key.
            </p>
          </div>

          <Alert>
            <Clock className="w-4 h-4" />
            <AlertTitle>Rate Limit Windows</AlertTitle>
            <AlertDescription>
              Rate limits are calculated using a sliding window algorithm. Once you exceed a limit,
              you'll receive a 429 (Too Many Requests) response.
            </AlertDescription>
          </Alert>

          <div>
            <h3 className="text-lg font-semibold mb-3">Tier Limits</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead>Requests/Minute</TableHead>
                  <TableHead>Requests/Hour</TableHead>
                  <TableHead>Daily Limit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Free</TableCell>
                  <TableCell>10</TableCell>
                  <TableCell>100</TableCell>
                  <TableCell>1,000</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Default</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Starter</TableCell>
                  <TableCell>30</TableCell>
                  <TableCell>500</TableCell>
                  <TableCell>5,000</TableCell>
                  <TableCell>
                    <Badge>Active</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Professional</TableCell>
                  <TableCell>100</TableCell>
                  <TableCell>2,000</TableCell>
                  <TableCell>20,000</TableCell>
                  <TableCell>
                    <Badge variant="outline">Upgrade</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Enterprise</TableCell>
                  <TableCell>Custom</TableCell>
                  <TableCell>Custom</TableCell>
                  <TableCell>Custom</TableCell>
                  <TableCell>
                    <Badge variant="outline">Contact Sales</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Rate Limit Headers
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Every API response includes headers to help you track your rate limit usage:
            </p>
            <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">X-RateLimit-Limit:</span>
                <span>100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">X-RateLimit-Remaining:</span>
                <span>87</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">X-RateLimit-Reset:</span>
                <span>1640995200</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">X-RateLimit-Window:</span>
                <span>60s</span>
              </div>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Rate Limit Exceeded Response</AlertTitle>
            <AlertDescription>
              <pre className="mt-2 bg-background/50 p-3 rounded-lg text-xs overflow-x-auto">
                {`HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995260
Retry-After: 60

{
  "error": "rate_limit_exceeded",
  "message": "You have exceeded the rate limit. Please try again in 60 seconds.",
  "retry_after": 60,
  "limit": 100,
  "window": "1 minute"
}`}
              </pre>
            </AlertDescription>
          </Alert>

          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="text-base">Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <strong className="block">Implement Exponential Backoff</strong>
                  <p className="text-sm text-muted-foreground">
                    When you receive a 429 response, wait before retrying. Start with the Retry-After
                    header value and increase wait time exponentially for subsequent failures.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <strong className="block">Cache Responses</strong>
                  <p className="text-sm text-muted-foreground">
                    Store API responses when appropriate to reduce redundant requests and stay within limits.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <strong className="block">Monitor Rate Limit Headers</strong>
                  <p className="text-sm text-muted-foreground">
                    Track X-RateLimit-Remaining to proactively adjust request frequency before hitting limits.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">4</span>
                </div>
                <div>
                  <strong className="block">Batch Operations</strong>
                  <p className="text-sm text-muted-foreground">
                    Where possible, combine multiple operations into single requests to optimize usage.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
