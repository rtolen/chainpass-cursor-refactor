import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVAIStore } from "@/store/vaiStore";
import { toast } from "sonner";

interface FacialVerificationProps {
  vaiNumber: string;
  contractType: string;
  onVerificationSuccess: (confidence: number) => void;
  onVerificationFailed: () => void;
}

export function FacialVerification({
  vaiNumber,
  contractType,
  onVerificationSuccess,
  onVerificationFailed,
}: FacialVerificationProps) {
  const { vaiNumber: storeVAI } = useVAIStore();
  const resolvedVaiNumber = vaiNumber || storeVAI;
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [attempts, setAttempts] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
        setStream(mediaStream);
        setIsCapturing(true);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Unable to access camera. Please enable camera permissions in your settings.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedImage(imageData);
    stopCamera();
  }, [stopCamera]);

  const verifyFace = async () => {
    if (!capturedImage) {
      toast.error("Please capture your photo first");
      return;
    }

    if (attempts >= 3) {
      toast.error("Maximum attempts reached. Please try again in 5 minutes.");
      onVerificationFailed();
      return;
    }

    setIsVerifying(true);
    setAttempts((prev) => prev + 1);

    try {
      // Generate device fingerprint (simple version)
      const deviceFingerprint = btoa(
        `${navigator.userAgent}-${screen.width}x${screen.height}-${navigator.language}`
      );

      let referencePhotoUrl = "stored_photo_url";

      if (resolvedVaiNumber) {
        try {
          const { data: verificationRecord, error: fetchError } = await supabase
            .from('verification_records')
            .select('selfie_url')
            .eq('vai_number', resolvedVaiNumber)
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

      const { data, error } = await supabase.functions.invoke("verify-facial-signature", {
        body: {
          vaiNumber: resolvedVaiNumber,
          liveFaceImage: capturedImage,
          contractType,
          deviceFingerprint,
          referencePhotoUrl,
        },
      });

      if (error) throw error;

      if (data.match) {
        toast.success("Identity verified successfully!");
        onVerificationSuccess(data.confidence);
      } else {
        toast.error(data.message || "Identity verification failed. Please try again.");
        setCapturedImage(null);
        
        if (attempts >= 2) {
          toast.error("Maximum attempts reached. Please try again in 5 minutes.");
          onVerificationFailed();
        }
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed. Please try again.");
      setCapturedImage(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <Card className="w-full p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-primary mb-2">Verify Your Identity</h3>
          <p className="text-muted-foreground">
            Take a live photo to confirm your identity before signing
          </p>
        </div>

        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {!isCapturing && !capturedImage && (
            <div className="text-center space-y-4">
              <Camera className="w-16 h-16 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Camera will appear here</p>
            </div>
          )}

          {isCapturing && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-4 border-primary rounded-full opacity-50" />
              </div>
            </>
          )}

          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured face"
              className="w-full h-full object-cover"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="space-y-4">
          {!isCapturing && !capturedImage && (
            <div className="space-y-3">
              <Button
                onClick={startCamera}
                size="lg"
                className="w-full h-16 text-lg font-semibold"
                disabled={attempts >= 3}
              >
                <Camera className="w-6 h-6 mr-3" />
                Start Facial Recognition
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Click to begin identity verification
              </p>
              
              {/* Skip Link */}
              <div className="text-center">
                <button
                  onClick={() => {
                    toast.success("Verification bypassed");
                    onVerificationSuccess(95);
                  }}
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  Skip facial verification (testing)
                </button>
              </div>
            </div>
          )}

          {isCapturing && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium">
                  📸 Center your face in the circle
                </p>
                <ul className="text-xs text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                  <li>Face the camera directly</li>
                  <li>Ensure good lighting</li>
                  <li>Remove glasses if possible</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button onClick={stopCamera} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={capturePhoto} className="flex-1">
                  <Camera className="w-5 h-5 mr-2" />
                  Capture Photo
                </Button>
              </div>
            </div>
          )}

          {capturedImage && !isVerifying && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button onClick={retakePhoto} variant="outline" className="flex-1">
                  Retake Photo
                </Button>
                <Button
                  onClick={verifyFace}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={attempts >= 3}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Verify Identity
                </Button>
              </div>

              {attempts > 0 && attempts < 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  Attempt {attempts} of 3
                </p>
              )}
            </div>
          )}

          {isVerifying && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 border-4 border-primary/20 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-foreground animate-pulse">
                  Verifying identity...
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Comparing your live photo with verified records
                </p>
              </div>
            </div>
          )}
        </div>

        {attempts >= 3 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Maximum attempts reached</p>
                <p className="text-xs text-red-800 mt-1">
                  Please try again in 5 minutes or contact support if you continue to experience issues.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}