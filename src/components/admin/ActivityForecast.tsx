import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Clock, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ActivityForecast() {
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-forecast", refreshKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("forecast-admin-activity");
      
      if (error) {
        console.error("Forecast error:", error);
        throw error;
      }

      if (data.error) {
        if (data.error.includes("Rate limit")) {
          toast({
            title: "Rate Limit Exceeded",
            description: "Please wait a moment before refreshing the forecast.",
            variant: "destructive",
          });
        } else if (data.error.includes("Payment required")) {
          toast({
            title: "Payment Required",
            description: "Please add credits to your workspace to use AI features.",
            variant: "destructive",
          });
        }
        throw new Error(data.error);
      }

      return data;
    },
    retry: 1,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load forecast: {error instanceof Error ? error.message : "Unknown error"}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  const forecast = data?.data;

  const getLevelColor = (level: string) => {
    switch (level) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "destructive";
      case "moderate": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "decreasing": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Prepare chart data
  const forecastChartData = forecast?.forecast?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.estimated_count,
    confidence: Math.round(item.confidence * 100),
    level: item.predicted_level,
  })) || [];

  const peakHoursData = forecast?.peak_hours?.map((item: any) => ({
    hour: `${item.hour}:00`,
    activity: parseInt(item.activity_level) || 50,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Forecast</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered predictions based on 90 days of historical data
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Insights Overview */}
      {forecast?.insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getTrendIcon(forecast.insights.growth_trend)}
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-semibold">Growth Trend: </span>
              <Badge variant={
                forecast.insights.growth_trend === "increasing" ? "default" :
                forecast.insights.growth_trend === "decreasing" ? "destructive" : "secondary"
              }>
                {forecast.insights.growth_trend}
              </Badge>
            </div>
            <div>
              <span className="font-semibold">Weekly Pattern: </span>
              <span className="text-muted-foreground">{forecast.insights.weekly_pattern}</span>
            </div>
            <div>
              <span className="font-semibold">Seasonality: </span>
              <span className="text-muted-foreground">{forecast.insights.seasonality}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7-Day Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Activity Forecast</CardTitle>
          <CardDescription>
            Predicted activity levels with confidence scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecastChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="Predicted Count"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="confidence"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                name="Confidence %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Busy Periods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Expected Busy Periods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {forecast?.busy_periods?.length > 0 ? (
              <div className="space-y-3">
                {forecast.busy_periods.map((period: any, idx: number) => (
                  <div key={idx} className="border-l-4 border-primary pl-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">
                        {new Date(period.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </span>
                      <Badge variant={getSeverityColor(period.severity)}>
                        {period.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{period.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No unusual busy periods expected</p>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Peak Activity Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activity" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Deviations */}
      {forecast?.deviations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Deviations</CardTitle>
            <CardDescription>
              Unusual patterns or anomalies in recent activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {forecast.deviations.map((deviation: any, idx: number) => (
                <Alert key={idx}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-semibold capitalize">{deviation.type}: </span>
                        {deviation.description}
                        {deviation.date && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({new Date(deviation.date).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                      <Badge variant={getSeverityColor(deviation.severity)}>
                        {deviation.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {forecast?.recommendations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {forecast.recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {data?.metadata && (
        <p className="text-xs text-muted-foreground text-center">
          Analysis based on {data.metadata.analyzed_logs} activity logs from{" "}
          {data.metadata.date_range.start} to {data.metadata.date_range.end}
          <br />
          Generated at {new Date(data.metadata.generated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
