import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Clock, Play, AlertCircle, Info } from 'lucide-react';

export default function WebhookRetryScheduler() {
  const [isTriggering, setIsTriggering] = useState(false);
  const { toast } = useToast();

  const manualTrigger = async () => {
    setIsTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('retry-failed-webhooks');

      if (error) throw error;

      toast({
        title: 'Retry Triggered',
        description: `Processed ${data.results?.processed || 0} webhooks`,
      });
    } catch (error: any) {
      console.error('Error triggering retry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to trigger retry',
        variant: 'destructive',
      });
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          To set up automatic scheduled retries, configure a cron job in your backend to call the retry-failed-webhooks edge function periodically.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Webhook Retry Mechanism
          </CardTitle>
          <CardDescription>
            Failed webhooks are automatically retried with exponential backoff
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Exponential Backoff Strategy:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>1st retry: 30 seconds</li>
                <li>2nd retry: 2 minutes</li>
                <li>3rd retry: 8 minutes</li>
                <li>4th retry: 32 minutes</li>
                <li>5th retry: 2 hours</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">How It Works</h4>
            <p className="text-sm text-muted-foreground">
              1. Failed webhook deliveries are automatically queued<br />
              2. Each webhook gets up to 5 retry attempts<br />
              3. Delays between retries increase exponentially<br />
              4. Manual triggering processes all pending retries immediately
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Manual Trigger
          </CardTitle>
          <CardDescription>
            Immediately process all pending webhook retries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={manualTrigger} 
            className="w-full"
            disabled={isTriggering}
          >
            <Play className="w-4 h-4 mr-2" />
            {isTriggering ? 'Processing...' : 'Run Retry Process Now'}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            This will process up to 50 webhooks that are ready for retry
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
