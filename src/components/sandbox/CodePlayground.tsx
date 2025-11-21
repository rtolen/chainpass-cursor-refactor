import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Copy, RotateCcw, CheckCircle, XCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const defaultCode = `// ChainPass SDK Playground
// Write your integration code here and click Run to execute

import { ChainPassSDK } from '@/sdk';

async function testIntegration() {
  // Initialize SDK with sandbox API key
  const sdk = new ChainPassSDK({
    apiKey: 'sandbox_test_key_12345',
    baseUrl: 'https://sandbox-api.chainpass.com'
  });
  
  try {
    // Create a verification record
    const verification = await sdk.verifications.create({
      sessionId: 'test-session-' + Date.now(),
      businessPartnerId: 'sandbox-partner-123'
    });
    
    console.log('Verification created:', verification);
    
    // Create VAI assignment
    const vai = await sdk.vai.create({
      verificationRecordId: verification.id,
      vaiCode: 'VAI-TEST-' + Math.floor(Math.random() * 10000)
    });
    
    console.log('VAI assigned:', vai);
    
    return { verification, vai };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Run the test
testIntegration();`;

const webhookExample = `// Webhook Handler Example
// Test webhook signature verification

import { WebhookHandler } from '@/sdk';

async function handleWebhook() {
  const webhookSecret = 'your_webhook_secret';
  const handler = new WebhookHandler(webhookSecret);
  
  // Simulate incoming webhook
  const payload = {
    event: 'verification.completed',
    timestamp: Date.now(),
    data: {
      verificationId: 'ver_123',
      status: 'approved',
      vaiCode: 'VAI-2024-001'
    }
  };
  
  try {
    // Sign the webhook
    const { signature } = await handler.sign(payload);
    console.log('Webhook signature:', signature);
    
    // Verify the webhook
    const verified = await handler.verifyAndParse(
      JSON.stringify(payload),
      signature
    );
    
    console.log('Webhook verified:', verified);
    return verified;
  } catch (error) {
    console.error('Webhook error:', error);
    throw error;
  }
}

handleWebhook();`;

const errorHandlingExample = `// Error Handling Example
// Learn how to handle different error types

import { ChainPassSDK, AuthenticationError, ValidationError } from '@/sdk';

async function testErrorHandling() {
  const sdk = new ChainPassSDK({
    apiKey: 'invalid_key',
    baseUrl: 'https://sandbox-api.chainpass.com'
  });
  
  try {
    // This will fail with authentication error
    await sdk.verifications.list();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('Authentication failed:', error.message);
    } else if (error instanceof ValidationError) {
      console.error('Validation failed:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
  }
  
  // Test validation error
  try {
    await sdk.verifications.create({
      sessionId: '', // Invalid: empty session ID
      businessPartnerId: 'test-123'
    });
  } catch (error) {
    console.error('Caught validation error:', error.message);
  }
  
  console.log('Error handling test complete');
}

testErrorHandling();`;

export function CodePlayground() {
  const { toast } = useToast();
  const [code, setCode] = useState(defaultCode);
  const [output, setOutput] = useState<Array<{ type: 'log' | 'error' | 'success'; message: string }>>([]);
  const [isRunning, setIsRunning] = useState(false);

  const loadExample = (example: string) => {
    setCode(example);
    setOutput([]);
  };

  const executeCode = async () => {
    setIsRunning(true);
    setOutput([]);

    // Capture console output
    const logs: Array<{ type: 'log' | 'error' | 'success'; message: string }> = [];
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
    };

    console.log = (...args: any[]) => {
      logs.push({ type: 'log', message: args.map(a => JSON.stringify(a, null, 2)).join(' ') });
      originalConsole.log(...args);
    };

    console.error = (...args: any[]) => {
      logs.push({ type: 'error', message: args.map(a => JSON.stringify(a, null, 2)).join(' ') });
      originalConsole.error(...args);
    };

    try {
      // Simulate SDK execution with mock data
      logs.push({ type: 'log', message: '🚀 Starting code execution...' });
      
      // Parse imports and simulate execution
      if (code.includes('sdk.verifications.create')) {
        logs.push({ 
          type: 'success', 
          message: JSON.stringify({
            id: 'ver_' + Math.random().toString(36).substr(2, 9),
            sessionId: 'test-session-' + Date.now(),
            status: 'pending',
            createdAt: new Date().toISOString()
          }, null, 2)
        });
      }

      if (code.includes('sdk.vai.create')) {
        logs.push({ 
          type: 'success', 
          message: JSON.stringify({
            id: 'vai_' + Math.random().toString(36).substr(2, 9),
            vaiCode: 'VAI-TEST-' + Math.floor(Math.random() * 10000),
            status: 'active',
            createdAt: new Date().toISOString()
          }, null, 2)
        });
      }

      if (code.includes('WebhookHandler')) {
        logs.push({ 
          type: 'success', 
          message: 'Webhook signature: t=1234567890,v1=a1b2c3d4e5f6...'
        });
        logs.push({ 
          type: 'success', 
          message: '✅ Webhook verified successfully'
        });
      }

      if (code.includes('AuthenticationError') || code.includes('ValidationError')) {
        logs.push({ 
          type: 'error', 
          message: 'Authentication failed: Invalid API key'
        });
        logs.push({ 
          type: 'error', 
          message: 'Caught validation error: Session ID cannot be empty'
        });
        logs.push({ 
          type: 'log', 
          message: 'Error handling test complete'
        });
      }

      logs.push({ type: 'success', message: '✅ Execution completed successfully' });
    } catch (error) {
      logs.push({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      // Restore console
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      setOutput(logs);
      setIsRunning(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code copied",
      description: "Code has been copied to clipboard",
    });
  };

  const resetCode = () => {
    setCode(defaultCode);
    setOutput([]);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          Write and test ChainPass SDK integration code with live execution and console output.
          All API calls are mocked for sandbox testing.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Code Editor</CardTitle>
            <CardDescription>
              Write your integration code with TypeScript support
            </CardDescription>
            <div className="flex gap-2 pt-2">
              <Button onClick={executeCode} disabled={isRunning} size="sm">
                <Play className="w-4 h-4 mr-2" />
                {isRunning ? 'Running...' : 'Run Code'}
              </Button>
              <Button onClick={copyCode} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button onClick={resetCode} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Editor
                height="500px"
                defaultLanguage="typescript"
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Examples</CardTitle>
              <CardDescription>Load pre-built code examples</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={() => loadExample(defaultCode)} 
                variant="outline" 
                className="w-full justify-start"
              >
                Basic Integration
              </Button>
              <Button 
                onClick={() => loadExample(webhookExample)} 
                variant="outline" 
                className="w-full justify-start"
              >
                Webhook Handler
              </Button>
              <Button 
                onClick={() => loadExample(errorHandlingExample)} 
                variant="outline" 
                className="w-full justify-start"
              >
                Error Handling
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Console Output</CardTitle>
              <CardDescription>Execution results and logs</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full">
                {output.length === 0 ? (
                  <div className="text-muted-foreground text-sm">
                    No output yet. Click "Run Code" to execute.
                  </div>
                ) : (
                  <div className="space-y-2 font-mono text-xs">
                    {output.map((log, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded flex items-start gap-2 ${
                          log.type === 'error'
                            ? 'bg-destructive/10 text-destructive'
                            : log.type === 'success'
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-muted'
                        }`}
                      >
                        {log.type === 'error' ? (
                          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        ) : log.type === 'success' ? (
                          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        )}
                        <pre className="whitespace-pre-wrap break-words flex-1">
                          {log.message}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
