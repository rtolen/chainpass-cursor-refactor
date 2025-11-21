import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const webhookEvents = [
  {
    type: 'verification.started',
    name: 'Verification Started',
    description: 'User initiates verification process',
    payload: {
      event_type: 'verification.started',
      event_id: 'evt_sandbox_start_001',
      timestamp: new Date().toISOString(),
      data: {
        session_id: 'sess_sandbox_123',
        verification_record_id: 'ver_sandbox_123',
        user_id: 'user_sandbox_001',
        started_at: new Date().toISOString(),
      },
    },
  },
  {
    type: 'verification.completed',
    name: 'Verification Completed',
    description: 'Verification successfully completed',
    payload: {
      event_type: 'verification.completed',
      event_id: 'evt_sandbox_complete_001',
      timestamp: new Date().toISOString(),
      data: {
        session_id: 'sess_sandbox_123',
        verification_record_id: 'ver_sandbox_123',
        vai_code: 'VAI-SAND-BOX1-2345',
        user_id: 'user_sandbox_001',
        status: 'completed',
        verification_method: 'biometric',
        completed_at: new Date().toISOString(),
      },
    },
  },
  {
    type: 'verification.failed',
    name: 'Verification Failed',
    description: 'Verification failed or rejected',
    payload: {
      event_type: 'verification.failed',
      event_id: 'evt_sandbox_failed_001',
      timestamp: new Date().toISOString(),
      data: {
        session_id: 'sess_sandbox_123',
        verification_record_id: 'ver_sandbox_123',
        user_id: 'user_sandbox_001',
        reason: 'Document expired or face match failed',
        failed_at: new Date().toISOString(),
      },
    },
  },
  {
    type: 'vai.assigned',
    name: 'V.A.I. Assigned',
    description: 'V.A.I. code assigned to user',
    payload: {
      event_type: 'vai.assigned',
      event_id: 'evt_sandbox_vai_001',
      timestamp: new Date().toISOString(),
      data: {
        vai_code: 'VAI-SAND-BOX1-2345',
        verification_record_id: 'ver_sandbox_123',
        user_id: 'user_sandbox_001',
        assigned_at: new Date().toISOString(),
      },
    },
  },
  {
    type: 'vai.suspended',
    name: 'V.A.I. Suspended',
    description: 'V.A.I. code temporarily suspended',
    payload: {
      event_type: 'vai.suspended',
      event_id: 'evt_sandbox_suspend_001',
      timestamp: new Date().toISOString(),
      data: {
        vai_code: 'VAI-SAND-BOX1-2345',
        old_status: 'active',
        new_status: 'suspended',
        reason: 'Suspicious activity detected',
        changed_at: new Date().toISOString(),
      },
    },
  },
  {
    type: 'vai.revoked',
    name: 'V.A.I. Revoked',
    description: 'V.A.I. code permanently revoked',
    payload: {
      event_type: 'vai.revoked',
      event_id: 'evt_sandbox_revoke_001',
      timestamp: new Date().toISOString(),
      data: {
        vai_code: 'VAI-SAND-BOX1-2345',
        old_status: 'active',
        new_status: 'revoked',
        reason: 'User request or policy violation',
        changed_at: new Date().toISOString(),
      },
    },
  },
];

export const WebhookPayloadViewer = () => {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState(webhookEvents[0]);

  const copyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(selectedEvent.payload, null, 2));
    toast({
      title: "Copied to clipboard",
      description: "Webhook payload copied successfully",
    });
  };

  const downloadPayload = () => {
    const blob = new Blob([JSON.stringify(selectedEvent.payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webhook-${selectedEvent.type}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Webhook payload saved as JSON file",
    });
  };

  const copySignature = () => {
    const mockSignature = `t=${Math.floor(Date.now() / 1000)},v1=${'a'.repeat(64)}`;
    navigator.clipboard.writeText(mockSignature);
    toast({
      title: "Copied to clipboard",
      description: "Mock signature header copied",
    });
  };

  return (
    <div className="space-y-6">
      {/* Event Selection */}
      <div className="space-y-2">
        <Label>Event Type</Label>
        <Select 
          value={selectedEvent.type} 
          onValueChange={(value) => {
            const event = webhookEvents.find(e => e.type === value);
            if (event) setSelectedEvent(event);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {webhookEvents.map((event) => (
              <SelectItem key={event.type} value={event.type}>
                <div className="flex flex-col">
                  <span className="font-medium">{event.name}</span>
                  <span className="text-xs text-muted-foreground">{event.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Event Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{selectedEvent.name}</h3>
            <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
          </div>
          <Badge variant="outline">{selectedEvent.type}</Badge>
        </div>

        {/* Webhook Headers */}
        <div className="space-y-2">
          <Label>HTTP Headers</Label>
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Content-Type:</span>
              <span>application/json</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">X-ChainPass-Signature:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs">t=1234567890,v1=aaa...</span>
                <Button size="sm" variant="ghost" onClick={copySignature}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">X-ChainPass-Event:</span>
              <span>{selectedEvent.type}</span>
            </div>
          </div>
        </div>

        {/* Payload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Payload</Label>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyPayload}>
                <Copy className="w-3 h-3 mr-2" />
                Copy
              </Button>
              <Button size="sm" variant="outline" onClick={downloadPayload}>
                <Download className="w-3 h-3 mr-2" />
                Download
              </Button>
            </div>
          </div>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
            <code>{JSON.stringify(selectedEvent.payload, null, 2)}</code>
          </pre>
        </div>

        {/* Signature Verification Code */}
        <div className="space-y-2">
          <Label>Signature Verification Example</Label>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
            <code>{`import { verifyWebhookSignature } from '@chainpass/sdk';

const signature = req.headers['x-chainpass-signature'];
const payload = req.body;
const secret = process.env.CHAINPASS_WEBHOOK_SECRET;

const result = await verifyWebhookSignature(
  payload,
  signature,
  secret,
  300 // 5 minute tolerance
);

if (!result.valid) {
  console.error('Invalid signature:', result.error);
  return res.status(401).json({ error: 'Invalid signature' });
}

// Process webhook for event: ${selectedEvent.type}`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
