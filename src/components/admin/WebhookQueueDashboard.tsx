import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface WebhookQueueItem {
  id: string;
  business_partner_id: string;
  callback_url: string;
  payload: any;
  status: string;
  attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  last_error: string | null;
  response_status: number | null;
  response_time_ms: number | null;
  created_at: string;
  completed_at: string | null;
  business_partners?: {
    business_name: string;
  };
}

interface QueueStats {
  total: number;
  pending: number;
  success: number;
  failed: number;
  retrying: number;
  success_rate: number;
  avg_response_time: number;
}

export default function WebhookQueueDashboard() {
  const [queueItems, setQueueItems] = useState<WebhookQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    success: 0,
    failed: 0,
    retrying: 0,
    success_rate: 0,
    avg_response_time: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadQueueData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('webhook-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'webhook_delivery_queue',
        },
        () => {
          loadQueueData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadQueueData = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_delivery_queue')
        .select(`
          *,
          business_partners (
            business_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setQueueItems(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading queue data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load webhook queue',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (items: WebhookQueueItem[]) => {
    const total = items.length;
    const pending = items.filter((i) => i.status === 'pending').length;
    const success = items.filter((i) => i.status === 'success').length;
    const failed = items.filter((i) => i.status === 'failed').length;
    const retrying = items.filter((i) => i.status === 'retrying').length;
    
    const successRate = total > 0 ? (success / total) * 100 : 0;
    
    const completedItems = items.filter((i) => i.response_time_ms !== null);
    const avgResponseTime = completedItems.length > 0
      ? completedItems.reduce((sum, i) => sum + (i.response_time_ms || 0), 0) / completedItems.length
      : 0;

    setStats({
      total,
      pending,
      success,
      failed,
      retrying,
      success_rate: successRate,
      avg_response_time: avgResponseTime,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'retrying':
        return <Badge variant="outline"><RefreshCw className="w-3 h-3 mr-1" />Retrying</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredItems = activeTab === 'all' 
    ? queueItems 
    : queueItems.filter((item) => item.status === activeTab);

  if (isLoading) {
    return <div>Loading webhook queue...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.success_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{stats.success} successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending/Retrying</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending + stats.retrying}</div>
            <p className="text-xs text-muted-foreground">{stats.retrying} retrying</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_response_time.toFixed(0)}ms</div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhook Delivery Queue</CardTitle>
              <CardDescription>Monitor webhook delivery status and retry attempts</CardDescription>
            </div>
            <Button onClick={loadQueueData} size="sm" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="retrying">Retrying ({stats.retrying})</TabsTrigger>
              <TabsTrigger value="success">Success ({stats.success})</TabsTrigger>
              <TabsTrigger value="failed">Failed ({stats.failed})</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Next Retry</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No webhooks in queue
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.business_partners?.business_name || 'Unknown'}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            {item.attempts}/{item.max_attempts}
                          </TableCell>
                          <TableCell>
                            {item.response_status ? (
                              <div className="text-sm">
                                <div>Status: {item.response_status}</div>
                                {item.response_time_ms && (
                                  <div className="text-muted-foreground">{item.response_time_ms}ms</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.next_retry_at ? (
                              <span className="text-sm">
                                {format(new Date(item.next_retry_at), 'MMM d, HH:mm')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {format(new Date(item.created_at), 'MMM d, HH:mm')}
                            </span>
                          </TableCell>
                          <TableCell>
                            {item.last_error ? (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-destructive" />
                                <span className="text-sm truncate max-w-[200px]" title={item.last_error}>
                                  {item.last_error}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
