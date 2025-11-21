import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVAIStore } from "@/store/vaiStore";

interface LeoFacialVerificationProps {
  onVerificationSuccess: () => void;
}

export function LeoFacialVerification({ onVerificationSuccess }: LeoFacialVerificationProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<"idle" | "searching" | "analyzing" | "verified" | "failed">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { vaiNumber } = useVAIStore();

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
        setIsCapturing(true);
        setStatus("searching");
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
    setIsCapturing(false);
  }, []);

  const captureAndVerify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isVerifying) return;
    if (attempts >= 3) {
      toast.error("Maximum attempts reached. Please try again later.");
      setStatus("failed");
      return;
    }

    setIsVerifying(true);
    setStatus("analyzing");
    setAttempts((prev) => prev + 1);

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

      if (vaiNumber) {
        try {
          const { data: verificationRecord, error: fetchError } = await supabase
            .from('verification_records')
            .select('selfie_url')
            .eq('vai_number', vaiNumber)
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
        setStatus("verified");
        setIsVerified(true);
        stopCamera();
        toast.success("Identity confirmed!");
        setTimeout(() => {
          onVerificationSuccess();
        }, 500);
      } else {
        setStatus("searching");
        toast.error("Face not matched. Please adjust your position and try again.");
        
        if (attempts >= 2) {
          setStatus("failed");
          stopCamera();
        }
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed. Please try again.");
      setStatus("searching");
    } finally {
      setIsVerifying(false);
    }
  }, [attempts, isVerifying, onVerificationSuccess, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const getStatusText = () => {
    switch (status) {
      case "searching":
        return "Searching for match...";
      case "analyzing":
        return "Analyzing...";
      case "verified":
        return "✓ Identity Confirmed";
      case "failed":
        return "Verification failed. Please contact support.";
      default:
        return "Position your face in the frame";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "verified":
        return "text-green-400";
      case "failed":
        return "text-red-400";
      case "analyzing":
        return "text-blue-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Camera Feed Card */}
      <div className="relative">
        <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-600/30 to-blue-500/30 rounded-xl blur-sm"></div>
        <div className="relative bg-[#1F2937]/80 backdrop-blur-lg rounded-xl p-8">
          
          {/* Instructions */}
          {!isCapturing && !isVerified && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-purple-600/20 flex items-center justify-center">
                <Camera className="w-10 h-10 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Facial Verification Required</h3>
                <p className="text-gray-300 mb-1">Position your face in the frame and look directly at the camera</p>
                <p className="text-sm text-gray-400">We're comparing your live photo to your verified identity from ComplyCube</p>
              </div>
              <Button
                onClick={startCamera}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-6 text-lg"
              >
                Start Verification
              </Button>
            </div>
          )}

          {/* Live Camera Feed */}
          {isCapturing && !isVerified && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {/* Video Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Oval Face Guide Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-80">
                    {/* Oval border */}
                    <div className={`absolute inset-0 rounded-full border-4 transition-colors ${
                      status === "verified" ? "border-green-400" : 
                      status === "analyzing" ? "border-blue-400 animate-pulse" : 
                      "border-purple-400"
                    }`} style={{ borderRadius: "50% / 60%" }}></div>
                    
                    {/* Corner guides */}
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-purple-400 rounded-tl-3xl"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-purple-400 rounded-tr-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-purple-400 rounded-bl-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-purple-400 rounded-br-3xl"></div>
                  </div>
                </div>

                {/* Hidden canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Status and Controls */}
              <div className="space-y-4">
                {/* Status Text */}
                <div className="flex items-center justify-center gap-2">
                  {isVerifying && <Loader2 className="w-5 h-5 animate-spin text-blue-400" />}
                  {status === "verified" && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                  {status === "failed" && <AlertCircle className="w-5 h-5 text-red-400" />}
                  <p className={`text-base font-medium ${getStatusColor()}`}>
                    {getStatusText()}
                  </p>
                </div>

                {/* Attempt Counter */}
                <p className="text-center text-sm text-gray-400">
                  Attempt {attempts} of 3
                </p>

                {/* Verify Button */}
                <Button
                  onClick={captureAndVerify}
                  disabled={isVerifying || attempts >= 3}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Identity"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Verified State */}
          {isVerified && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-400 mb-2">✓ Identity Confirmed</h3>
                <p className="text-gray-300">You may proceed with your declaration</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
