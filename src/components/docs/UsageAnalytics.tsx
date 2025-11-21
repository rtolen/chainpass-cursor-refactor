import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, DollarSign, Activity, Globe, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const dailyUsage = Array.from({ length: 30 }, (_, i) => ({
  date: `Day ${i + 1}`,
  requests: 5000 + Math.random() * 3000,
  cost: 50 + Math.random() * 30
}));

const monthlyTrends = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  requests: 80000 + Math.random() * 40000,
  cost: 800 + Math.random() * 400,
  users: 2000 + Math.random() * 1000
}));

const endpointPopularity = [
  { endpoint: "verification_records", calls: 45000, percentage: 35 },
  { endpoint: "vai_assignments", calls: 38000, percentage: 30 },
  { endpoint: "payments", calls: 25000, percentage: 20 },
  { endpoint: "legal_agreements", calls: 12000, percentage: 10 },
  { endpoint: "send-to-vairify", calls: 6000, percentage: 5 }
];

const geographicData = [
  { region: "North America", requests: 48000, color: "hsl(var(--primary))" },
  { region: "Europe", requests: 32000, color: "hsl(var(--accent))" },
  { region: "Asia Pacific", requests: 18000, color: "hsl(var(--success))" },
  { region: "Latin America", requests: 8000, color: "hsl(var(--warning))" },
  { region: "Other", requests: 4000, color: "hsl(var(--muted))" }
];

const costBreakdown = [
  { category: "API Requests", amount: 450, percentage: 50 },
  { category: "Webhook Delivery", amount: 180, percentage: 20 },
  { category: "Storage", amount: 135, percentage: 15 },
  { category: "Data Transfer", amount: 90, percentage: 10 },
  { category: "Other", amount: 45, percentage: 5 }
];

export const UsageAnalytics = () => {
  const [timeRange, setTimeRange] = useState("30d");

  const exportData = (format: string) => {
    console.log(`Exporting data as ${format}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usage Analytics</h2>
          <p className="text-muted-foreground">Track API usage, costs, and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportData('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128,450</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            <Badge className="mt-2">
              <TrendingUp className="w-3 h-3 mr-1" />
              +15.3%
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-success" />
              Estimated Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,284.50</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
            <Badge variant="secondary" className="mt-2">
              +$127 vs last month
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,247</div>
            <p className="text-xs text-muted-foreground mt-1">Unique users</p>
            <Badge variant="outline" className="mt-2">
              +8.7%
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-warning" />
              Avg Daily Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4,282</div>
            <p className="text-xs text-muted-foreground mt-1">Requests/day</p>
            <Badge variant="outline" className="mt-2">
              Last 30 days
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usage">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Request Volume</CardTitle>
              <CardDescription>API requests over the past 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyUsage}>
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
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Year-over-year comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Requests"
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    name="Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Popularity</CardTitle>
              <CardDescription>Most frequently called API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={endpointPopularity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="endpoint" type="category" stroke="hsl(var(--muted-foreground))" width={150} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="calls" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endpoint Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {endpointPopularity.map((endpoint) => (
                  <div key={endpoint.endpoint} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <code className="text-sm font-semibold">{endpoint.endpoint}</code>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{endpoint.calls.toLocaleString()} calls</Badge>
                        <Badge variant="secondary">{endpoint.percentage}%</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>Requests by region</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={geographicData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ region, percentage }) => `${region}: ${Math.round(percentage)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="requests"
                    >
                      {geographicData.map((entry, index) => (
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
                <CardTitle>Regional Breakdown</CardTitle>
                <CardDescription>Request volume by region</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {geographicData.map((region) => (
                    <div key={region.region} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{region.region}</span>
                        <Badge variant="outline">{region.requests.toLocaleString()}</Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${(region.requests / 110000) * 100}%`,
                            backgroundColor: region.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Cost Trends</CardTitle>
              <CardDescription>Estimated costs over the past 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: any) => `$${value.toFixed(2)}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="hsl(var(--success))"
                    fill="hsl(var(--success))"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Spending by category this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costBreakdown.map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.category}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">${item.amount.toFixed(2)}</Badge>
                        <Badge variant="secondary">{item.percentage}%</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-success"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total Estimated Cost</span>
                    <span className="text-xl font-bold">$900.00</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-success" />
                Cost Optimization Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <strong className="block">Cache Responses</strong>
                  <p className="text-sm text-muted-foreground">
                    Implement caching to reduce API calls by up to 40%
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Activity className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <strong className="block">Batch Requests</strong>
                  <p className="text-sm text-muted-foreground">
                    Combine multiple operations to minimize API overhead
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Globe className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <strong className="block">Use GraphQL</strong>
                  <p className="text-sm text-muted-foreground">
                    Fetch only the data you need with precise queries
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
