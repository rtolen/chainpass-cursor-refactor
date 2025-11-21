import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";

interface SandboxTestHistoryProps {
  activeTest?: string | null;
}

export const SandboxTestHistory = ({ activeTest }: SandboxTestHistoryProps) => {
  // Mock test history
  const testHistory = [
    {
      id: 'test_1763292304',
      type: 'Verification Flow',
      status: 'completed',
      duration: 6400,
      timestamp: new Date(Date.now() - 300000),
      steps: 6,
    },
    {
      id: 'test_1763289704',
      type: 'Mock User Generation',
      status: 'completed',
      duration: 1200,
      timestamp: new Date(Date.now() - 3600000),
      steps: 1,
    },
    {
      id: 'test_1763286104',
      type: 'Webhook Test',
      status: 'completed',
      duration: 800,
      timestamp: new Date(Date.now() - 7200000),
      steps: 1,
    },
    {
      id: 'test_1763282504',
      type: 'Verification Flow',
      status: 'failed',
      duration: 3200,
      timestamp: new Date(Date.now() - 10800000),
      steps: 3,
    },
  ];

  // Add active test if exists
  const allTests = activeTest 
    ? [{ 
        id: activeTest, 
        type: 'Verification Flow', 
        status: 'running', 
        duration: 0,
        timestamp: new Date(),
        steps: 0,
      }, ...testHistory]
    : testHistory;

  return (
    <div className="space-y-4">
      {allTests.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No test history yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Run a simulation to see your test history here
          </p>
        </Card>
      ) : (
        allTests.map((test) => (
          <Card key={test.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{test.type}</h4>
                  <Badge variant={
                    test.status === 'completed' ? 'default' :
                    test.status === 'running' ? 'secondary' :
                    'destructive'
                  }>
                    {test.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {test.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                    {test.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(test.timestamp, 'MMM dd, yyyy HH:mm')}
                  </div>
                  {test.duration > 0 && (
                    <span>Duration: {(test.duration / 1000).toFixed(1)}s</span>
                  )}
                  {test.steps > 0 && (
                    <span>{test.steps} steps</span>
                  )}
                </div>

                <code className="text-xs font-mono text-muted-foreground">
                  {test.id}
                </code>
              </div>

              <Button size="sm" variant="ghost">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
