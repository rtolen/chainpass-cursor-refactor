import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sessionManager } from "@/utils/sessionManager";

interface FacialRecognitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerificationSuccess: () => void;
}

type RecognitionState = "camera" | "processing" | "success" | "failed";

export default function FacialRecognitionModal({
  open,
  onOpenChange,
  onVerificationSuccess,
}: FacialRecognitionModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<RecognitionState>("camera");
  const [confidence, setConfidence] = useState<number>(0);
  const [attempts, setAttempts] = useState(0);
  const [analysis, setAnalysis] = useState<string>("");
  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    if (open) {
      startCamera();
    }
    return () => {
      // Cleanup camera when modal closes
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [open]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setState("camera");
      }
    } catch (error) {
      toast.error("Camera access denied. Please enable camera permissions.");
      console.error("[Camera] Error:", error);
    }
  };

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setState("processing");

    // Capture frame
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.95);

    // Get ComplyCube live photo URL from session
    const sessionId = sessionManager.getSessionId();
    
    try {
      // Get verification record
      const { data: verificationData, error: fetchError } = await supabase
        .from("verification_records")
        .select("selfie_url, complycube_client_id")
        .eq("session_id", sessionId)
        .single();

      if (fetchError || !verificationData?.selfie_url) {
        throw new Error("Verification data not found. Please complete ID upload first.");
      }

      console.log("[Verification] Comparing against:", verificationData.selfie_url);

      // Call edge function to compare
      const { data, error } = await supabase.functions.invoke("verify-complycube-biometric", {
        body: {
          referencePhotoUrl: verificationData.selfie_url,
          currentFaceImage: imageData,
        },
      });

      if (error) throw error;

      console.log("[Verification] Result:", data);

      if (data.verified) {
        setConfidence(data.confidence);
        setAnalysis(data.analysis);
        setState("success");
        
        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        toast.success("Identity confirmed!");
        
        // Call success callback after short delay
        setTimeout(() => {
          onVerificationSuccess();
          onOpenChange(false);
        }, 2000);
      } else {
        setAttempts(attempts + 1);
        setConfidence(data.confidence || 0);
        setAnalysis(data.analysis || "Faces do not match");
        
        if (attempts + 1 >= MAX_ATTEMPTS) {
          setState("failed");
          toast.error("Maximum attempts exceeded. Your verification will be manually reviewed.");
          
          // Stop camera
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
        } else {
          setState("camera");
          toast.error(`Verification failed. ${MAX_ATTEMPTS - (attempts + 1)} attempts remaining.`);
        }
      }
    } catch (error: any) {
      console.error("[Verification] Error:", error);
      toast.error(error.message || "Verification failed");
      setState("camera");
    }
  };

  const handleRetry = () => {
    setAttempts(0);
    setConfidence(0);
    setAnalysis("");
    startCamera();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Facial Recognition Verification
          </DialogTitle>
        </DialogHeader>

        {/* Skip Link */}
        <div className="text-center">
          <button
            onClick={() => {
              toast.success("Verification skipped");
              onVerificationSuccess();
              onOpenChange(false);
            }}
            className="text-sm text-muted-foreground hover:text-primary underline"
          >
            Skip facial verification (testing)
          </button>
        </div>

        <div className="space-y-4">
          {/* Camera View */}
          {state === "camera" && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-4 border-primary/30 rounded-lg pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-primary rounded-full pointer-events-none" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Position your face in the oval and look directly at the camera
                </p>
                <p className="text-xs text-muted-foreground">
                  Attempt {attempts + 1} of {MAX_ATTEMPTS}
                </p>
              </div>
              <Button
                onClick={captureAndVerify}
                className="w-full"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Capture & Verify
              </Button>
            </div>
          )}

          {/* Processing State */}
          {state === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-lg font-medium">Verifying your identity...</p>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          )}

          {/* Success State */}
          {state === "success" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-lg font-medium">Identity Verified!</p>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Confidence: {confidence.toFixed(1)}%
                </p>
                {analysis && (
                  <p className="text-xs text-muted-foreground max-w-md">
                    {analysis}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Failed State */}
          {state === "failed" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertTriangle className="h-16 w-16 text-destructive" />
              <p className="text-lg font-medium">Verification Failed</p>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Maximum attempts reached. Your case will be manually reviewed.
                </p>
                {confidence > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Last confidence: {confidence.toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                >
                  Close
                </Button>
                <Button onClick={handleRetry}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
