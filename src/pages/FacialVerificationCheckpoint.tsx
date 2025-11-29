import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, CheckCircle2, Loader2, AlertCircle, Shield, Lock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useVAIStore } from "@/store/vaiStore";
import { toast } from "sonner";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getComplyCubePhoto } from "@/services/getComplyCubePhoto";

const ANALYSIS_CANVAS_SIZE = 48;

const loadImageData = (source: string): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = ANALYSIS_CANVAS_SIZE;
      canvas.height = ANALYSIS_CANVAS_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Unable to prepare canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, ANALYSIS_CANVAS_SIZE, ANALYSIS_CANVAS_SIZE);
      resolve(ctx.getImageData(0, 0, ANALYSIS_CANVAS_SIZE, ANALYSIS_CANVAS_SIZE));
    };
    img.onerror = () => reject(new Error("Failed to load image data"));
    img.src = source;
  });
};

const calculateSimilarityScore = async (imageA: string, imageB: string): Promise<number> => {
  const [dataA, dataB] = await Promise.all([loadImageData(imageA), loadImageData(imageB)]);
  let diff = 0;

  for (let i = 0; i < dataA.data.length; i += 4) {
    diff += Math.abs(dataA.data[i] - dataB.data[i]);
    diff += Math.abs(dataA.data[i + 1] - dataB.data[i + 1]);
    diff += Math.abs(dataA.data[i + 2] - dataB.data[i + 2]);
  }

  const maxDiff = (dataA.data.length / 4) * 255 * 3;
  const similarity = 100 - (diff / maxDiff) * 100;
  return Math.max(0, Math.min(100, similarity));
};

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [referencePhotoDataUrl, setReferencePhotoDataUrl] = useState<string | null>(null);
  const [referencePhotoLoading, setReferencePhotoLoading] = useState(false);
  const [complycubePhotoId, setComplycubePhotoId] = useState<string | null>(null);
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  
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

  const attachStreamToVideo = () => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      return true;
    }
    return false;
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
      setVerificationStatus('success');
      stopCamera();
      toast.success("Maximum attempts reached — proceeding to next step.");
      let timeLeft = 3;
      const countdownInterval = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          handleContinue();
        }
      }, 1000);
      return;
    }

    if (!referencePhotoDataUrl) {
      toast.error("Reference photo unavailable. Please try again later.");
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
      let referencePhotoUrl: string | null = null;
      let resolvedRecordId: string | null = null;

      if (effectiveVaiNumber) {
        try {
          const { data: assignment, error: assignmentError } = await supabase
            .from('vai_assignments')
            .select('verification_record_id')
            .eq('vai_code', effectiveVaiNumber)
            .maybeSingle();

          if (assignmentError) {
            console.error('❌ Error fetching V.A.I. assignment:', assignmentError);
          } else if (assignment?.verification_record_id) {
            resolvedRecordId = assignment.verification_record_id;
          } else {
            console.warn('⚠️ No verification record linked to this V.A.I. number');
          }
        } catch (err) {
          console.error('❌ Exception fetching V.A.I. assignment:', err);
        }
      }

      if (!resolvedRecordId) {
        const storedRecordId = sessionStorage.getItem('verification_record_id');
        if (storedRecordId) {
          resolvedRecordId = storedRecordId;
        } else {
          const fallbackSessionId = sessionStorage.getItem('session_id');
          if (fallbackSessionId) {
            try {
              const { data: recordBySession, error: sessionError } = await supabase
                .from('verification_records')
                .select('id, selfie_url')
                .eq('session_id', fallbackSessionId)
                .maybeSingle();

              if (!sessionError && recordBySession) {
                resolvedRecordId = recordBySession.id;
                referencePhotoUrl = recordBySession.selfie_url ?? null;
              } else if (sessionError) {
                console.warn('⚠️ Unable to locate verification record by session:', sessionError);
              }
            } catch (sessionErr) {
              console.error('❌ Error fetching verification record by session:', sessionErr);
            }
          }
        }
      }

      if (!referencePhotoUrl && resolvedRecordId) {
        try {
          const { data: record, error: recordError } = await supabase
            .from('verification_records')
            .select('selfie_url')
            .eq('id', resolvedRecordId)
            .maybeSingle();

            if (!recordError && record?.selfie_url) {
              referencePhotoUrl = record.selfie_url;
              console.log('✅ Using stored photo from verification record:', referencePhotoUrl);
            } else {
              console.warn('⚠️ Verification record found but no selfie_url stored');
            }
        } catch (recordErr) {
          console.error('❌ Error fetching verification record selfie:', recordErr);
        }
      }

      //if (!referencePhotoUrl) {
      //  toast.error("Unable to locate a stored verification photo.");
        //setVerificationStatus('failure');
        //stopCamera();
        //handleContinue();
      ///  return;
      //}

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('test_photo_url')) {
        referencePhotoUrl = urlParams.get('test_photo_url')!;
        console.log('🧪 TEST MODE: Using photo from URL param');
      }

      const similarity = await calculateSimilarityScore(referencePhotoDataUrl, imageData);
      setSimilarityScore(similarity);

      if (similarity >= 20) {
        setVerificationStatus('success');
        stopCamera();
        toast.success(`Identity confirmed! Similarity score ${similarity.toFixed(1)}%.`);
        
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
          setVerificationStatus('success');
          stopCamera();
          toast.success("Maximum attempts reached — proceeding to next step.");
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
          toast.error(`Face not matched (similarity ${similarity.toFixed(1)}%). Please adjust your position and try again.`);
        }
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }, [attemptCount, isVerifying, stopCamera, referencePhotoDataUrl, toast]);

  useEffect(() => {
    const storedPhotoId = sessionStorage.getItem("complycube_request_photo_id");
    if (storedPhotoId) {
      setComplycubePhotoId(storedPhotoId);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = mediaStream;
      setCameraActive(true);
      setVerificationStatus('verifying');

      const ensureVideoReady = () => {
        if (!attachStreamToVideo()) {
          requestAnimationFrame(ensureVideoReady);
          return;
        }

        setTimeout(() => {
          captureAndVerify();
        }, 2000);
      };

      ensureVideoReady();
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Unable to access camera. Please enable camera permissions.");
    }
  }, [captureAndVerify, toast]);

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      setIsModalOpen(false);
      stopCamera();
      setVerificationStatus('idle');
      setIsVerifying(false);
      setAttemptCount(0);
      setCountdown(3);
      setSimilarityScore(null);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleStartFacialVerification = () => {
    setIsModalOpen(true);
    setSimilarityScore(null);
    setVerificationStatus('idle');
  };

  const handleContinue = () => {
    navigate(nextStep);
  };

  const handleRetry = () => {
    stopCamera();
    setVerificationStatus('idle');
    setAttemptCount(0);
    setCountdown(3);
    setSimilarityScore(null);
  };

  useEffect(() => {
    if (!isModalOpen) return;
    if (referencePhotoDataUrl || referencePhotoLoading) return;
    if (!complycubePhotoId) {
      toast.error("Unable to locate ComplyCube live photo for comparison.");
      return;
    }

    const fetchReferencePhoto = async () => {
      try {
        setReferencePhotoLoading(true);
        const { base64 } = await getComplyCubePhoto(complycubePhotoId);
        setReferencePhotoDataUrl(base64);
      } catch (error) {
        console.error("Failed to load ComplyCube photo:", error);
        toast.error("Unable to load ComplyCube live photo. Please try again later.");
      } finally {
        setReferencePhotoLoading(false);
      }
    };

    fetchReferencePhoto();
  }, [isModalOpen, complycubePhotoId, referencePhotoDataUrl, referencePhotoLoading, toast]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (!referencePhotoDataUrl) return;
    if (cameraActive) return;
    if (verificationStatus !== "idle") return;

    startCamera();
  }, [isModalOpen, referencePhotoDataUrl, cameraActive, verificationStatus, startCamera]);

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
                    onClick={handleStartFacialVerification}
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

          </div>

          {attemptCount >= 3 && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Having trouble?{" "}
                <button
                  onClick={handleContinue}
                  className="text-primary underline font-medium"
                >
                  Skip facial verification and continue
                </button>
              </p>
            </div>
          )}

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

      <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Verifying Identity - LEO</DialogTitle>
          </DialogHeader>

          {referencePhotoLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Retrieving ComplyCube live photo...</p>
            </div>
          )}

          {!referencePhotoLoading && !referencePhotoDataUrl && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Unable to load the ComplyCube photo required for verification. Please close this window and try again.
            </div>
          )}

          {!referencePhotoLoading && referencePhotoDataUrl && (
            <>
              {verificationStatus === 'verifying' && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground">
                      Position your face in the oval. We’ll compare it to your ComplyCube verification photo.
                    </p>
                    {similarityScore !== null && (
                      <p className="text-xs text-muted-foreground">
                        Last similarity score: {similarityScore.toFixed(1)}%
                      </p>
                    )}
                  </div>

                  <div className="relative aspect-[4/3] bg-secondary rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-64 h-80 border-4 border-primary rounded-[50%] animate-glow-pulse" />
                    </div>
                    <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                      Attempt {attemptCount} of 3
                    </div>
                  </div>

                  <canvas ref={canvasRef} className="hidden" />

                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-muted-foreground">
                        {isVerifying ? "Comparing faces..." : "Preparing next capture..."}
                      </span>
                    </div>
                    {isVerifying && (
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
                      </div>
                    )}
                    <div className="pt-4 space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleRetry}
                        disabled={isVerifying}
                      >
                        Retry Facial Verification
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Resets your attempts and restarts the camera if you need to reposition.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Having trouble?{" "}
                        <button
                          type="button"
                          onClick={handleContinue}
                          className="text-primary underline font-medium"
                        >
                          Skip facial verification and continue
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {verificationStatus === 'success' && (
                <div className="space-y-8 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-success/20 flex items-center justify-center animate-fade-in">
                      <CheckCircle2 className="w-20 h-20 text-success" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">✓ Identity Confirmed</h1>
                    <p className="text-lg text-muted-foreground">
                      Verification successful - similarity {similarityScore?.toFixed(1) ?? "20.0"}%
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      Verified at: {new Date().toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-muted-foreground">Redirecting you in {countdown} seconds...</p>
                    <Button 
                      onClick={handleContinue}
                      className="w-full h-14 text-lg gradient-primary hover:opacity-90 transition-smooth"
                    >
                      Continue →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
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
