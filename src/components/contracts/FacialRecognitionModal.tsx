import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getComplyCubePhoto } from "@/services/getComplyCubePhoto";

interface FacialRecognitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerificationSuccess: () => void;
  title?: string;
}

type RecognitionState = "camera" | "processing" | "success" | "failed";
const MAX_ATTEMPTS = 3;
const ANALYSIS_CANVAS_SIZE = 48;
const MATCH_THRESHOLD = 20;

const loadImageData = (source: string): Promise<ImageData> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = ANALYSIS_CANVAS_SIZE;
      canvas.height = ANALYSIS_CANVAS_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Unable to create canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, ANALYSIS_CANVAS_SIZE, ANALYSIS_CANVAS_SIZE);
      resolve(ctx.getImageData(0, 0, ANALYSIS_CANVAS_SIZE, ANALYSIS_CANVAS_SIZE));
    };
    img.onerror = () => reject(new Error("Failed to load reference photo"));
    img.src = source;
  });

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

export default function FacialRecognitionModal({
  open,
  onOpenChange,
  onVerificationSuccess,
  title,
}: FacialRecognitionModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<RecognitionState>("camera");
  const [attempts, setAttempts] = useState(0);
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  const [referencePhotoDataUrl, setReferencePhotoDataUrl] = useState<string | null>(null);
  const [referencePhotoLoading, setReferencePhotoLoading] = useState(false);
  const [complycubePhotoId, setComplycubePhotoId] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      const storedPhotoId = sessionStorage.getItem("complycube_request_photo_id");
      if (storedPhotoId) {
        setComplycubePhotoId(storedPhotoId);
      } else {
        toast.error("ComplyCube photo unavailable. Complete verification first.");
      }
    } else {
      stopCamera();
      setReferencePhotoDataUrl(null);
      setSimilarityScore(null);
      setAttempts(0);
      setState("camera");
    }
  }, [open, stopCamera, toast]);

  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });
      
      if (!videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error("Video element not available");
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setState("camera");
    } catch (error: any) {
      toast.error(error.message || "Unable to access camera");
      setState("failed");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!complycubePhotoId) return;
    if (referencePhotoDataUrl || referencePhotoLoading) return;

    const fetchPhoto = async () => {
      try {
        setReferencePhotoLoading(true);
        const { base64 } = await getComplyCubePhoto(complycubePhotoId);
        setReferencePhotoDataUrl(base64);
        await startCamera();
      } catch (error) {
        console.error("[Verification] Unable to load ComplyCube photo:", error);
        toast.error("Unable to load ComplyCube photo for comparison.");
        setState("failed");
      } finally {
        setReferencePhotoLoading(false);
      }
    };

    fetchPhoto();
  }, [open, complycubePhotoId, referencePhotoDataUrl, referencePhotoLoading, startCamera, toast]);

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error("Camera not ready. Please wait for camera to initialize.");
      return;
    }

    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      toast.error("Camera video stream not ready. Please wait a moment and try again.");
      return;
    }
    if (!referencePhotoDataUrl) {
      toast.error("Reference photo unavailable.");
      return;
    }

    setState("processing");

    try {
      // Capture frame
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }
      
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.95);

      if (!imageData || imageData.length < 100) {
        throw new Error("Failed to capture image. Please try again.");
      }
      const similarity = await calculateSimilarityScore(referencePhotoDataUrl, imageData);
      setSimilarityScore(similarity);

      if (similarity >= MATCH_THRESHOLD) {
        setState("success");
        stopCamera();
        toast.success(`Identity confirmed! Similarity ${similarity.toFixed(1)}%.`);
        setTimeout(() => {
          onVerificationSuccess();
          onOpenChange(false);
        }, 1500);
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= MAX_ATTEMPTS) {
          setState("failed");
          toast.error("Maximum attempts exceeded. Please try again later.");
          stopCamera();
        } else {
          setState("camera");
          toast.error(`Faces did not match (${similarity.toFixed(1)}%). ${MAX_ATTEMPTS - nextAttempts} attempts left.`);
        }
      }
    } catch (error: any) {
      console.error("[Verification] Error:", error);
      const errorMessage = error.message || "Verification failed. Please try again.";
      toast.error(errorMessage);
      setState("camera");
      
    }
  };

  const handleRetry = () => {
    setAttempts(0);
    setSimilarityScore(null);
    setState("camera");
    startCamera();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title || "Facial Recognition Verification"}
          </DialogTitle>
        </DialogHeader>

        {referencePhotoLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading ComplyCube photo...</p>
          </div>
        )}

        {!referencePhotoLoading && !referencePhotoDataUrl && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Unable to load ComplyCube photo. Close the modal and try again.
          </div>
        )}

        {referencePhotoDataUrl && (
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
                  {similarityScore !== null && (
                    <> • Last similarity {similarityScore.toFixed(1)}%</>
                  )}
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
              <p className="text-lg font-medium">Comparing your identity...</p>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          )}

          {/* Success State */}
          {state === "success" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-lg font-medium">Identity Verified!</p>
              <p className="text-sm text-muted-foreground">
                Similarity: {similarityScore?.toFixed(1) ?? MATCH_THRESHOLD}%
              </p>
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
                {similarityScore !== null && (
                  <p className="text-xs text-muted-foreground">
                    Last similarity: {similarityScore.toFixed(1)}%
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
        )}
      </DialogContent>
    </Dialog>
  );
}
