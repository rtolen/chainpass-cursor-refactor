import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, Search, Filter, X, Download, FileJson } from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import ApiAnalyticsCharts from "./ApiAnalyticsCharts";

interface ApiUsageLog {
  id: string;
  business_partner_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  created_at: string;
}

interface RateLimitStatus {
  current_minute: number;
  current_hour: number;
  limit_minute: number;
  limit_hour: number;
}

interface ApiUsageMonitorProps {
  businessPartnerId: string;
}

export default function ApiUsageMonitor({ businessPartnerId }: ApiUsageMonitorProps) {
  const [recentLogs, setRecentLogs] = useState<ApiUsageLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ApiUsageLog[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);
  const [requestsPerMinute, setRequestsPerMinute] = useState(0);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>({
    current_minute: 0,
    current_hour: 0,
    limit_minute: 100,
    limit_hour: 1000,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateRange, setDateRange] = useState("24h");
  const [showFilters, setShowFilters] = useState(false);
  const [drillDownActive, setDrillDownActive] = useState(false);

  useEffect(() => {
    loadRecentLogs();
    calculateMetrics();

    // Set up realtime subscription
    const channel = supabase
      .channel('api-usage-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'api_usage_logs',
          filter: `business_partner_id=eq.${businessPartnerId}`,
        },
        (payload) => {
          const newLog = payload.new as ApiUsageLog;
          setRecentLogs((prev) => [newLog, ...prev].slice(0, 200));
          
          // Update metrics
          calculateMetrics();
        }
      )
      .subscribe();

    // Refresh metrics every 30 seconds
    const metricsInterval = setInterval(() => {
      calculateMetrics();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(metricsInterval);
    };
  }, [businessPartnerId, dateRange]);

  // Apply filters whenever logs or filter settings change
  useEffect(() => {
    applyFilters();
  }, [recentLogs, searchQuery, statusFilter, methodFilter, dateRange]);

  const loadRecentLogs = async () => {
    try {
      // Get date range for initial load
      let dateThreshold = new Date();
      switch (dateRange) {
        case "1h":
          dateThreshold = new Date(Date.now() - 60 * 60 * 1000);
          break;
        case "24h":
          dateThreshold = subDays(new Date(), 1);
          break;
        case "7d":
          dateThreshold = subDays(new Date(), 7);
          break;
        case "30d":
          dateThreshold = subDays(new Date(), 30);
          break;
        default:
          dateThreshold = subDays(new Date(), 1);
      }

      const { data, error } = await supabase
        .from("api_usage_logs")
        .select("*")
        .eq("business_partner_id", businessPartnerId)
        .gte("created_at", dateThreshold.toISOString())
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      if (data) setRecentLogs(data);
    } catch (error) {
      console.error("Error loading recent logs:", error);
    }
  };

  const calculateMetrics = async () => {
    try {
      // Get logs from the last minute
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Last minute stats
      const { data: minuteData } = await supabase
        .from("api_usage_logs")
        .select("status_code, response_time_ms")
        .eq("business_partner_id", businessPartnerId)
        .gte("created_at", oneMinuteAgo);

      // Last hour stats
      const { data: hourData } = await supabase
        .from("api_usage_logs")
        .select("id")
        .eq("business_partner_id", businessPartnerId)
        .gte("created_at", oneHourAgo);

      if (minuteData) {
        setRequestsPerMinute(minuteData.length);
        
        const errors = minuteData.filter((log) => log.status_code >= 400).length;
        setErrorCount(errors);

        if (minuteData.length > 0) {
          const totalTime = minuteData.reduce((sum, log) => sum + (log.response_time_ms || 0), 0);
          setAvgResponseTime(Math.round(totalTime / minuteData.length));
        }

        setRateLimitStatus({
          current_minute: minuteData.length,
          current_hour: hourData?.length || 0,
          limit_minute: 100,
          limit_hour: 1000,
        });
      }
    } catch (error) {
      console.error("Error calculating metrics:", error);
    }
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "default";
    if (statusCode >= 300 && statusCode < 400) return "secondary";
    if (statusCode >= 400 && statusCode < 500) return "outline";
    return "destructive";
  };

  const getStatusIcon = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return <CheckCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getRateLimitPercentage = (current: number, limit: number) => {
    return Math.round((current / limit) * 100);
  };

  const getRateLimitColor = (percentage: number) => {
    if (percentage < 50) return "bg-green-500";
    if (percentage < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const applyFilters = () => {
    let filtered = [...recentLogs];

    // Search by endpoint
    if (searchQuery) {
      filtered = filtered.filter((log) =>
        log.endpoint.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status code
    if (statusFilter !== "all") {
      switch (statusFilter) {
        case "success":
          filtered = filtered.filter((log) => log.status_code >= 200 && log.status_code < 300);
          break;
        case "redirect":
          filtered = filtered.filter((log) => log.status_code >= 300 && log.status_code < 400);
          break;
        case "client_error":
          filtered = filtered.filter((log) => log.status_code >= 400 && log.status_code < 500);
          break;
        case "server_error":
          filtered = filtered.filter((log) => log.status_code >= 500);
          break;
      }
    }

    // Filter by method
    if (methodFilter !== "all") {
      filtered = filtered.filter((log) => log.method === methodFilter);
    }

    // Filter by date range
    let dateThreshold = new Date();
    switch (dateRange) {
      case "1h":
        dateThreshold = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case "24h":
        dateThreshold = subDays(new Date(), 1);
        break;
      case "7d":
        dateThreshold = subDays(new Date(), 7);
        break;
      case "30d":
        dateThreshold = subDays(new Date(), 30);
        break;
    }
    filtered = filtered.filter((log) => new Date(log.created_at) >= dateThreshold);

    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setMethodFilter("all");
    setDateRange("24h");
  };

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ["Timestamp", "Method", "Endpoint", "Status Code", "Response Time (ms)"];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
        log.method,
        `"${log.endpoint}"`,
        log.status_code,
        log.response_time_ms || 0
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `api-usage-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (filteredLogs.length === 0) return;

    const exportData = filteredLogs.map(log => ({
      timestamp: log.created_at,
      method: log.method,
      endpoint: log.endpoint,
      status_code: log.status_code,
      response_time_ms: log.response_time_ms,
      formatted_timestamp: format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")
    }));

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `api-usage-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDrillDown = (filters: { endpoint?: string; status?: string; timeRange?: { from: Date; to: Date } }) => {
    setDrillDownActive(true);
    setShowFilters(true);
    
    if (filters.endpoint) {
      setSearchQuery(filters.endpoint);
    }
    
    if (filters.status) {
      setStatusFilter(filters.status);
    }

    // Scroll to the logs section
    setTimeout(() => {
      const logsElement = document.getElementById("request-logs");
      if (logsElement) {
        logsElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || methodFilter !== "all" || dateRange !== "24h" || drillDownActive;

  return (
    <div className="space-y-4">
      {/* Analytics Charts */}
      <ApiAnalyticsCharts logs={filteredLogs} onDrillDown={handleDrillDown} />

      {/* Real-time Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Requests/Min
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requestsPerMinute}</div>
            <p className="text-xs text-muted-foreground">Last 60 seconds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">Last minute</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{errorCount}</div>
            <p className="text-xs text-muted-foreground">Last minute</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Rate Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">Active</div>
            <p className="text-xs text-muted-foreground">Within limits</p>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limit Status */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limit Status</CardTitle>
          <CardDescription>Current usage against rate limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Per Minute</span>
              <span className="text-sm text-muted-foreground">
                {rateLimitStatus.current_minute} / {rateLimitStatus.limit_minute}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getRateLimitColor(
                  getRateLimitPercentage(rateLimitStatus.current_minute, rateLimitStatus.limit_minute)
                )}`}
                style={{
                  width: `${getRateLimitPercentage(rateLimitStatus.current_minute, rateLimitStatus.limit_minute)}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Per Hour</span>
              <span className="text-sm text-muted-foreground">
                {rateLimitStatus.current_hour} / {rateLimitStatus.limit_hour}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getRateLimitColor(
                  getRateLimitPercentage(rateLimitStatus.current_hour, rateLimitStatus.limit_hour)
                )}`}
                style={{
                  width: `${getRateLimitPercentage(rateLimitStatus.current_hour, rateLimitStatus.limit_hour)}%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter & Search
              </CardTitle>
              <CardDescription>Filter requests by endpoint, status, method, and date range</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Hide" : "Show"} Filters
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Endpoint</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by endpoint..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status Code</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">2xx Success</SelectItem>
                    <SelectItem value="redirect">3xx Redirect</SelectItem>
                    <SelectItem value="client_error">4xx Client Error</SelectItem>
                    <SelectItem value="server_error">5xx Server Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">HTTP Method</Label>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger id="method">
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-range">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger id="date-range">
                    <SelectValue placeholder="Last 24 hours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {drillDownActive && <span className="font-medium">Drill-down active: </span>}
                  Showing {filteredLogs.length} of {recentLogs.length} requests
                </p>
                <Button variant="outline" size="sm" onClick={() => { clearFilters(); setDrillDownActive(false); }}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Recent Request Logs */}
      <Card id="request-logs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Real-time Request Log</CardTitle>
              <CardDescription>
                {hasActiveFilters ? `Filtered results (${filteredLogs.length})` : `Live stream of API requests (last 200)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={filteredLogs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToJSON}
                disabled={filteredLogs.length === 0}
              >
                <FileJson className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {recentLogs.length === 0 ? (
                    <>No requests yet. Waiting for API activity...</>
                  ) : (
                    <>No requests match your filters. Try adjusting your filter criteria.</>
                  )}
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(log.status_code)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.method}
                          </Badge>
                          <span className="font-mono text-sm truncate">
                            {log.endpoint}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "HH:mm:ss")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusColor(log.status_code)}>
                        {log.status_code}
                      </Badge>
                      <span className="text-sm text-muted-foreground min-w-[60px] text-right">
                        {log.response_time_ms}ms
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
