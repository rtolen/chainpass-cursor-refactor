import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sessionManager } from "@/utils/sessionManager";

export default function FinalVerification() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isLEO, setIsLEO] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState("");

  useEffect(() => {
    const initializePage = async () => {
      // Load user data
      const email = sessionStorage.getItem('user_email');
      const leoStatus = sessionStorage.getItem('userType') === 'leo';
      setUserEmail(email || "");
      setIsLEO(leoStatus);

      // Verify all previous steps completed
      const leAccepted = sessionStorage.getItem('le_disclosure_accepted');
      const termsAccepted = sessionStorage.getItem('terms_accepted');
      const consentAccepted = sessionStorage.getItem('mutual_consent_accepted');

      if (!leAccepted || !termsAccepted || !consentAccepted) {
        toast({
          title: "Incomplete Verification",
          description: "Please complete contract signature first",
          variant: "destructive"
        });
        navigate("/contract-signature");
        return;
      }

      // Load selfie URL from verification record
      const sessionId = sessionManager.getSessionId();
      const { data: verificationData, error } = await supabase
        .from("verification_records")
        .select("selfie_url, verification_status")
        .eq("session_id", sessionId)
        .single();

      if (error || !verificationData?.selfie_url) {
        toast({
          title: "Error",
          description: "Could not load verification data. Please try again.",
          variant: "destructive"
        });
        navigate("/verification-transition");
        return;
      }

      if (verificationData.verification_status !== "verified") {
        toast({
          title: "Verification Required",
          description: "Please complete identity verification first",
          variant: "destructive"
        });
        navigate("/verification-transition");
        return;
      }

      setSelfieUrl(verificationData.selfie_url);
    };

    initializePage();

    // Cleanup camera on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [navigate, toast]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        toast({
          title: "Camera Ready",
          description: "Position your face in the circle",
        });
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera Error",
        description: "Please enable camera permissions in your browser settings",
        variant: "destructive"
      });
    }
  };

  const captureFinalSelfie = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: "Error",
        description: "Camera not ready",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Capture image from video
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) throw new Error("Canvas context not available");
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL("image/jpeg", 0.95);

      // Verify we have reference photo
      if (!selfieUrl) {
        throw new Error("Reference photo not found");
      }

      console.log("Comparing faces for final verification...");

      // Compare faces using edge function
      const { data, error } = await supabase.functions.invoke("verify-complycube-biometric", {
        body: {
          referencePhotoUrl: selfieUrl,
          currentFaceImage: imageData
        }
      });

      if (error) {
        console.error("Verification error:", error);
        throw error;
      }

      console.log("Verification result:", data);

      if (data.verified && data.confidence >= 60) {
        setVerificationComplete(true);
        
        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setCameraActive(false);
        
        toast({
          title: "Verification Complete!",
          description: `Identity confirmed with ${Math.round(data.confidence)}% confidence`,
        });
      } else {
        toast({
          title: "Verification Failed",
          description: `Face doesn't match (${Math.round(data.confidence || 0)}% confidence). Please try again with better lighting.`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Final verification error:", error);
      toast({
        title: "Verification Error",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const proceedToVAIGeneration = async () => {
    if (!verificationComplete) {
      toast({
        title: "Verification Required",
        description: "Please complete final face verification",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update verification record with all completion flags
      const sessionId = sessionManager.getSessionId();
      
      const { error: updateError } = await supabase
        .from('verification_records')
        .update({
          final_verification_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (updateError) {
        console.error("Error updating verification:", updateError);
        throw updateError;
      }

      toast({
        title: "All Set!",
        description: "Generating your V.A.I. code...",
      });

      // Navigate to V.A.I. processing
      setTimeout(() => navigate("/vai-processing"), 1000);
      
    } catch (error: any) {
      console.error("Error completing verification:", error);
      toast({
        title: "Error",
        description: "Failed to complete verification. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 border border-indigo-100">
        
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Step 6 of 7</span>
            <span className="text-sm font-semibold text-indigo-600">Final Verification</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: '85.7%' }}
            />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Final Verification
          </h1>
          <p className="text-gray-600 text-lg">
            One last identity check before generating your V.A.I.
          </p>
        </div>

        {/* Completed Checklist */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Completed Steps
          </h2>
          <div className="space-y-3">
            <div className="flex items-center text-green-700">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">Identity Verified (ComplyCube KYC)</span>
            </div>
            <div className="flex items-center text-green-700">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">Biometric Match Confirmed</span>
            </div>
            <div className="flex items-center text-green-700">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">Law Enforcement Disclosure Signed</span>
            </div>
            <div className="flex items-center text-green-700">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">Terms of Service Accepted</span>
            </div>
            <div className="flex items-center text-green-700">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">Mutual Consent Agreement Signed</span>
            </div>
          </div>
        </div>

        {/* User Information Review */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h2>
          <div className="space-y-2 text-gray-700">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="font-medium">Email:</span>
              <span className="text-gray-600">{userEmail || "Not provided"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="font-medium">V.A.I. Type:</span>
              <span className={`font-semibold ${isLEO ? "text-amber-600" : "text-indigo-600"}`}>
                {isLEO ? "Law Enforcement" : "Civilian"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium">Verification Date:</span>
              <span className="text-gray-600">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Final Face Capture Section */}
        <div className="border-2 border-indigo-200 rounded-xl p-6 mb-6 bg-gradient-to-br from-indigo-50 to-purple-50">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Camera className="w-5 h-5 mr-2 text-indigo-600" />
            Final Identity Confirmation
          </h2>
          <p className="text-gray-600 mb-4">
            Take one final selfie to confirm your identity before V.A.I. generation.
          </p>

          {/* Camera Not Started */}
          {!cameraActive && !verificationComplete && (
            <Button 
              onClick={startCamera}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              size="lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              Start Camera
            </Button>
          )}

          {/* Camera Active */}
          {cameraActive && !verificationComplete && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Face Guide Overlay */}
                <div 
                  className="absolute border-4 border-indigo-500 rounded-full"
                  style={{
                    width: '240px',
                    height: '240px',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                  }}
                />
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="bg-black bg-opacity-75 text-white px-4 py-2 rounded-full text-sm">
                    Position your face in the circle
                  </span>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <Button 
                onClick={captureFinalSelfie}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Capture & Verify
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Verification Complete */}
          {verificationComplete && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-3" />
              <p className="text-green-900 font-bold text-xl mb-1">Identity Confirmed!</p>
              <p className="text-green-700">You're ready to generate your V.A.I. code</p>
            </div>
          )}
        </div>

        {/* Warning if not verified */}
        {!verificationComplete && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Final Verification Required</p>
              <p>You must complete the final face scan before proceeding to V.A.I. generation.</p>
            </div>
          </div>
        )}

        {/* Proceed Button */}
        <Button
          onClick={proceedToVAIGeneration}
          disabled={!verificationComplete}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500"
          size="lg"
        >
          {verificationComplete ? (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Generate My V.A.I.
            </>
          ) : (
            "Complete Verification First"
          )}
        </Button>
      </div>
    </div>
  );
}
