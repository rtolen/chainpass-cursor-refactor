import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, RefreshCw, AlertCircle, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserManagement } from '@/components/admin/UserManagement';
import { ActivityLog } from '@/components/admin/ActivityLog';
import { RetentionPolicyManager } from '@/components/admin/RetentionPolicyManager';
import { ActivityAnalytics } from '@/components/admin/ActivityAnalytics';
import { AdminNotifications } from '@/components/admin/AdminNotifications';
import { AdminComparison } from '@/components/admin/AdminComparison';
import { AnomalyDetection } from '@/components/admin/AnomalyDetection';
import { EmailDigestManager } from '@/components/admin/EmailDigestManager';
import { ActivityForecast } from '@/components/admin/ActivityForecast';
import { ComplianceReports } from '@/components/admin/ComplianceReports';
import { RealtimeDashboard } from '@/components/admin/RealtimeDashboard';
import { PerformanceScoring } from '@/components/admin/PerformanceScoring';
import { AlertManagement } from '@/components/admin/AlertManagement';
import { BusinessPartnerManagement } from '@/components/admin/BusinessPartnerManagement';
import { CouponManager } from '@/components/admin/CouponManager';
import { PricingManager } from '@/components/admin/PricingManager';
import ApiAlertManager from '@/components/admin/ApiAlertManager';
import WebhookQueueDashboard from '@/components/admin/WebhookQueueDashboard';
import WebhookRetryScheduler from '@/components/admin/WebhookRetryScheduler';

interface WebhookEvent {
  id: string;
  event_type: string;
  user_id: string;
  vai_number: string;
  payload: any;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
  signature: string | null;
}

interface StatusUpdate {
  id: string;
  vai_number: string;
  status_type: string;
  status_data: any;
  created_at: string;
  webhook_event_id: string | null;
}



export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isLoading } = useAdminCheck();
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    loadWebhookEvents();
    loadStatusUpdates();

    // Subscribe to realtime updates
    const webhookChannel = supabase
      .channel('webhook-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vairify_webhook_events',
        },
        (payload) => {
          console.log('Webhook event change:', payload);
          if (payload.eventType === 'INSERT') {
            setWebhookEvents((prev) => [payload.new as WebhookEvent, ...prev]);
            toast({
              title: 'New Webhook Event',
              description: `Event type: ${(payload.new as WebhookEvent).event_type}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            setWebhookEvents((prev) =>
              prev.map((event) =>
                event.id === payload.new.id ? (payload.new as WebhookEvent) : event
              )
            );
          }
        }
      )
      .subscribe();

    const statusChannel = supabase
      .channel('status-updates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vai_status_updates',
        },
        (payload) => {
          console.log('Status update change:', payload);
          if (payload.eventType === 'INSERT') {
            setStatusUpdates((prev) => [payload.new as StatusUpdate, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(webhookChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [isAdmin]);

  const loadWebhookEvents = async () => {
    const { data, error } = await supabase
      .from('vairify_webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading webhook events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load webhook events',
        variant: 'destructive',
      });
    } else {
      setWebhookEvents(data || []);
    }
  };

  const loadStatusUpdates = async () => {
    const { data, error } = await supabase
      .from('vai_status_updates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading status updates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load status updates',
        variant: 'destructive',
      });
    } else {
      setStatusUpdates(data || []);
    }
  };

  const refresh = () => {
    loadWebhookEvents();
    loadStatusUpdates();
    toast({
      title: 'Refreshed',
      description: 'Data has been refreshed',
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Admin privileges required to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredWebhookEvents = webhookEvents.filter((event) => {
    const matchesSearch =
      event.vai_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      eventTypeFilter === 'all' || event.event_type === eventTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredStatusUpdates = statusUpdates.filter((update) =>
    update.vai_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const eventTypes = [
    'all',
    ...Array.from(new Set(webhookEvents.map((e) => e.event_type))),
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor webhook events and V.A.I. status updates in real-time
            </p>
          </div>
          <div className="flex gap-2">
            <AdminNotifications />
            <Button onClick={refresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={handleSignOut} variant="ghost">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by V.A.I. number or User ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-md border border-input bg-background"
          >
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Event Types' : type}
              </option>
            ))}
          </select>
        </div>

        <Tabs defaultValue="realtime" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-15">
            <TabsTrigger value="realtime">
              Live
            </TabsTrigger>
            <TabsTrigger value="performance">
              Performance
            </TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts
            </TabsTrigger>
            <TabsTrigger value="partners">
              Partners
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="webhook-queue">
              Webhook Queue
            </TabsTrigger>
            <TabsTrigger value="webhook-retry">
              Retry
            </TabsTrigger>
            <TabsTrigger value="status">
              Status
            </TabsTrigger>
            <TabsTrigger value="users">
              Users
            </TabsTrigger>
            <TabsTrigger value="activity">
              Activity
            </TabsTrigger>
            <TabsTrigger value="analytics">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="comparison">
              Compare
            </TabsTrigger>
            <TabsTrigger value="forecast">
              Forecast
            </TabsTrigger>
            <TabsTrigger value="anomalies">
              Anomalies
            </TabsTrigger>
            <TabsTrigger value="reports">
              Reports
            </TabsTrigger>
            <TabsTrigger value="email">
              Email
            </TabsTrigger>
            <TabsTrigger value="retention">
              Retention
            </TabsTrigger>
          </TabsList>

          <TabsContent value="realtime" className="space-y-4">
            <RealtimeDashboard />
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <PerformanceScoring />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <AlertManagement />
            <ApiAlertManager />
          </TabsContent>

          <TabsContent value="partners" className="space-y-4">
            <BusinessPartnerManagement />
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            {filteredWebhookEvents.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{event.event_type}</CardTitle>
                      <CardDescription>
                        V.A.I.: {event.vai_number} | User: {event.user_id}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={event.processed ? 'default' : 'secondary'}>
                        {event.processed ? 'Processed' : 'Pending'}
                      </Badge>
                      {event.signature && (
                        <Badge variant="outline">Signed</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                    {event.processed_at && (
                      <div className="text-sm">
                        <span className="font-medium">Processed:</span>{' '}
                        {new Date(event.processed_at).toLocaleString()}
                      </div>
                    )}
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium hover:text-primary">
                        View Payload
                      </summary>
                      <pre className="mt-2 p-4 bg-muted rounded-md overflow-x-auto text-xs">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredWebhookEvents.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No webhook events found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            {filteredStatusUpdates.map((update) => (
              <Card key={update.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{update.status_type}</CardTitle>
                      <CardDescription>V.A.I.: {update.vai_number}</CardDescription>
                    </div>
                    <Badge>{update.status_type.split('.')[0]}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(update.created_at).toLocaleString()}
                    </div>
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium hover:text-primary">
                        View Status Data
                      </summary>
                      <pre className="mt-2 p-4 bg-muted rounded-md overflow-x-auto text-xs">
                        {JSON.stringify(update.status_data, null, 2)}
                      </pre>
                    </details>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredStatusUpdates.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No status updates found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ActivityLog />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <ActivityAnalytics />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <AdminComparison />
          </TabsContent>

          <TabsContent value="forecast" className="space-y-4">
            <ActivityForecast />
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-4">
            <AnomalyDetection />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
          <Tabs defaultValue="pricing">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="coupons">Coupons</TabsTrigger>
            </TabsList>
            <TabsContent value="pricing">
              <PricingManager />
            </TabsContent>
            <TabsContent value="coupons">
              <CouponManager />
            </TabsContent>
          </Tabs>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <EmailDigestManager />
          </TabsContent>

          <TabsContent value="retention" className="space-y-4">
            <RetentionPolicyManager />
          </TabsContent>

          <TabsContent value="webhook-queue" className="space-y-4">
            <WebhookQueueDashboard />
          </TabsContent>

          <TabsContent value="webhook-retry" className="space-y-4">
            <WebhookRetryScheduler />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
