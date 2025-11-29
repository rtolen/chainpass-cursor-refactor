import { useEffect, useState } from "react";
import { ContractViewer } from "@/components/contracts/ContractViewer";
import { SignatureConfirmation } from "@/components/contracts/SignatureConfirmation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useVAIStore } from "@/store/vaiStore";
import { toast } from "sonner";
import FacialRecognitionModal from "@/components/contracts/FacialRecognitionModal";

type Step = "contract" | "verification" | "confirmation";

export default function ContractSignature() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("contract");
  const [hasScrolledContract, setHasScrolledContract] = useState(false);
  const [facialConfidence, setFacialConfidence] = useState<number | null>(null);
  const [signedContract, setSignedContract] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationModalOpen, setVerificationModalOpen] = useState(false);

  // Get session data
  const { vaiNumber: storeVAI } = useVAIStore();
  const sessionVAI = sessionStorage.getItem('vai_number');
  const vaiNumber = storeVAI || sessionVAI;
  const complycubeClientId = sessionStorage.getItem('complycube_client_id') || '';
  const contractType = "terms_of_service";

  const CONTRACT_CONTENT = {
    law_enforcement: "Law Enforcement Officer Disclosure Agreement content...",
    mutual_consent: "Mutual Consent and Accountability Agreement content...",
    terms_of_service: "ChainPass V.A.I. Terms of Service content...",
  };

  const steps: Step[] = ["contract", "verification", "confirmation"];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    if (!vaiNumber || vaiNumber.startsWith('TEMP-')) {
      toast({
        title: "Error",
        description: "No valid V.A.I. number found. Please complete verification first.",
        variant: "destructive"
      });
      navigate('/vai-processing');
      return;
    }
  }, [vaiNumber, navigate]);

  const handleNextFromContract = () => {
    if (!hasScrolledContract) {
      toast.error("Please scroll to the bottom of the contract to continue");
      return;
    }
    setCurrentStep("verification");
  };

  const handleVerificationSuccess = (confidence: number) => {
    setFacialConfidence(confidence);
    handleSignContract(confidence);
  };

  const handleVerificationFailed = () => {
    toast.error("Identity verification failed. Please try again later.");
    // Could redirect or show help message
  };

  const handleSignContract = async (confidence: number) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("sign-contract", {
        body: {
          vaiNumber,
          complycubeClientId,
          contractType,
          contractText: CONTRACT_CONTENT[contractType as keyof typeof CONTRACT_CONTENT],
          facialMatchConfidence: confidence,
          deviceFingerprint: btoa(
            `${navigator.userAgent}-${screen.width}x${screen.height}-${navigator.language}`
          ),
        },
      });

      if (error) throw error;

      if (data.success) {
        setSignedContract({
          contractId: data.contractId,
          signedAt: data.signedAt,
          blockchainHash: data.blockchainHash,
        });
        
        // Store contract acceptance flags
        sessionStorage.setItem('le_disclosure_accepted', 'true');
        sessionStorage.setItem('terms_accepted', 'true');
        sessionStorage.setItem('mutual_consent_accepted', 'true');
        
        setCurrentStep("confirmation");
        toast.success("Contract signed successfully!");
        
        // Navigate to final verification after brief delay
        setTimeout(() => {
          toast.success("Proceeding to final verification...");
          window.location.href = "/final-verification";
        }, 2000);
      } else {
        throw new Error(data.message || "Failed to sign contract");
      }
    } catch (error) {
      console.error("Sign contract error:", error);
      toast.error("Failed to sign contract. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStepLabel = (step: Step) => {
    switch (step) {
      case "contract":
        return "Review Contract";
      case "verification":
        return "Verify Identity";
      case "confirmation":
        return "Confirmation";
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Digital Contract Signature</h1>
          <p className="text-muted-foreground">
            Secure contract signing with facial recognition verification
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`flex items-center ${
                  index < steps.length - 1 ? "flex-1" : ""
                }`}
              >
                <div className="text-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      index <= currentStepIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <p className="text-xs mt-1 text-muted-foreground hidden sm:block">
                    {getStepLabel(step)}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-2 bg-muted">
                    <div
                      className={`h-full ${
                        index < currentStepIndex ? "bg-primary" : ""
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Content */}
        <div className="space-y-6">
          {currentStep === "contract" && (
            <>
              <ContractViewer
                contractType={contractType as any}
                onScrollComplete={() => setHasScrolledContract(true)}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleNextFromContract}
                  size="lg"
                  disabled={!hasScrolledContract}
                >
                  Continue to Identity Verification
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </>
          )}

        {currentStep === "verification" && (
          <>
            <div className="relative">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-xl blur-sm"></div>
              <div className="relative bg-card/80 backdrop-blur rounded-xl border border-border/50 p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Step 2 • Required
                    </p>
                    <h2 className="text-2xl font-bold">Facial Recognition</h2>
                    <p className="text-muted-foreground">
                      Confirm your identity before applying your digital signature to the contract.
                    </p>
                  </div>
                  {facialConfidence && (
                    <div className="px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-sm font-semibold">
                      ✓ Verified (Confidence: {facialConfidence}%)
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-5">
                    <li>Ensure you are in a well-lit environment</li>
                    <li>Align your face in the oval guide during the scan</li>
                    <li>Your live photo will be compared to your original verification record</li>
                  </ul>
                  <Button
                    size="lg"
                    className="h-12 px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    onClick={() => setVerificationModalOpen(true)}
                    disabled={!!facialConfidence}
                  >
                    {facialConfidence ? "Verification Complete" : "Start Facial Recognition"}
                  </Button>
                </div>

                {!facialConfidence && (
                  <p className="text-xs text-amber-300">
                    Note: Facial verification is mandatory before you can sign.
                  </p>
                )}
              </div>
            </div>

            <FacialRecognitionModal
              open={isVerificationModalOpen}
              onOpenChange={setVerificationModalOpen}
              onVerificationSuccess={() => handleVerificationSuccess(95)}
              title="Digital Contract Signature - Face Verification"
            />

            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentStep("contract")}
                variant="outline"
                size="lg"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Contract
              </Button>
            </div>
          </>
        )}

          {currentStep === "confirmation" && signedContract && (
            <SignatureConfirmation
              contractId={signedContract.contractId}
              contractType={contractType}
              signedAt={signedContract.signedAt}
              vaiNumber={vaiNumber}
              blockchainHash={signedContract.blockchainHash}
            />
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">🔒 Security & Privacy</h3>
          <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
            <li>All data is encrypted in transit and at rest</li>
            <li>Facial images are deleted immediately after verification</li>
            <li>Contracts are permanently recorded with blockchain verification</li>
            <li>Your identity information is protected by industry standards</li>
          </ul>
        </div>
      </div>
    </div>
  );
}