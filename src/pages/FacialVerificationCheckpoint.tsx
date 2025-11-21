import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, CheckCircle2, Loader2, AlertCircle, Shield, Lock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useVAIStore } from "@/store/vaiStore";
import { toast } from "sonner";
import { ProgressIndicator } from "@/components/ProgressIndicator";

interface VerificationContext {
  context: "leo-declaration" | "legal-agreements" | "contract-signature";
  vaiNumber?: string;
  nextStep: string;
}

export default function FacialVerificationCheckpoint() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get context from URL params or default
  const context = (searchParams.get("context") || "leo-declaration") as VerificationContext["context"];
  const queryVaiNumber = searchParams.get("vaiNumber") || "3NJG3XR";
  const nextStep = searchParams.get("nextStep") || getDefaultNextStep(context);

  const [cameraActive, setCameraActive] = useState(false);
  const { vaiNumber: storeVAI } = useVAIStore();
  const effectiveVaiNumber = queryVaiNumber || storeVAI;
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failure'>('idle');
  const [attemptCount, setAttemptCount] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get context-specific messaging
  const getContextMessage = () => {
    switch (context) {
      case "leo-declaration":
        return "Confirming your law enforcement status declaration";
      case "legal-agreements":
        return "Confirming your signature agreement completion";
      case "contract-signature":
        return "Final identity confirmation before V.A.I. activation";
      default:
        return "We need to confirm your identity before proceeding to the next step";
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        streamRef.current = mediaStream;
        setCameraActive(true);
        setVerificationStatus('verifying');
        
        // Auto-capture after 2 seconds
        setTimeout(() => {
          captureAndVerify();
        }, 2000);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Unable to access camera. Please enable camera permissions.");
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const captureAndVerify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isVerifying) return;
    if (attemptCount >= 3) {
      setVerificationStatus('failure');
      stopCamera();
      return;
    }

    setIsVerifying(true);
    setAttemptCount((prev) => prev + 1);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL("image/jpeg", 0.95);

      // Call verification function
      let referencePhotoUrl = "stored_photo_url";

      if (effectiveVaiNumber) {
        try {
          const { data: verificationRecord, error: fetchError } = await supabase
            .from('verification_records')
            .select('selfie_url')
            .eq('vai_number', effectiveVaiNumber)
            .single();

          if (!fetchError && verificationRecord?.selfie_url) {
            referencePhotoUrl = verificationRecord.selfie_url;
            console.log('✅ Using stored photo from database:', referencePhotoUrl);
          } else {
            console.warn('⚠️ Could not fetch stored photo, using fallback');
          }
        } catch (err) {
          console.error('❌ Error fetching stored photo:', err);
        }
      } else {
        console.warn('⚠️ No V.A.I. number found, using placeholder photo');
      }

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('test_photo_url')) {
        referencePhotoUrl = urlParams.get('test_photo_url')!;
        console.log('🧪 TEST MODE: Using photo from URL param');
      }

      const { data, error } = await supabase.functions.invoke("verify-complycube-biometric", {
        body: {
          referencePhotoUrl,
          currentFaceImage: imageData,
        },
      });

      if (error) throw error;

      if (data.verified && data.confidence >= 60) {
        setVerificationStatus('success');
        stopCamera();
        toast.success("Identity confirmed!");
        
        // Start countdown
        let timeLeft = 3;
        const countdownInterval = setInterval(() => {
          timeLeft -= 1;
          setCountdown(timeLeft);
          if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            handleContinue();
          }
        }, 1000);
      } else {
        if (attemptCount >= 2) {
          setVerificationStatus('failure');
          stopCamera();
          toast.error("Maximum attempts reached. Please try again later.");
        } else {
          toast.error("Face not matched. Please adjust your position and try again.");
        }
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }, [attemptCount, isVerifying, stopCamera]);

  const handleContinue = () => {
    navigate(nextStep);
  };

  const handleRetry = () => {
    setVerificationStatus('idle');
    setAttemptCount(0);
    setCountdown(3);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-[#1E293B] flex flex-col">
      {/* Header */}
      <header className="p-6 flex flex-col items-center space-y-4">
        <img src="/lovable-uploads/vairify-logo.svg" alt="ChainPass" className="h-12" />
        <ProgressIndicator currentStep={4} totalSteps={5} />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Main Card */}
          <div className="glass rounded-lg p-8 md:p-12 shadow-card animate-slide-up">
            
            {/* IDLE STATE */}
            {verificationStatus === 'idle' && (
              <div className="space-y-8">
                {/* Section 1: Context/Purpose */}
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/20 mb-4">
                    <Shield className="w-10 h-10 text-accent" />
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    Identity Verification Required
                  </h1>
                  
                  <p className="text-lg text-muted-foreground">
                    {getContextMessage()}
                  </p>
                  
                  <p className="text-sm text-muted-foreground">
                    This ensures the same person is completing all agreements and declarations
                  </p>
                  
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start space-x-3 text-left">
                    <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      Your verification photo is captured as proof of completion and timestamped for security
                    </p>
                  </div>
                </div>

                {/* Section 2: Instructions */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground text-center">
                    Position Your Face
                  </h2>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                        1
                      </div>
                      <p className="text-muted-foreground">Center your face in the frame</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                        2
                      </div>
                      <p className="text-muted-foreground">Look directly at the camera</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                        3
                      </div>
                      <p className="text-muted-foreground">Wait for automatic verification</p>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Requirements:</p>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                        Good lighting required
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                        Remove sunglasses if wearing any
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                        Face must be clearly visible
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Camera Interface - Initial State */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-8">
                    <div className="w-32 h-32 rounded-full gradient-primary flex items-center justify-center">
                      <Camera className="w-16 h-16 text-primary-foreground" />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={startCamera}
                    className="w-full h-14 text-lg gradient-primary hover:opacity-90 transition-smooth"
                  >
                    Start Facial Verification
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    This will activate your camera
                  </p>
                </div>
              </div>
            )}

            {/* VERIFYING STATE */}
            {verificationStatus === 'verifying' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Verifying Identity
                  </h1>
                  <p className="text-muted-foreground">
                    Position your face in the oval
                  </p>
                </div>

                {/* Camera Feed */}
                <div className="relative aspect-[4/3] bg-secondary rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Oval Guide Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-80 border-4 border-primary rounded-[50%] animate-glow-pulse" />
                  </div>
                  
                  {/* Attempt Counter */}
                  <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                    Attempt {attemptCount} of 3
                  </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {/* Status */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">
                      {isVerifying ? "Comparing to verified identity..." : "Searching for match..."}
                    </span>
                  </div>
                  {isVerifying && (
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUCCESS STATE */}
            {verificationStatus === 'success' && (
              <div className="space-y-8 text-center">
                <div className="flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-success/20 flex items-center justify-center animate-fade-in">
                    <CheckCircle2 className="w-20 h-20 text-success" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    ✓ Identity Confirmed
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Verification successful - You may proceed
                  </p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    Verified at: {new Date().toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Redirecting you in {countdown} seconds...
                  </p>
                  
                  <Button 
                    onClick={handleContinue}
                    className="w-full h-14 text-lg gradient-primary hover:opacity-90 transition-smooth"
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            )}

            {/* FAILURE STATE */}
            {verificationStatus === 'failure' && (
              <div className="space-y-8 text-center">
                <div className="flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-destructive/20 flex items-center justify-center animate-fade-in">
                    <XCircle className="w-20 h-20 text-destructive" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    Verification Failed
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    We couldn't match your face to your verified identity
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This could be due to poor lighting or camera positioning
                  </p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 text-left space-y-3">
                  <p className="font-semibold text-foreground flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-amber-500" />
                    Troubleshooting tips:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Ensure you're in a well-lit area</li>
                    <li>• Remove sunglasses or face coverings</li>
                    <li>• Position camera at eye level</li>
                    <li>• Make sure your full face is visible</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleRetry}
                    className="w-full h-14 text-lg gradient-primary hover:opacity-90 transition-smooth"
                  >
                    Try Again
                  </Button>
                  
                  <Button 
                    onClick={() => window.location.href = 'mailto:support@chainpass.vai'}
                    variant="outline"
                    className="w-full h-14 text-lg"
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Having trouble?{' '}
              <a href="mailto:support@chainpass.vai" className="text-primary hover:underline">
                Contact support@chainpass.vai
              </a>
            </p>
            
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
              Facial images are compared to your verified identity and immediately deleted after verification. 
              We never store multiple verification photos.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function getDefaultNextStep(context: VerificationContext["context"]): string {
  switch (context) {
    case "leo-declaration":
      return "/legal-agreements";
    case "legal-agreements":
      return "/contract-signature";
    case "contract-signature":
      return "/vai-success";
    default:
      return "/vai-success";
  }
}
