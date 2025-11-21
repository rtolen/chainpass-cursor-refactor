import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, XCircle, Clock, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface ErrorLog {
  id: string;
  error_type: string;
  severity: string;
  message: string;
  stack_trace: string | null;
  context: any;
  user_agent: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolution_notes: string | null;
  occurred_at: string;
}

export default function ErrorMonitoring() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<ErrorLog[]>([]);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showResolved, setShowResolved] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadErrors();
    }
  }, [isAdmin]);

  useEffect(() => {
    applyFilters();
  }, [errors, filterSeverity, filterType, showResolved]);

  const loadErrors = async () => {
    const { data, error } = await supabase
      .from("error_logs")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error loading error logs:", error);
      return;
    }

    setErrors(data || []);
  };

  const applyFilters = () => {
    let filtered = [...errors];

    if (filterSeverity !== "all") {
      filtered = filtered.filter(e => e.severity === filterSeverity);
    }

    if (filterType !== "all") {
      filtered = filtered.filter(e => e.error_type === filterType);
    }

    if (!showResolved) {
      filtered = filtered.filter(e => !e.resolved);
    }

    setFilteredErrors(filtered);
  };

  const handleResolveError = async () => {
    if (!selectedError) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("error_logs")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
        resolution_notes: resolutionNotes,
      })
      .eq("id", selectedError.id);

    if (error) {
      console.error("Error resolving error:", error);
      toast({
        title: "Error",
        description: "Failed to resolve error",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Resolved",
      description: "Error marked as resolved",
    });

    setSelectedError(null);
    setResolutionNotes("");
    loadErrors();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <XCircle className="h-4 w-4" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4" />;
      case "low":
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  const stats = {
    total: errors.length,
    unresolved: errors.filter(e => !e.resolved).length,
    critical: errors.filter(e => e.severity === "critical" && !e.resolved).length,
    high: errors.filter(e => e.severity === "high" && !e.resolved).length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Error Monitoring</h1>
          <p className="text-muted-foreground">Track and resolve application errors</p>
        </div>
        <Button onClick={loadErrors}>Refresh</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Errors</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Unresolved</div>
          <div className="text-2xl font-bold mt-1">{stats.unresolved}</div>
        </Card>
        <Card className="p-4 border-destructive">
          <div className="text-sm text-muted-foreground">Critical</div>
          <div className="text-2xl font-bold mt-1 text-destructive">{stats.critical}</div>
        </Card>
        <Card className="p-4 border-orange-500">
          <div className="text-sm text-muted-foreground">High Priority</div>
          <div className="text-2xl font-bold mt-1 text-orange-500">{stats.high}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="frontend">Frontend</SelectItem>
              <SelectItem value="backend">Backend</SelectItem>
              <SelectItem value="api">API</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
              <SelectItem value="database">Database</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showResolved ? "default" : "outline"}
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? "Hide" : "Show"} Resolved
          </Button>
        </div>
      </Card>

      {/* Error List & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error List */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Error Logs</h3>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredErrors.map((error) => (
                <Card
                  key={error.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedError?.id === error.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedError(error)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(error.severity)}
                      <Badge variant={getSeverityColor(error.severity) as any}>
                        {error.severity}
                      </Badge>
                      <Badge variant="outline">{error.error_type}</Badge>
                    </div>
                    {error.resolved && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm font-medium mb-1 line-clamp-2">
                    {error.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(error.occurred_at).toLocaleString()}
                  </p>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Error Details */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Error Details</h3>
          {!selectedError ? (
            <p className="text-muted-foreground">Select an error to view details</p>
          ) : (
            <div className="space-y-4">
              <Tabs defaultValue="details">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="stack" className="flex-1">Stack Trace</TabsTrigger>
                  <TabsTrigger value="context" className="flex-1">Context</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-3 mt-4">
                  <div>
                    <label className="text-sm font-medium">Message</label>
                    <p className="text-sm mt-1">{selectedError.message}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Error Type</label>
                    <p className="text-sm mt-1">{selectedError.error_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Occurred At</label>
                    <p className="text-sm mt-1">
                      {new Date(selectedError.occurred_at).toLocaleString()}
                    </p>
                  </div>
                  {selectedError.user_agent && (
                    <div>
                      <label className="text-sm font-medium">User Agent</label>
                      <p className="text-sm mt-1 break-all">{selectedError.user_agent}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="stack" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    <pre className="text-xs bg-muted p-3 rounded">
                      {selectedError.stack_trace || "No stack trace available"}
                    </pre>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="context" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    <pre className="text-xs bg-muted p-3 rounded">
                      {JSON.stringify(selectedError.context, null, 2) || "No context available"}
                    </pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              {!selectedError.resolved && (
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Resolution Notes</label>
                    <Textarea
                      placeholder="Describe how this error was resolved..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleResolveError} className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Resolved
                  </Button>
                </div>
              )}

              {selectedError.resolved && (
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Resolved</span>
                  </div>
                  {selectedError.resolved_at && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedError.resolved_at).toLocaleString()}
                    </p>
                  )}
                  {selectedError.resolution_notes && (
                    <div>
                      <label className="text-sm font-medium">Resolution Notes</label>
                      <p className="text-sm mt-1">{selectedError.resolution_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
