import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Camera,
  ScanFace,
  AlertTriangle,
  CheckCircle2,
  X,
  HelpCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import { verificationNavigator } from "@/utils/verificationNavigation";
import { supabase } from "@/integrations/supabase/client";

type VerificationState = 
  | "initial" 
  | "camera-active" 
  | "processing" 
  | "success" 
  | "failed" 
  | "error";

type FaceAlignment = "searching" | "too-close" | "too-far" | "off-center" | "aligned";

const FacialVerification = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<VerificationState>("initial");
  const [faceAlignment, setFaceAlignment] = useState<FaceAlignment>("searching");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Simulate face detection and alignment
  useEffect(() => {
    if (state === "camera-active") {
      const interval = setInterval(() => {
        // Simulate face detection logic
        const random = Math.random();
        if (random > 0.8) {
          setFaceAlignment("aligned");
        } else if (random > 0.6) {
          setFaceAlignment("too-close");
        } else if (random > 0.4) {
          setFaceAlignment("too-far");
        } else if (random > 0.2) {
          setFaceAlignment("off-center");
        } else {
          setFaceAlignment("searching");
        }
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [state]);

  // Auto-capture when aligned
  useEffect(() => {
    if (faceAlignment === "aligned" && countdown === null && state === "camera-active") {
      setCountdown(3);
    }
  }, [faceAlignment, countdown, state]);

  // Countdown logic
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      handleCapture();
    }
  }, [countdown]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setState("camera-active");
        setCameraError(null);
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("camera-denied");
      setState("error");
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      // Flash animation
      const flash = document.createElement("div");
      flash.className = "fixed inset-0 bg-white animate-pulse z-50 pointer-events-none";
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 200);

      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setState("processing");
      
      // Get V.A.I. number from session
      const vaiNumber = sessionStorage.getItem('vai_number') || '';
      
      try {
        // Call real facial verification backend
        const { data, error } = await supabase.functions.invoke("verify-vai-facial", {
          body: {
            vaiNumber,
            liveFaceImage: imageData,
          },
        });

        if (error) throw error;

        const verificationConfidence = data.confidence || 0;
        setConfidence(verificationConfidence);
        
        if (data.match) {
          setState("success");
          // Navigate to appropriate success page after 2 seconds
          setTimeout(() => {
            const successPage = verificationNavigator.getSuccessPage();
            navigate(successPage);
          }, 2000);
        } else {
          setState("failed");
          setAttempts(prev => prev + 1);
        }
      } catch (error) {
        console.error("Verification error:", error);
        setState("failed");
        setAttempts(prev => prev + 1);
      }
    }
  };

  const handleRetry = () => {
    setCountdown(null);
    setFaceAlignment("searching");
    setConfidence(null);
    if (attempts < 5) {
      startCamera();
    }
  };

  const getInstructionText = () => {
    if (countdown !== null && countdown > 0) return `Capturing in ${countdown}...`;
    switch (faceAlignment) {
      case "searching": return "Position your face in the oval";
      case "too-close": return "Move back a little";
      case "too-far": return "Move closer";
      case "off-center": return "Center your face";
      case "aligned": return "Good! Hold steady...";
      default: return "Position your face in the oval";
    }
  };

  const getAlignmentColor = () => {
    switch (faceAlignment) {
      case "aligned": return "border-green-500";
      case "searching": return "border-blue-500 animate-pulse";
      default: return "border-yellow-500";
    }
  };

  if (state === "initial") {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white p-4 md:p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div className="text-xs md:text-sm text-muted-foreground">Step 4 of 5</div>
          <img src={chainpassLogo} alt="ChainPass" className="h-6 md:h-8" />
        </div>

        <Progress value={80} className="mb-8" />

        {/* Main Content */}
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative inline-flex items-end justify-center">
                <Shield className="w-16 h-16 md:w-20 md:h-20 text-primary" />
                <ScanFace className="w-8 h-8 md:w-10 md:h-10 text-primary absolute bottom-0 right-0 translate-x-1 translate-y-1" />
              </div>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold">Verify Your Identity to Sign</h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Final step - Confirm you are authorizing this agreement
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              This verification binds your V.A.I. signature to this agreement
            </p>
          </div>

          {/* Explanation Card */}
          <Card className="bg-[#2a2a4a] border-border p-6">
            <div className="flex gap-4">
              <ScanFace className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Why We Need This</h2>
                <p className="text-muted-foreground">
                  Your facial verification creates a legally binding signature. This confirms YOU 
                  (not someone else) are agreeing to the V.A.I. Signature Agreement.
                </p>
              </div>
            </div>
          </Card>

          {/* Important Notice */}
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/50 p-6">
            <div className="flex gap-4">
              <AlertTriangle className="w-8 h-8 text-yellow-500 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold">This verification is legally binding</h3>
                <p className="text-sm">
                  By completing facial recognition, you electronically sign the V.A.I. Signature Agreement
                </p>
              </div>
            </div>
          </Card>

          {/* Buttons */}
          <div className="space-y-3">
            <Button
              onClick={startCamera}
              size="lg"
              className="w-full h-14 text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Camera className="w-6 h-6 mr-2" />
              Start Verification
            </Button>
            
            {/* Demo Skip Button */}
            <Button
              onClick={() => {
                // Skip to success for demo/testing
                setState("success");
                setTimeout(() => {
                  const successPage = verificationNavigator.getSuccessPage();
                  navigate(successPage);
                }, 1500);
              }}
              variant="outline"
              size="lg"
              className="w-full h-12 text-sm"
            >
              Skip Verification (Demo Mode)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "camera-active") {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white relative overflow-hidden">
        {/* Dark vignette overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60 pointer-events-none z-10" />
        
        {/* Video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Instructions */}
        <div className="absolute top-4 md:top-8 left-0 right-0 text-center z-20 px-4">
          <div className="bg-black/50 backdrop-blur-sm inline-block px-4 md:px-6 py-2 md:py-3 rounded-full">
            <p className="text-base md:text-xl font-semibold">{getInstructionText()}</p>
          </div>
        </div>

        {/* Face guide oval */}
        <div className="absolute inset-0 flex items-center justify-center z-20 px-4">
          <div 
            className={`border-4 ${getAlignmentColor()} rounded-[50%] transition-all duration-300 w-full max-w-[300px] aspect-[3/4]`}
          >
            {/* Corner alignment dots */}
            <div className="relative w-full h-full">
              <div className={`absolute top-4 left-4 w-3 h-3 rounded-full ${
                faceAlignment === "aligned" ? "bg-green-500" : 
                faceAlignment === "searching" ? "bg-red-500" : "bg-yellow-500"
              }`} />
              <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                faceAlignment === "aligned" ? "bg-green-500" : 
                faceAlignment === "searching" ? "bg-red-500" : "bg-yellow-500"
              }`} />
              <div className={`absolute bottom-4 left-4 w-3 h-3 rounded-full ${
                faceAlignment === "aligned" ? "bg-green-500" : 
                faceAlignment === "searching" ? "bg-red-500" : "bg-yellow-500"
              }`} />
              <div className={`absolute bottom-4 right-4 w-3 h-3 rounded-full ${
                faceAlignment === "aligned" ? "bg-green-500" : 
                faceAlignment === "searching" ? "bg-red-500" : "bg-yellow-500"
              }`} />
            </div>
          </div>
        </div>

        {/* Countdown overlay */}
        {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="text-9xl font-bold text-white animate-pulse">
              {countdown}
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-4 md:bottom-8 left-0 right-0 flex justify-center gap-4 z-20 px-4">
          <Button
            onClick={handleCapture}
            size="lg"
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white hover:bg-white/90 text-black"
            disabled={faceAlignment !== "aligned"}
          >
            <Camera className="w-6 h-6 md:w-8 md:h-8" />
          </Button>
        </div>
      </div>
    );
  }

  if (state === "processing") {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <div className="relative">
              <ScanFace className="w-24 h-24 text-primary animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              </div>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold">Verifying Identity...</h2>
          <p className="text-muted-foreground">Comparing to your V.A.I. photo...</p>
          
          <Progress value={70} className="w-full" />

          <div className="text-xs text-muted-foreground space-y-1 pt-4">
            <p>Timestamp: {new Date().toLocaleString()}</p>
            <p>Verification ID: VER-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-green-500/20 flex items-center justify-center animate-scale-in">
                <CheckCircle2 className="w-20 h-20 text-green-500" />
              </div>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-green-500">Identity Verified ✓</h2>
          <p className="text-xl text-muted-foreground">Agreement Signed Successfully</p>
          
          <Card className="bg-[#2a2a4a] border-border p-6 text-left space-y-2">
            <p className="font-bold text-lg">V.A.I. Signature Agreement: SIGNED</p>
            <p className="text-sm text-muted-foreground">
              Date/Time: {new Date().toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              Verification Confidence: {confidence?.toFixed(1)}%
            </p>
            <p className="text-sm text-green-500">
              ✓ Signature recorded on blockchain
            </p>
          </Card>

          <div className="pt-4">
            <p className="text-lg text-muted-foreground animate-pulse">
              Generating Your V.A.I....
            </p>
            <Progress value={100} className="w-full mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (state === "failed") {
    const remainingAttempts = 5 - attempts;
    const showTips = attempts >= 3;
    
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-full bg-red-500/20 flex items-center justify-center">
              <X className="w-20 h-20 text-red-500" />
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-red-500">Verification Failed</h2>
          <p className="text-xl">Face does not match your V.A.I. photo</p>
          
          <Card className="bg-[#2a2a4a] border-border p-6 text-left space-y-2">
            <p className="text-sm">
              For security, we need to confirm your identity matches the person who verified with ComplyCube.
            </p>
            {confidence && (
              <p className="text-sm text-muted-foreground">
                Match Confidence: {confidence.toFixed(1)}% (95% required)
              </p>
            )}
            <p className="text-sm text-yellow-500">
              Attempts remaining: {remainingAttempts}
            </p>
          </Card>

          {showTips && (
            <Card className="bg-blue-500/10 border-blue-500/50 p-4 text-left">
              <p className="font-bold text-sm mb-2">💡 Tips for better results:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Ensure good lighting on your face</li>
                <li>• Remove glasses if wearing them</li>
                <li>• Face the camera directly</li>
                <li>• Use the same person as ID verification</li>
              </ul>
            </Card>
          )}

          <div className="space-y-3">
            {remainingAttempts > 0 ? (
              <>
                <Button
                  onClick={handleRetry}
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => setShowHelpModal(true)}
                  variant="outline"
                  className="w-full"
                >
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Why is this failing?
                </Button>
              </>
            ) : (
              <Card className="bg-red-500/10 border-red-500/50 p-6">
                <p className="font-bold text-lg mb-2">Maximum attempts reached</p>
                <p className="text-sm mb-4">Please contact support for assistance.</p>
                <Button variant="outline" className="w-full">
                  Contact Support
                </Button>
              </Card>
            )}
          </div>
        </div>

        <AlertDialog open={showHelpModal} onOpenChange={setShowHelpModal}>
          <AlertDialogContent className="bg-[#1a1a2e] border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Verification Help</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4 text-left">
                <div>
                  <p className="font-semibold text-white mb-2">Common issues:</p>
                  <ul className="space-y-2 text-sm">
                    <li>✓ Check lighting - face should be well-lit</li>
                    <li>✓ Remove glasses if you weren't wearing them during ID verification</li>
                    <li>✓ Face camera directly, not at an angle</li>
                    <li>✓ Ensure the same person who did ID verification</li>
                    <li>✓ Keep your face within the oval guide</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowHelpModal(false)}>
                Got it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white flex items-center justify-center p-6">
        <Card className="bg-[#2a2a4a] border-border p-8 max-w-md">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
            <h2 className="text-2xl font-bold">Camera Access Required</h2>
            <p className="text-muted-foreground">
              {cameraError === "camera-denied" 
                ? "Camera access was denied. Please enable camera access to continue."
                : "Unable to access camera. Please check your device settings."}
            </p>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-left">
              <p className="font-semibold text-blue-400 mb-2">💡 Testing in Preview?</p>
              <p className="text-muted-foreground mb-2">
                Camera access may be blocked in the preview iframe. To test camera features:
              </p>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• Click the "Open in new tab" button (↗️) in the preview</li>
                <li>• Or deploy your app and test on the live site</li>
                <li>• Or use the "Skip for Demo" button below</li>
              </ul>
            </div>

            <div className="pt-4 space-y-2">
              <Button onClick={startCamera} className="w-full">
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  // Skip verification for demo purposes
                  setState("success");
                  setTimeout(() => {
                    const successPage = verificationNavigator.getSuccessPage();
                    navigate(successPage);
                  }, 1500);
                }}
              >
                Skip for Demo (Testing Only)
              </Button>
              <Button variant="ghost" className="w-full text-xs" asChild>
                <a href="https://support.google.com/chrome/answer/2693767" target="_blank" rel="noopener noreferrer">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  How to enable camera in browser
                </a>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

export default FacialVerification;
