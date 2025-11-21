import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type CallbackStatus = "processing" | "success" | "failed" | "cancelled";

export default function VerificationCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [attempts, setAttempts] = useState(0);
  const [transactionId, setTransactionId] = useState<string>("");
  
  const maxAttempts = 60; // 5 minutes polling

  useEffect(() => {
    const urlStatus = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    
    if (urlStatus === "cancelled") {
      setStatus("cancelled");
      return;
    }
    
    if (!clientId) {
      setStatus("failed");
      toast.error("Missing client ID");
      return;
    }
    
    // Start polling for verification completion
    pollVerificationStatus(clientId);
  }, [searchParams]);

  const pollVerificationStatus = async (clientId: string) => {
    console.log("[Callback] Starting polling for client:", clientId);
    
    const pollInterval = setInterval(async () => {
      setAttempts(prev => prev + 1);
      
      try {
        console.log(`[Callback] Polling attempt ${attempts + 1}/${maxAttempts}`);
        
        const { data, error } = await supabase.functions.invoke(
          "complycube-verification-callback",
          {
            body: { clientId }
          }
        );

        if (error) {
          console.error("[Callback] Error:", error);
          return;
        }

        console.log("[Callback] Response:", data);

        if (data.success) {
          clearInterval(pollInterval);
          
          if (data.verified) {
            setTransactionId(data.transactionId);
            setStatus("success");
            toast.success("Verification complete!");
            
            // Continue to post-KYC facial verification
            setTimeout(() => {
              navigate("/complycube-facial-verification");
            }, 2000);
          } else {
            setStatus("failed");
            toast.error("Verification failed");
          }
        } else if (data.status === "processing") {
          // Still processing, continue polling
          console.log("[Callback] Still processing...");
        }
        
      } catch (error) {
        console.error("[Callback] Polling error:", error);
      }
      
      // Stop polling after max attempts
      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        setStatus("failed");
        toast.error("Verification timeout");
      }
    }, 5000); // Poll every 5 seconds

    // Cleanup on unmount
    return () => clearInterval(pollInterval);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        {status === "processing" && (
          <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Processing Verification</h2>
            <p className="text-muted-foreground">
              Please wait while we retrieve your verification results...
            </p>
            <p className="text-sm text-muted-foreground">
              Attempt {attempts}/{maxAttempts}
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-green-500">Verification Complete!</h2>
            <p className="text-muted-foreground">
              Your identity has been verified successfully.
            </p>
            {transactionId && (
              <p className="text-sm text-muted-foreground">
                Transaction ID: {transactionId}
              </p>
            )}
            <p className="text-sm">Continuing to facial confirmation...</p>
          </div>
        )}

        {status === "failed" && (
          <div className="text-center space-y-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-red-500">Verification Failed</h2>
            <p className="text-muted-foreground">
              We couldn't complete your identity verification.
            </p>
            <div className="space-y-2">
              <Button onClick={() => navigate("/verification-transition")} className="w-full">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Return Home
              </Button>
            </div>
          </div>
        )}

        {status === "cancelled" && (
          <div className="text-center space-y-4">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
            <h2 className="text-2xl font-bold">Verification Cancelled</h2>
            <p className="text-muted-foreground">
              You cancelled the verification process.
            </p>
            <div className="space-y-2">
              <Button onClick={() => navigate("/verification-transition")} className="w-full">
                Start Over
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Return Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
