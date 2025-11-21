import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { format, startOfHour, parseISO, subWeeks, subMonths, isWithinInterval } from "date-fns";
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Timer, Calendar as CalendarIcon, GitCompare } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "./DateRangePicker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ApiUsageLog {
  id: string;
  business_partner_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  created_at: string;
}

interface ApiAnalyticsChartsProps {
  logs: ApiUsageLog[];
  onDrillDown?: (filters: { endpoint?: string; status?: string; timeRange?: { from: Date; to: Date } }) => void;
}

const STATUS_COLORS = {
  "2xx Success": "hsl(var(--chart-1))",
  "3xx Redirect": "hsl(var(--chart-2))",
  "4xx Client Error": "hsl(var(--chart-3))",
  "5xx Server Error": "hsl(var(--chart-4))",
};

type ComparisonMode = "none" | "week-over-week" | "month-over-month";

export default function ApiAnalyticsCharts({ logs, onDrillDown }: ApiAnalyticsChartsProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("none");

  // Filter logs by date range
  const filteredLogs = useMemo(() => {
    if (!dateRange?.from) return logs;
    
    return logs.filter(log => {
      const logDate = parseISO(log.created_at);
      if (dateRange.to) {
        return isWithinInterval(logDate, { start: dateRange.from, end: dateRange.to });
      }
      return logDate >= dateRange.from;
    });
  }, [logs, dateRange]);

  // Get comparison period logs
  const comparisonLogs = useMemo(() => {
    if (comparisonMode === "none" || !dateRange?.from) return [];

    const fromDate = dateRange.from;
    const toDate = dateRange.to || new Date();
    
    let comparisonFrom: Date;
    let comparisonTo: Date;

    if (comparisonMode === "week-over-week") {
      comparisonFrom = subWeeks(fromDate, 1);
      comparisonTo = subWeeks(toDate, 1);
    } else {
      comparisonFrom = subMonths(fromDate, 1);
      comparisonTo = subMonths(toDate, 1);
    }

    return logs.filter(log => {
      const logDate = parseISO(log.created_at);
      return isWithinInterval(logDate, { start: comparisonFrom, end: comparisonTo });
    });
  }, [logs, dateRange, comparisonMode]);

  // Request trends over time (hourly)
  const requestTrends = useMemo(() => {
    const hourlyData = new Map<string, { current: number; comparison: number }>();
    
    filteredLogs.forEach(log => {
      const hour = format(startOfHour(parseISO(log.created_at)), "MMM dd, HH:mm");
      const current = hourlyData.get(hour) || { current: 0, comparison: 0 };
      hourlyData.set(hour, { ...current, current: current.current + 1 });
    });

    if (comparisonMode !== "none") {
      comparisonLogs.forEach(log => {
        const hour = format(startOfHour(parseISO(log.created_at)), "MMM dd, HH:mm");
        const current = hourlyData.get(hour) || { current: 0, comparison: 0 };
        hourlyData.set(hour, { ...current, comparison: current.comparison + 1 });
      });
    }

    return Array.from(hourlyData.entries())
      .map(([hour, data]) => ({ 
        hour, 
        current: data.current,
        previous: comparisonMode !== "none" ? data.comparison : undefined
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .slice(-24);
  }, [filteredLogs, comparisonLogs, comparisonMode]);

  // Status code distribution
  const statusDistribution = useMemo(() => {
    const distribution = {
      "2xx Success": 0,
      "3xx Redirect": 0,
      "4xx Client Error": 0,
      "5xx Server Error": 0,
    };

    filteredLogs.forEach(log => {
      if (log.status_code >= 200 && log.status_code < 300) distribution["2xx Success"]++;
      else if (log.status_code >= 300 && log.status_code < 400) distribution["3xx Redirect"]++;
      else if (log.status_code >= 400 && log.status_code < 500) distribution["4xx Client Error"]++;
      else if (log.status_code >= 500) distribution["5xx Server Error"]++;
    });

    return Object.entries(distribution)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filteredLogs]);

  // Endpoint popularity
  const endpointPopularity = useMemo(() => {
    const endpointCount = new Map<string, number>();
    
    filteredLogs.forEach(log => {
      const endpoint = log.endpoint.length > 30 
        ? log.endpoint.substring(0, 27) + "..." 
        : log.endpoint;
      endpointCount.set(endpoint, (endpointCount.get(endpoint) || 0) + 1);
    });

    return Array.from(endpointCount.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredLogs]);

  // Response time trends
  const responseTimeTrends = useMemo(() => {
    const hourlyResponseTimes = new Map<string, { total: number; count: number }>();
    
    filteredLogs.forEach(log => {
      const hour = format(startOfHour(parseISO(log.created_at)), "MMM dd, HH:mm");
      const current = hourlyResponseTimes.get(hour) || { total: 0, count: 0 };
      hourlyResponseTimes.set(hour, {
        total: current.total + (log.response_time_ms || 0),
        count: current.count + 1,
      });
    });

    return Array.from(hourlyResponseTimes.entries())
      .map(([hour, { total, count }]) => ({
        hour,
        avgResponseTime: Math.round(total / count),
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .slice(-24);
  }, [filteredLogs]);

  const handleStatusClick = (statusCategory: string) => {
    if (!onDrillDown) return;
    
    let status = "";
    if (statusCategory === "2xx Success") status = "success";
    else if (statusCategory === "3xx Redirect") status = "redirect";
    else if (statusCategory === "4xx Client Error") status = "client_error";
    else if (statusCategory === "5xx Server Error") status = "server_error";

    onDrillDown({ status });
  };

  const handleEndpointClick = (endpoint: string) => {
    if (!onDrillDown) return;
    onDrillDown({ endpoint });
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setComparisonMode("none");
  };

  const hasFilters = dateRange?.from || comparisonMode !== "none";

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>Visual insights will appear once API requests are logged</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No data available for analytics. Start making API requests to see charts.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Advanced Filters
              </CardTitle>
              <CardDescription>Customize analytics view with date ranges and comparisons</CardDescription>
            </div>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <GitCompare className="h-4 w-4" />
                Comparison Mode
              </label>
              <Select value={comparisonMode} onValueChange={(value) => setComparisonMode(value as ComparisonMode)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select comparison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Comparison</SelectItem>
                  <SelectItem value="week-over-week">Week over Week</SelectItem>
                  <SelectItem value="month-over-month">Month over Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {dateRange?.from && (
                <Badge variant="secondary">
                  {format(dateRange.from, "MMM dd")} - {dateRange.to ? format(dateRange.to, "MMM dd") : "Now"}
                </Badge>
              )}
              {comparisonMode !== "none" && (
                <Badge variant="secondary">
                  {comparisonMode === "week-over-week" ? "Week Comparison" : "Month Comparison"}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Trends Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Request Trends Over Time
          </CardTitle>
          <CardDescription>
            Hourly request volume{comparisonMode !== "none" && " with comparison period"}
            {onDrillDown && <span className="ml-2 text-xs">(Click data points to drill down)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              current: {
                label: "Current Period",
                color: "hsl(var(--chart-1))",
              },
              previous: {
                label: "Previous Period",
                color: "hsl(var(--chart-5))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={requestTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="hour" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                {comparisonMode !== "none" && <ChartLegend content={<ChartLegendContent />} />}
                <Line 
                  type="monotone" 
                  dataKey="current" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-1))" }}
                  name="Current Period"
                />
                {comparisonMode !== "none" && (
                  <Line 
                    type="monotone" 
                    dataKey="previous" 
                    stroke="hsl(var(--chart-5))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "hsl(var(--chart-5))" }}
                    name="Previous Period"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Code Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Status Code Distribution
            </CardTitle>
            <CardDescription>
              Response status breakdown
              {onDrillDown && <span className="ml-2 text-xs">(Click segments to drill down)</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                "2xx Success": {
                  label: "2xx Success",
                  color: "hsl(var(--chart-1))",
                },
                "3xx Redirect": {
                  label: "3xx Redirect",
                  color: "hsl(var(--chart-2))",
                },
                "4xx Client Error": {
                  label: "4xx Client Error",
                  color: "hsl(var(--chart-3))",
                },
                "5xx Server Error": {
                  label: "5xx Server Error",
                  color: "hsl(var(--chart-4))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    onClick={(data) => handleStatusClick(data.name)}
                    className="cursor-pointer"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Response Time Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Average Response Time
            </CardTitle>
            <CardDescription>Hourly average response time (ms)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                avgResponseTime: {
                  label: "Avg Response Time (ms)",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={responseTimeTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hour" 
                    className="text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="avgResponseTime" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-2))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Endpoint Popularity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Endpoints by Request Count
          </CardTitle>
          <CardDescription>
            Most frequently accessed endpoints
            {onDrillDown && <span className="ml-2 text-xs">(Click bars to drill down)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              count: {
                label: "Requests",
                color: "hsl(var(--chart-3))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={endpointPopularity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis 
                  dataKey="endpoint" 
                  type="category" 
                  className="text-xs"
                  width={150}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--chart-3))" 
                  radius={[0, 4, 4, 0]}
                  onClick={(data) => handleEndpointClick(data.endpoint)}
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
