import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Check,
  ExternalLink,
  Shield,
  Sparkles
} from "lucide-react";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import { supabase } from "@/integrations/supabase/client";
import { sessionManager } from "@/utils/sessionManager";
import { useVAIStore } from "@/store/vaiStore";

type ProcessingState = "verifying" | "generating" | "complete";

// Generate cryptographically secure V.A.I. code (format: 7 characters alphanumeric)
const generateVAICode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint8Array(7);
  crypto.getRandomValues(array); // Cryptographically secure random generation
  return Array.from(array, byte => chars[byte % chars.length]).join('');
};

export default function VaiProcessing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processingState, setProcessingState] = useState<ProcessingState>("verifying");
  const [progress, setProgress] = useState(0);
  const [displayCode, setDisplayCode] = useState<string>("");
  const [verificationRecordId, setVerificationRecordId] = useState<string>("");

  // Check if user is LEO from session storage
  const isLEO = sessionStorage.getItem('userType') === 'leo';

  // Get V.A.I. store
  const { vaiNumber, setVAI, isGenerating, setGenerating } = useVAIStore();

  // Process V.A.I. generation and save to database
  useEffect(() => {
    const processVAI = async () => {
      // CRITICAL: If V.A.I. already exists in store, use it
      if (vaiNumber) {
        console.log('V.A.I. already exists in store:', vaiNumber);
        const codeToDisplay = isLEO ? `LEO-${vaiNumber}` : vaiNumber;
        setDisplayCode(codeToDisplay);
        setProcessingState("complete");
        return;
      }

      // Check if generation already in progress
      if (isGenerating) {
        console.log('V.A.I. generation already in progress');
        return;
      }

      const sessionId = sessionManager.getSessionId();
      let recordId = sessionManager.getVerificationRecordId();

      try {
        setGenerating(true);

        // Create or retrieve verification record
        if (!recordId) {
          const { data: newRecord, error: recordError } = await supabase
            .from('verification_records')
            .insert({
              session_id: sessionId,
              verification_status: 'verified',
              biometric_confirmed: true,
            })
            .select()
            .single();

          if (recordError) throw recordError;
          recordId = newRecord.id;
          sessionManager.setVerificationRecordId(recordId);
          setVerificationRecordId(recordId);
        } else {
          // Update existing record
          await supabase
            .from('verification_records')
            .update({
              biometric_confirmed: true,
              verification_status: 'verified',
            })
            .eq('id', recordId);
          setVerificationRecordId(recordId);
        }

        // CRITICAL: Check if V.A.I. already exists in database for this record
        const { data: existingVAI, error: checkError } = await supabase
          .from('vai_assignments')
          .select('vai_code')
          .eq('verification_record_id', recordId)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking for existing V.A.I.:', checkError);
        }

        if (existingVAI?.vai_code) {
          console.log('Found existing V.A.I. in database:', existingVAI.vai_code);
          
          // Store in Zustand and session
          setVAI(existingVAI.vai_code, recordId, isLEO);
          sessionManager.setVaiCode(existingVAI.vai_code);
          sessionStorage.setItem('vai_number', existingVAI.vai_code);
          
          const codeToDisplay = isLEO ? `LEO-${existingVAI.vai_code}` : existingVAI.vai_code;
          setDisplayCode(codeToDisplay);
          setProcessingState("complete");
          
          toast({
            title: "✓ V.A.I. Confirmed!",
            description: "Verification complete. Continue to legal agreements.",
          });
          
          return;
        }

        // Stage 1: Verifying identity
        const stage1Timer = setTimeout(() => {
          setProcessingState("generating");
        }, 2500);

        // Stage 2: Generate NEW V.A.I. and save to database
        const stage2Timer = setTimeout(async () => {
          const newVAICode = generateVAICode();
          
          // Save V.A.I. assignment to database
          const { error: vaiError } = await supabase
            .from('vai_assignments')
            .insert({
              vai_code: newVAICode,
              verification_record_id: recordId,
              status: 'complete',
            });

          if (vaiError) {
            console.error('Error saving V.A.I.:', vaiError);
            toast({
              title: "Error",
              description: "Failed to generate V.A.I. Please try again.",
              variant: "destructive",
            });
            setGenerating(false);
            return;
          }

          // Store in Zustand and session
          setVAI(newVAICode, recordId, isLEO);
          sessionManager.setVaiCode(newVAICode);
          sessionStorage.setItem('vai_number', newVAICode);
          
          // Set display code based on user type
          const codeToDisplay = isLEO ? `LEO-${newVAICode}` : newVAICode;
          setDisplayCode(codeToDisplay);
          
          setProcessingState("complete");
          
          // Trigger celebration
          toast({
            title: "✓ V.A.I. Confirmed!",
            description: "Verification complete. Continue to legal agreements.",
          });
        }, 5000);

        // Progress animation
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + 2;
          });
        }, 100);

        return () => {
          clearTimeout(stage1Timer);
          clearTimeout(stage2Timer);
          clearInterval(progressInterval);
        };
      } catch (error) {
        console.error('Error processing V.A.I.:', error);
        toast({
          title: "Error",
          description: "Failed to process verification. Please try again.",
          variant: "destructive",
        });
      }
    };

    processVAI();
  }, [toast]);

  const handleContinueToVairify = () => {
    // Navigate to LEO declaration
    navigate("/leo-declaration");
  };

  // Processing UI
  if (processingState !== "complete") {
    return (
      <div className="min-h-screen bg-[#1F2937] py-8 px-4 flex items-center justify-center">
        <div className="max-w-2xl w-full animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-center mb-12">
            <img src={chainpassLogo} alt="ChainPass" className="h-32" />
          </div>

          {/* Processing Card */}
          <div className="relative">
            {/* Gradient border effect */}
            <div className="absolute -inset-[2px] bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-xl blur-sm opacity-75"></div>
            <Card className="relative bg-[#1F2937]/90 backdrop-blur-lg border-0 shadow-2xl">
              <CardContent className="p-12 text-center space-y-8">
                {/* Animated Icon */}
                <div className="relative w-32 h-32 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full opacity-20 animate-pulse"></div>
                  <div className="absolute inset-4 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full opacity-40 animate-ping"></div>
                  <div className="relative w-full h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center">
                    {processingState === "verifying" ? (
                      <Shield className="w-16 h-16 text-white animate-pulse" />
                    ) : (
                      <Sparkles className="w-16 h-16 text-white animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Status Text */}
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold text-white">
                    {processingState === "verifying" 
                      ? "Confirming Biometrics" 
                      : "Generating Your V.A.I."}
                  </h1>
                  <p className="text-gray-300 text-lg">
                    {processingState === "verifying"
                      ? "Validating biometric data from ComplyCube..."
                      : "Creating your Verifiable Anonymous Identity..."}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-400">{processingState === "verifying" ? "64" : "84"}% complete</p>
                </div>

                {/* Processing Steps */}
                <div className="space-y-3 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-300">Payment verified</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-300">Identity documents validated</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {processingState === "generating" ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    )}
                    <span className="text-sm text-gray-300">Biometric verification complete</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {processingState === "generating" ? (
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                    )}
                    <span className="text-sm text-gray-300">Generating V.A.I. code</span>
                  </div>
                </div>

                {/* Info Text */}
                <p className="text-xs text-gray-400">
                  Please don't close this window. This usually takes 30-60 seconds.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Success/Complete UI
  return (
    <div className="min-h-screen bg-[#1F2937] py-8 px-4">
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-center mb-12">
          <img src={chainpassLogo} alt="ChainPass" className="h-28" />
        </div>

        {/* Main Hero Card with Gradient Border */}
        <div className="relative mb-8">
          {/* Gradient border glow effect */}
          <div className="absolute -inset-[2px] bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-2xl blur-sm opacity-75 animate-pulse"></div>
          
          {/* Glass-morphism card */}
          <div className="relative bg-[#1F2937]/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 md:p-12">
            {/* V.A.I. Number Display */}
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">Your Verifiable Anonymous Identity</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white">V.A.I. Number Generated</h1>
              </div>

              {/* V.A.I. Code with gradient and pulse animation */}
              <div className="relative inline-block">
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 to-blue-500 rounded-xl blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-xl p-8 shadow-xl">
                  <div className="text-5xl md:text-6xl font-mono font-bold text-white tracking-widest">
                    {displayCode || "LOADING..."}
                  </div>
                </div>
              </div>

              {/* NOT ACTIVATED Badge */}
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500/20 border-2 border-amber-500/50 rounded-full">
                <span className="text-amber-500 text-2xl">⚠️</span>
                <span className="text-amber-400 font-bold text-sm uppercase tracking-wider">Not Activated</span>
              </div>

              {/* Warning Message */}
              <div className="max-w-lg mx-auto">
                <p className="text-base md:text-lg text-gray-300 font-medium leading-relaxed">
                  You must complete the documents below before your V.A.I. number is activated
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Required Documents Checklist */}
        <div className="relative mb-8">
          <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-600/30 to-blue-500/30 rounded-xl blur-sm"></div>
          <div className="relative bg-[#1F2937]/80 backdrop-blur-lg rounded-xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-6">Required Documents</h2>
            
            <div className="space-y-4">
              {/* Law Enforcement Disclosure */}
              <div className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-purple-500/50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white">Law Enforcement Disclosure</p>
                    <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-semibold uppercase">
                      Required
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Understand how we respond to law enforcement requests
                  </p>
                </div>
              </div>

              {/* Signature Agreement */}
              <div className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-purple-500/50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white">Signature Agreement</p>
                    <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-semibold uppercase">
                      Required
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Confirm your consent and understanding
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-400">
            Step 3 of 4 • Complete documents to activate your V.A.I.
          </p>
        </div>

        {/* CTA Button */}
        <div className="relative group">
          <div className="absolute -inset-[2px] bg-gradient-to-r from-purple-600 to-blue-500 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <Button
            onClick={handleContinueToVairify}
            className="relative w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg py-7 rounded-xl shadow-xl transition-all duration-300"
          >
            Complete Required Documents
            <ExternalLink className="ml-2 w-5 h-5" />
          </Button>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-gray-700/50 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
          <a href="#" className="hover:text-purple-400 transition-colors">Support</a>
          <span>•</span>
          <a href="#" className="hover:text-purple-400 transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-purple-400 transition-colors">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}
