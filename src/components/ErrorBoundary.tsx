import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);

    // Log error to backend
    try {
      await supabase.functions.invoke("log-error", {
        body: {
          errorType: "frontend",
          severity: "high",
          message: error.message,
          stackTrace: error.stack,
          context: {
            componentStack: errorInfo.componentStack,
            route: window.location.pathname,
          },
          userAgent: navigator.userAgent,
        },
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <h1 className="text-xl font-semibold">Something went wrong</h1>
            </div>
            
            <p className="text-muted-foreground">
              We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
            </p>

            {this.state.error && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                  {this.state.error.message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleReset} className="flex-1">
                Reload Page
              </Button>
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex-1"
              >
                Go Back
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
