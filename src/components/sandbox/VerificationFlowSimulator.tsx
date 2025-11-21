import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Play, 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  FileText, 
  User, 
  CreditCard, 
  Shield, 
  Send,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VerificationStep {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'pending' | 'processing' | 'completed' | 'error';
  duration: number;
  mockResponse: any;
}

interface VerificationFlowSimulatorProps {
  onTestStart?: (testId: string) => void;
}

export const VerificationFlowSimulator = ({ onTestStart }: VerificationFlowSimulatorProps) => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [testId, setTestId] = useState<string>('');
  
  const [steps, setSteps] = useState<VerificationStep[]>([
    {
      id: 'create_verification',
      name: 'Create Verification',
      description: 'Initialize verification record',
      icon: FileText,
      status: 'pending',
      duration: 500,
      mockResponse: {
        id: 'ver_sandbox_123',
        session_id: 'sess_sandbox_123',
        verification_status: 'pending',
        created_at: new Date().toISOString(),
      },
    },
    {
      id: 'upload_documents',
      name: 'Upload Documents',
      description: 'Upload ID document and selfie',
      icon: User,
      status: 'pending',
      duration: 1500,
      mockResponse: {
        document_url: 'https://storage.example.com/docs/sandbox_id.jpg',
        selfie_url: 'https://storage.example.com/selfies/sandbox_selfie.jpg',
      },
    },
    {
      id: 'biometric_verification',
      name: 'Biometric Verification',
      description: 'Verify identity with ComplyCube',
      icon: Shield,
      status: 'pending',
      duration: 2000,
      mockResponse: {
        complycube_verification_id: 'cc_sandbox_verify_123',
        biometric_confirmed: true,
        match_score: 98.5,
      },
    },
    {
      id: 'process_payment',
      name: 'Process Payment',
      description: 'Record payment transaction',
      icon: CreditCard,
      status: 'pending',
      duration: 1000,
      mockResponse: {
        payment_id: 'pay_sandbox_123',
        amount: 2999,
        status: 'succeeded',
      },
    },
    {
      id: 'assign_vai',
      name: 'Assign V.A.I.',
      description: 'Generate V.A.I. code',
      icon: Shield,
      status: 'pending',
      duration: 800,
      mockResponse: {
        vai_code: 'VAI-SAND-BOX1-2345',
        status: 'active',
        assigned_at: new Date().toISOString(),
      },
    },
    {
      id: 'send_webhook',
      name: 'Send Webhook',
      description: 'Notify business partner',
      icon: Send,
      status: 'pending',
      duration: 600,
      mockResponse: {
        webhook_sent: true,
        event_type: 'verification.completed',
        delivery_status: 200,
      },
    },
  ]);

  const runSimulation = async () => {
    const newTestId = `test_${Date.now()}`;
    setTestId(newTestId);
    setIsRunning(true);
    setCurrentStep(0);
    
    if (onTestStart) {
      onTestStart(newTestId);
    }

    // Reset all steps
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const })));

    toast({
      title: "Simulation Started",
      description: "Running verification flow...",
    });

    // Run through each step
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      
      // Set to processing
      setSteps(prev => prev.map((step, idx) => 
        idx === i ? { ...step, status: 'processing' as const } : step
      ));

      // Wait for step duration
      await new Promise(resolve => setTimeout(resolve, steps[i].duration));

      // Set to completed
      setSteps(prev => prev.map((step, idx) => 
        idx === i ? { ...step, status: 'completed' as const } : step
      ));

      toast({
        title: steps[i].name,
        description: `${steps[i].description} - Completed`,
      });
    }

    setIsRunning(false);
    setCurrentStep(steps.length);

    toast({
      title: "Simulation Complete",
      description: "All steps executed successfully!",
    });
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Verification Flow</h3>
          <p className="text-sm text-muted-foreground">
            {isRunning ? 'Running simulation...' : 'Ready to start'}
          </p>
        </div>
        <Button 
          onClick={runSimulation} 
          disabled={isRunning}
          size="lg"
        >
          <Play className="w-4 h-4 mr-2" />
          {isRunning ? 'Running...' : 'Start Simulation'}
        </Button>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Test ID */}
      {testId && (
        <Alert>
          <Clock className="w-4 h-4" />
          <AlertDescription>
            Test ID: <code className="font-mono">{testId}</code>
          </AlertDescription>
        </Alert>
      )}

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep && isRunning;
          const isCompleted = step.status === 'completed';
          
          return (
            <Card 
              key={step.id}
              className={`p-4 transition-all ${
                isActive ? 'ring-2 ring-primary' : ''
              } ${isCompleted ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${
                  isCompleted ? 'bg-primary text-primary-foreground' :
                  isActive ? 'bg-primary/10 text-primary animate-pulse' :
                  'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{step.name}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                    <Badge variant={
                      step.status === 'completed' ? 'default' :
                      step.status === 'processing' ? 'secondary' :
                      'outline'
                    }>
                      {step.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {step.status === 'processing' && <Circle className="w-3 h-3 mr-1 animate-spin" />}
                      {step.status}
                    </Badge>
                  </div>

                  {/* Mock Response */}
                  {step.status === 'completed' && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">Mock Response:</p>
                      <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                        <code>{JSON.stringify(step.mockResponse, null, 2)}</code>
                      </pre>
                    </div>
                  )}

                  {/* Processing indicator */}
                  {step.status === 'processing' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex gap-1">
                        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                      </div>
                      Processing
                    </div>
                  )}
                </div>

                {/* Arrow */}
                {index < steps.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-muted-foreground mt-2" />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Complete Message */}
      {currentStep === steps.length && !isRunning && (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>
            Simulation completed successfully! All verification steps executed.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
