import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, ArrowLeft } from "lucide-react";
import FacialRecognitionModal from "@/components/contracts/FacialRecognitionModal";
import { useVAIStore } from "@/store/vaiStore";

export default function ComplyCubeFacialVerification() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const { isLEO } = useVAIStore();

  const handleVerificationSuccess = () => {
    navigate("/contract-signature");
  };

  const handleSkip = () => {
    const successRoute = isLEO ? "/leo-vai-success" : "/vai-success";
    navigate(successRoute);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/verification-transition")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Confirm Your Identity</h1>
            <p className="text-sm text-muted-foreground">
              Step 2 of 3: Biometric Verification
            </p>
          </div>
        </div>

        {/* Main Content */}
        <Card className="p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Biometric Verification</h2>
              <p className="text-muted-foreground max-w-md">
                We need to confirm that you are the same person who completed the ID verification.
                This ensures the security of your V.A.I. number.
              </p>
            </div>
            <div className="w-full max-w-md space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Position Your Face</p>
                  <p className="text-sm text-muted-foreground">
                    Look directly at the camera and center your face in the guide
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Capture Photo</p>
                  <p className="text-sm text-muted-foreground">
                    Click the capture button when ready
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Verification Complete</p>
                  <p className="text-sm text-muted-foreground">
                    We'll compare your photo with your ID verification
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setModalOpen(true)}
              size="lg"
              className="w-full max-w-md"
            >
              <Camera className="mr-2 h-5 w-5" />
              Start Camera
            </Button>
            
            {/* Skip Link */}
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-primary underline"
            >
              Skip facial verification (testing)
            </button>
          </div>
        </Card>

        {/* Facial Recognition Modal */}
        <FacialRecognitionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onVerificationSuccess={handleVerificationSuccess}
        />
      </div>
    </div>
  );
}
