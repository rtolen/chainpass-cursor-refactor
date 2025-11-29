import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, AlertTriangle, CheckCircle2, Shield, Loader2 } from "lucide-react";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import FacialRecognitionModal from "@/components/contracts/FacialRecognitionModal";
import { toast } from "sonner";

export default function SignatureAgreement() {
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerificationModalOpen, setVerificationModalOpen] = useState(false);
  const [checkboxes, setCheckboxes] = useState({
    read: false,
    authorize: false,
    equivalent: false,
    protect: false,
    review: false,
    responsible: false,
    infrastructure: false,
    blockchain: false,
    jurisdiction: false,
  });

  const handleVerificationSuccess = () => {
    setIsVerified(true);
    setVerificationModalOpen(false);
    toast.success("Facial verification complete");
  };

  const handleCheckboxChange = (key: keyof typeof checkboxes) => {
    if (!isVerified) return;
    setCheckboxes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allCheckboxesChecked = Object.values(checkboxes).every(Boolean);
  const canSign = isVerified && allCheckboxesChecked;

  const handleSign = async () => {
    if (!canSign) return;

    setIsSaving(true);
    
    // Simulate saving agreements
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success("Agreements signed successfully");
    setIsSaving(false);
    
    // Navigate to contract signature
    navigate('/contract-signature');
  };

  const handleSkip = () => {
    toast.info("Skipping agreements (test mode)");
    navigate('/contract-signature');
  };

  return (
    <div className="min-h-screen bg-[#1F2937] py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          <img src={chainpassLogo} alt="ChainPass" className="h-24" />
        </div>

        {/* SECTION 1: Description */}
        <div className="relative">
          <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-600/30 to-blue-500/30 rounded-xl blur-sm"></div>
          <div className="relative bg-[#1F2937]/80 backdrop-blur-lg rounded-xl p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Shield className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-white">Final Acknowledgments</h1>
            </div>
            <p className="text-xl text-gray-300 font-semibold mb-2">
              Please confirm you understand these critical points
            </p>
            <p className="text-sm text-gray-400">
              Your facial verification serves as your legally binding signature
            </p>
          </div>
        </div>

        {/* SECTION 2: Facial Verification */}
        <div className="relative">
          <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-xl blur-sm"></div>
          <div className="relative bg-[#1F2937]/80 backdrop-blur-lg rounded-xl p-8 border border-gray-700/50 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-400 uppercase tracking-[0.3em]">Step 1 • Required</p>
                <h2 className="text-2xl font-bold text-white">Facial Verification</h2>
                <p className="text-gray-300">
                  Confirm your identity before reviewing and signing the legal agreement.
                </p>
              </div>
              {isVerified && (
                <div className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-sm font-semibold text-center">
                  ✓ Verification Completed
                </div>
              )}
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-sm text-gray-400 md:max-w-xl">
                Clicking “Start Verification” will open a secure face scan powered by ComplyCube. We’ll compare your live photo with your original verification record.
              </p>
              <Button
                onClick={() => setVerificationModalOpen(true)}
                disabled={isVerified}
                className="h-12 text-lg px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isVerified ? "Verification Complete" : "Start Verification"}
              </Button>
            </div>
            {!isVerified && (
              <p className="text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                You must complete face verification before the agreement unlocks.
              </p>
            )}
          </div>
        </div>
        <FacialRecognitionModal
          open={isVerificationModalOpen}
          onOpenChange={setVerificationModalOpen}
          onVerificationSuccess={handleVerificationSuccess}
          title="Legal Agreement - Face Verification"
        />

        {/* SECTION 3: Agreement Checkboxes */}
        <div className="relative">
          {/* Lock Overlay when not verified */}
          {!isVerified && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1F2937]/60 backdrop-blur-sm rounded-xl">
              <div className="text-center space-y-3">
                <Lock className="w-16 h-16 text-gray-400 mx-auto" />
                <p className="text-gray-300 font-semibold text-lg">
                  🔒 Complete facial verification to review agreements
                </p>
              </div>
            </div>
          )}

          {/* Checkboxes Section */}
          <div className={`transition-all duration-500 ${!isVerified ? 'blur-sm pointer-events-none' : ''}`}>
            <div className="relative">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-600/20 to-blue-500/20 rounded-xl blur-sm"></div>
              <div className="relative bg-[#1F2937]/80 backdrop-blur-lg rounded-xl p-8 border border-gray-700/50">
                
                {/* Warning Box */}
                <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-400 font-semibold">
                      By clicking "I Agree and Sign," you electronically sign this agreement with your V.A.I. number.
                    </p>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-4">
                  {[
                    { key: 'read', label: 'I have read and understand this entire agreement' },
                    { key: 'authorize', label: 'I authorize my V.A.I. number to serve as my legally binding electronic signature' },
                    { key: 'equivalent', label: 'I understand that V.A.I. signatures are equivalent to handwritten signatures' },
                    { key: 'protect', label: 'I will protect my V.A.I. account and not allow others to use it' },
                    { key: 'review', label: 'I will read documents before signing them with my V.A.I. number' },
                    { key: 'responsible', label: 'I am responsible for all contracts signed with my V.A.I. number' },
                    { key: 'infrastructure', label: 'I understand ChainPass provides signature infrastructure but does not control contract terms' },
                    { key: 'blockchain', label: 'I consent to signature data being recorded, timestamped, and stored on blockchain' },
                    { key: 'jurisdiction', label: 'This agreement is governed by U.S. federal law and Delaware state law' },
                  ].map(({ key, label }) => (
                    <div
                      key={key}
                      className={`flex items-start gap-3 p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 transition-all duration-300 ${
                        isVerified ? 'hover:bg-gray-800/50 hover:border-purple-500/30' : ''
                      } ${checkboxes[key as keyof typeof checkboxes] ? 'bg-purple-900/20 border-purple-500/50' : ''}`}
                    >
                      {!isVerified && (
                        <Lock className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      )}
                      <Checkbox
                        id={key}
                        checked={checkboxes[key as keyof typeof checkboxes]}
                        onCheckedChange={() => handleCheckboxChange(key as keyof typeof checkboxes)}
                        disabled={!isVerified}
                        className={`mt-0.5 ${checkboxes[key as keyof typeof checkboxes] ? 'bg-purple-600 border-purple-600' : ''}`}
                      />
                      <label
                        htmlFor={key}
                        className={`text-sm leading-relaxed cursor-pointer select-none ${
                          isVerified ? 'text-gray-300' : 'text-gray-500'
                        } ${checkboxes[key as keyof typeof checkboxes] ? 'text-white font-medium' : ''}`}
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>

                {/* Progress Indicator */}
                {isVerified && (
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-400">
                      {Object.values(checkboxes).filter(Boolean).length} of 9 requirements completed
                    </p>
                  </div>
                )}

                {/* Buttons */}
                <div className="mt-8 space-y-4">
                  {/* Primary Button */}
                  <div className="relative group">
                    <div className={`absolute -inset-[2px] bg-gradient-to-r from-purple-600 to-blue-500 rounded-xl blur transition-opacity ${
                      canSign ? 'opacity-75 group-hover:opacity-100' : 'opacity-0'
                    }`}></div>
                    <Button
                      onClick={handleSign}
                      disabled={!canSign || isSaving}
                      className={`relative w-full font-bold text-lg py-7 rounded-xl shadow-xl transition-all duration-300 ${
                        canSign
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      } ${canSign && !isSaving ? 'animate-pulse' : ''}`}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Saving agreements...
                        </>
                      ) : canSign ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          I Agree and Sign
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5 mr-2" />
                          {!isVerified ? 'Complete Requirements to Sign' : 'Check All Boxes to Sign'}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Secondary Links */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => navigate('/leo-declaration')}
                      className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      ← Back to Disclosure
                    </button>
                    
                    {/* Testing Mode Skip */}
                    {process.env.NODE_ENV === 'development' && (
                      <>
                        <span className="text-gray-600">•</span>
                        <button
                          onClick={handleSkip}
                          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          Skip Agreement (Testing Mode)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-sm text-gray-400">
          <p>Step 4 of 4 • Complete all requirements to finalize your V.A.I.</p>
        </div>
      </div>
    </div>
  );
}
