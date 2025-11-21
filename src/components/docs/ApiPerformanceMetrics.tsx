import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, TrendingUp, Clock, AlertCircle, CheckCircle, Zap } from "lucide-react";

const uptimeData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  uptime: 98 + Math.random() * 2,
  responseTime: 150 + Math.random() * 100
}));

const endpointData = [
  { endpoint: "/verification_records", avgLatency: 180, requests: 15420, errors: 23 },
  { endpoint: "/vai_assignments", avgLatency: 220, requests: 12350, errors: 8 },
  { endpoint: "/payments", avgLatency: 350, requests: 8760, errors: 45 },
  { endpoint: "/legal_agreements", avgLatency: 190, requests: 9250, errors: 12 },
  { endpoint: "/send-to-vairify", avgLatency: 450, requests: 5680, errors: 67 }
];

const statusCodeData = [
  { name: "200 OK", value: 89.5, color: "hsl(var(--success))" },
  { name: "4xx Client Error", value: 7.2, color: "hsl(var(--warning))" },
  { name: "5xx Server Error", value: 3.3, color: "hsl(var(--destructive))" }
];

const dailyMetrics = Array.from({ length: 30 }, (_, i) => ({
  date: `Day ${i + 1}`,
  requests: 8000 + Math.random() * 4000,
  errors: 100 + Math.random() * 200,
  avgLatency: 200 + Math.random() * 100
}));

export const ApiPerformanceMetrics = () => {
  const [currentUptime, setCurrentUptime] = useState(99.94);
  const [avgLatency, setAvgLatency] = useState(245);
  const [totalRequests, setTotalRequests] = useState(51460);
  const [errorRate, setErrorRate] = useState(0.31);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentUptime(prev => Math.min(100, prev + (Math.random() - 0.5) * 0.01));
      setAvgLatency(prev => Math.max(100, prev + (Math.random() - 0.5) * 10));
      setTotalRequests(prev => prev + Math.floor(Math.random() * 10));
      setErrorRate(prev => Math.max(0, Math.min(5, prev + (Math.random() - 0.5) * 0.05)));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (value: number, thresholds: { good: number, warning: number }) => {
    if (value >= thresholds.good) {
      return <Badge className="bg-success">Excellent</Badge>;
    } else if (value >= thresholds.warning) {
      return <Badge variant="secondary">Good</Badge>;
    }
    return <Badge variant="destructive">Poor</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              System Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentUptime.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
            {getStatusBadge(currentUptime, { good: 99.5, warning: 99.0 })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Avg Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLatency.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground mt-1">Across all endpoints</p>
            {getStatusBadge(avgLatency < 300 ? 100 : avgLatency < 500 ? 80 : 60, { good: 95, warning: 75 })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
            <Badge variant="outline">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12.5%
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">4xx & 5xx errors</p>
            {getStatusBadge(errorRate < 1 ? 100 : errorRate < 3 ? 80 : 60, { good: 95, warning: 75 })}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="status">Status Codes</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Time (Last 24 Hours)</CardTitle>
              <CardDescription>Average API response time per hour</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={uptimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uptime Percentage</CardTitle>
              <CardDescription>System availability over the past 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={uptimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[95, 100]} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="uptime"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Performance</CardTitle>
              <CardDescription>Latency and request volume by endpoint</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {endpointData.map((endpoint) => (
                  <div key={endpoint.endpoint} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <code className="text-sm font-semibold">{endpoint.endpoint}</code>
                      <div className="flex gap-2">
                        <Badge variant="outline">{endpoint.requests.toLocaleString()} req</Badge>
                        <Badge variant={endpoint.avgLatency < 300 ? "default" : "destructive"}>
                          {endpoint.avgLatency}ms
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Avg Latency</p>
                        <p className="font-semibold">{endpoint.avgLatency}ms</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Requests</p>
                        <p className="font-semibold">{endpoint.requests.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Errors</p>
                        <p className="font-semibold text-destructive">{endpoint.errors}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Status Code Distribution</CardTitle>
                <CardDescription>Response status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusCodeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {statusCodeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Code Summary</CardTitle>
                <CardDescription>Detailed breakdown of responses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statusCodeData.map((status) => (
                    <div key={status.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="font-medium">{status.name}</span>
                      </div>
                      <Badge variant="outline">{status.value}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>30-Day Request Volume</CardTitle>
              <CardDescription>Daily API request trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="requests" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Error Trends</CardTitle>
              <CardDescription>Daily error count over 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="errors"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Service Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-3 bg-success/10 border border-success/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-success mt-0.5" />
              <div>
                <h4 className="font-semibold">All Systems Operational</h4>
                <p className="text-sm text-muted-foreground">All API endpoints responding normally</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Activity className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold">Normal Load</h4>
                <p className="text-sm text-muted-foreground">Traffic within expected range</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Clock className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold">Low Latency</h4>
                <p className="text-sm text-muted-foreground">Response times are optimal</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
