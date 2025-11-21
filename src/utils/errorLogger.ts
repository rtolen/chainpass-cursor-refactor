import { supabase } from "@/integrations/supabase/client";

interface LogErrorOptions {
  errorType: "frontend" | "backend" | "api" | "webhook" | "database";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  error?: Error;
  context?: Record<string, any>;
}

export async function logError(options: LogErrorOptions) {
  try {
    await supabase.functions.invoke("log-error", {
      body: {
        errorType: options.errorType,
        severity: options.severity,
        message: options.message,
        stackTrace: options.error?.stack,
        context: {
          ...options.context,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
        userAgent: navigator.userAgent,
      },
    });
  } catch (error) {
    // Silently fail to avoid infinite error loops
    console.error("Failed to log error:", error);
  }
}

// Global error handler
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    logError({
      errorType: "frontend",
      severity: "high",
      message: event.message,
      error: event.error,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logError({
      errorType: "frontend",
      severity: "high",
      message: `Unhandled Promise Rejection: ${event.reason}`,
      context: {
        reason: event.reason,
      },
    });
  });
}
