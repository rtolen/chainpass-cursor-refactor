import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ProgressSteps } from "@/components/ProgressSteps";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Shield, 
  CreditCard, 
  Camera,
  Clock,
  Check,
  Lock,
  ExternalLink,
  Loader2,
  AlertCircle
} from "lucide-react";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import complycubeLogo from "@/assets/complycube-logo.svg";
import { sessionManager } from "@/utils/sessionManager";

type VerificationState = "ready" | "loading" | "error";

export default function VerificationTransition() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [verificationState, setVerificationState] = useState<VerificationState>("ready");
  const [showSuccess, setShowSuccess] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string>("");
  const [requestBodyModalOpen, setRequestBodyModalOpen] = useState(false);
  const [complycubeRequest, setComplycubeRequest] = useState<any>(null);
  const [complycubeResponse, setComplycubeResponse] = useState<any>(null);
  const [clientId, setClientId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [flowUrl, setFlowUrl] = useState<string>("");
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRedirectModalOpen, setIsRedirectModalOpen] = useState(false);

  const steps = ["Payment", "Verification", "Processing", "V.A.I."];
  
  // Check if user cancelled verification
  const cancelled = searchParams.get('cancelled');

  // Auto-fade success message after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Show cancellation message if returned from cancelled verification
  useEffect(() => {
    if (cancelled === 'true') {
      toast({
        title: "Verification Cancelled",
        description: "You can continue when you're ready.",
        variant: "destructive",
      });
    }
  }, [cancelled, toast]);

  const verificationItems = [
    {
      icon: CreditCard,
      title: "Government-Issued ID",
      description: "Driver's license, passport, or national ID"
    },
    {
      icon: Camera,
      title: "Live Selfie",
      description: "Quick photo to verify you're you"
    },
    {
      icon: Clock,
      title: "2-3 Minutes",
      description: "Fast and secure verification"
    }
  ];

  const handleContinueVerification = () => {
    console.log("[Verification] Initiating ComplyCube verification");
    handleContinueToVerification();
  };

  const handleContinueToVerification = async () => {
    setIsGenerating(true);
    setErrorMessage("");
    
    try {
      const sessionId = sessionManager.getSessionId();
      const email = sessionStorage.getItem("user_email") || "";
      const phoneNumber = sessionStorage.getItem("user_phone") || "";
      const firstName = sessionStorage.getItem("user_firstName") || "";
      const lastName = sessionStorage.getItem("user_lastName") || "";

      const body = { sessionId, email, phoneNumber, firstName, lastName };

      const { data, error } = await supabase.functions.invoke("generate-complycube-token", {
        body,
      });

      if (error) throw error;

      if (data?.success === false) {
        const errorMsg = data.error || "Failed to generate verification session";
        setErrorMessage(errorMsg);
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMsg,
        });
        setIsGenerating(false);
        return;
      }

      if (data?.redirectUrl) {
        // Open ComplyCube verification in a centered popup window
        const width = 500;
        const height = 850;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        window.open(
          data.redirectUrl,
          'ComplyCubeVerification',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
        
        toast({
          title: "Verification Window Opened",
          description: "Complete your verification in the popup window.",
        });
      } else {
        throw new Error('No redirect URL received from verification service');
      }
    } catch (error) {
      console.error('Error generating verification session:', error);
      const errorMsg = error instanceof Error ? error.message : "Failed to start verification";
      setErrorMessage(errorMsg);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMsg,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNavigateToComplyCube = async () => {
    setIsGenerating(true);
    setErrorMessage("");
    
    try {
      const sessionId = sessionManager.getSessionId();
      const email = sessionStorage.getItem("user_email") || "";
      const phoneNumber = sessionStorage.getItem("user_phone") || "";
      const firstName = sessionStorage.getItem("user_firstName") || "";
      const lastName = sessionStorage.getItem("user_lastName") || "";

      const body = { sessionId, email, phoneNumber, firstName, lastName };

      const { data, error } = await supabase.functions.invoke("generate-complycube-token", {
        body,
      });

      if (error) throw error;

      if (data?.success === false) {
        const errorMsg = data.error || "Failed to generate SDK token";
        setErrorMessage(errorMsg);
        throw new Error(errorMsg);
      }

      if (data?.redirectUrl) {
        console.log('✅ Redirecting to ComplyCube flow:', data.redirectUrl);
        // Navigate directly to the redirectURL
        window.location.href = data.redirectUrl;
      } else {
        throw new Error("No redirect URL received from ComplyCube");
      }
    } catch (error) {
      console.error('Error navigating to ComplyCube:', error);
      const errorMsg = error instanceof Error ? error.message : "Failed to start verification";
      setErrorMessage(errorMsg);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMsg,
      });
      setIsGenerating(false);
    }
  };

  const handleGenerateToken = async () => {
    try {
      setErrorMessage("");
      const sessionId = sessionManager.getSessionId();
      const email = sessionStorage.getItem("user_email") || "";
      const phoneNumber = sessionStorage.getItem("user_phone") || "";
      const firstName = sessionStorage.getItem("user_firstName") || "";
      const lastName = sessionStorage.getItem("user_lastName") || "";

      const body = { sessionId, email, phoneNumber, firstName, lastName };

      const { data, error } = await supabase.functions.invoke("generate-complycube-token", {
        body,
      });

      if (error) throw error;

      if (data?.success === false) {
        const errorMsg = data.error || "Failed to generate SDK token";
        setErrorMessage(errorMsg);
        setRequestBodyModalOpen(true);
        throw new Error(errorMsg);
      }

      if (data?.token) {
        // Set ComplyCube request and response data
        setComplycubeRequest({
          clientCreation: data.clientPayload,
          tokenGeneration: {
            clientId: data.clientId,
            referrer: "*://chainpass.lovable.app/*"
          },
          flowSessionRequest: data.flowSessionRequest || null
        });
        
        setComplycubeResponse({
          clientId: data.clientId,
          flowSessionResponse: data.flowSessionResponse || null
        });
        
        setClientId(data.clientId || "");
        setRedirectUrl(data.redirectUrl || "");

        // Check if redirectUrl is available
        if (data.redirectUrl) {
          console.log('✅ Flow session created with redirectUrl:', data.redirectUrl);
          setFlowUrl(data.redirectUrl);
          setIframeLoading(true);
          setShowFlowModal(true);
        } else {
          setErrorMessage("No redirect URL received from ComplyCube");
        }
        
        setRequestBodyModalOpen(true);
        
        toast({
          title: "SDK Token Generated",
          description: "ComplyCube SDK token and flow session created successfully",
        });
      }
    } catch (error) {
      console.error("Error generating token:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to generate SDK token";
      setErrorMessage(errorMsg);
      setRequestBodyModalOpen(true);
      toast({
        title: "Token Generation Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleBypassVerification = () => {
    console.log("[Verification] Bypassing verification (test mode)");
    setModalOpen(false);
    setRedirectUrl("");
    setVerificationState("ready");
    toast({
      title: "Test Mode",
      description: "Bypassing ComplyCube verification for testing...",
    });
    setTimeout(() => navigate("/vai-processing"), 1000);
  };

  const handleCancel = () => {
    setModalOpen(false);
    setRedirectUrl("");
    setVerificationState("ready");
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/payment")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <img src={chainpassLogo} alt="ChainPass" className="h-32" />
        </div>

        {/* Progress Steps */}
        <ProgressSteps currentStep={2} steps={steps} />

        {/* Success Message */}
        {showSuccess && (
          <Card className="glass shadow-card mb-6 border-success/50 animate-scale-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-success">Payment Successful - $99.00</p>
                  <p className="text-sm text-muted-foreground">Receipt sent to your email</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold">Identity Verification</h1>
          <p className="text-muted-foreground">Complete your verification with ComplyCube</p>
        </div>

        {/* What You'll Need */}
        <div className="mb-8">
          <h3 className="font-semibold text-lg mb-4 text-center">What You'll Need</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {verificationItems.map((item, index) => (
              <Card key={index} className="glass hover:shadow-glow transition-smooth">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                    <item.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Trust & Privacy Card */}
        <Card className="glass shadow-card mb-6 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Your Data is Protected</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  ComplyCube is our licensed KYC partner. They use bank-level encryption and never share your data without your consent.
                </p>
                <a
                  href="https://www.complycube.com/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm inline-flex items-center gap-1"
                >
                  Learn more about ComplyCube
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="glass shadow-card mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">How Verification Works</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">Upload your government ID</p>
                  <p className="text-sm text-muted-foreground">Driver's license, passport, or national ID</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">Take a quick selfie</p>
                  <p className="text-sm text-muted-foreground">Liveness detection ensures you're you</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">ComplyCube verifies and returns you here</p>
                  <p className="text-sm text-muted-foreground">Estimated time: 2-3 minutes</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center pt-4">
              <img src={complycubeLogo} alt="ComplyCube" className="h-6 opacity-70" />
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="glass mb-6 border-accent/50 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium">Important Notes:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Don't close the verification window</li>
                  <li>• You'll be returned to ChainPass automatically</li>
                  <li>• Keep this tab open during verification</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {verificationState === "error" && (
          <Card className="border-destructive bg-destructive/10 mb-6">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  Failed to start verification. Please try again.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            className="w-full h-14 text-lg gradient-primary hover:opacity-90 transition-smooth shadow-glow"
            onClick={handleContinueVerification}
            disabled={verificationState === "loading"}
          >
            {verificationState === "loading" ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Continue to Verification →
              </>
            )}
          </Button>

          {/* Bypass Link */}
          <div className="text-center">
            <button
              onClick={() => navigate("/vai-processing")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
            >
              Skip to V.A.I. processing (testing)
            </button>
          </div>

          {/* Generate SDK Token Button */}
          <Button
            onClick={handleGenerateToken}
            variant="outline"
            size="lg"
            className="w-full gap-2 hidden"
            disabled={verificationState === "loading"}
          >
            <Shield className="w-5 h-5" />
            Generate SDK Token
          </Button>

          {/* Navigate to ComplyCube Button - generates token and navigates directly */}
          <Button
            onClick={handleNavigateToComplyCube}
            variant="default"
            size="lg"
            className="w-full gap-2"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading Verification...
              </>
            ) : (
              <>
                Continue to Verification (ComplyCube -local)
                <ExternalLink className="w-5 h-5" />
              </>
          )}
          </Button>

          {/* Redirect URL Modal */}
          <Dialog open={isRedirectModalOpen} onOpenChange={setIsRedirectModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>ComplyCube Redirect URL</DialogTitle>
                <DialogDescription>
                  The ComplyCube verification flow redirect URL has been generated.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <div className="bg-muted p-4 rounded-md break-all text-sm font-mono">
                  {redirectUrl}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Continue to Verification Button - generates token and opens popup */}
          <Button
            onClick={handleContinueToVerification}
            className="w-full gap-2 h-14 text-lg gradient-primary hover:opacity-90 transition-smooth shadow-glow hidden"
            size="lg"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Session...
              </>
            ) : (
              <>
                Continue to Verification (ComplyCube)
                <ExternalLink className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>

        {/* Trust Signals */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            🔒 Bank-level encryption | Verified by ComplyCube | GDPR Compliant
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <button className="text-primary hover:underline">Privacy Policy</button>
            <span className="text-muted-foreground">|</span>
            <button className="text-primary hover:underline">Terms of Service</button>
          </div>
        </div>

        {/* Verification Modal */}
        <Dialog open={modalOpen} onOpenChange={handleCancel}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Identity Verification with ComplyCube
              </DialogTitle>
              <DialogDescription>
                Complete your identity verification securely
              </DialogDescription>
            </DialogHeader>
            
            <div className="px-6 pb-6 space-y-4">
              {verificationState === "loading" ? (
                <div className="text-center py-16">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-muted-foreground">Preparing your secure verification session...</p>
                </div>
              ) : verificationState === "ready" && redirectUrl ? (
                <>
                  {/* ComplyCube Hosted Solution in iframe */}
                  <div className="relative w-full" style={{ height: '600px' }}>
                    <iframe
                      src={redirectUrl}
                      className="w-full h-full border border-border rounded-lg"
                      title="ComplyCube Verification"
                      allow="camera; microphone"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                    />
                  </div>

                  {/* Control Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleBypassVerification}
                      className="flex-1"
                    >
                      Skip Verification (Test Mode)
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleCancel}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>

                  {/* Info Notice */}
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-accent/10 p-3 rounded-lg">
                    <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      Your verification is processed securely by ComplyCube. After completion, you'll be redirected back to ChainPass automatically.
                    </p>
                  </div>
                </>
              ) : verificationState === "error" && (
                <div className="text-center py-16">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                  <p className="text-destructive mb-4">Failed to prepare verification session</p>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Request Body Modal */}
        <Dialog open={requestBodyModalOpen} onOpenChange={setRequestBodyModalOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                ComplyCube SDK Debug
              </DialogTitle>
              <DialogDescription>
                ComplyCube API request and response data
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {complycubeRequest && (
                <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-primary mb-1">ComplyCube Client Creation Request:</p>
                        <code className="block p-3 bg-background/50 rounded text-xs break-all font-mono whitespace-pre-wrap">
                          {JSON.stringify(complycubeRequest.clientCreation, null, 2)}
                        </code>
                      </div>
                      
                      <div>
                        <p className="text-sm font-semibold text-primary mb-1">ComplyCube Token Generation Request:</p>
                        <code className="block p-3 bg-background/50 rounded text-xs break-all font-mono whitespace-pre-wrap">
                          {JSON.stringify(complycubeRequest.tokenGeneration, null, 2)}
                        </code>
                      </div>

                      {complycubeRequest.flowSessionRequest && (
                        <div>
                          <p className="text-sm font-semibold text-primary mb-1">ComplyCube Flow Session Request:</p>
                          <code className="block p-3 bg-background/50 rounded text-xs break-all font-mono whitespace-pre-wrap">
                            {JSON.stringify(complycubeRequest.flowSessionRequest, null, 2)}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {complycubeResponse && (
                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-green-700 mb-1">ComplyCube Client ID:</p>
                        <code className="block p-3 bg-background/50 rounded text-xs break-all font-mono">
                          {complycubeResponse.clientId}
                        </code>
                      </div>

                      {complycubeResponse.flowSessionResponse && (
                        <div>
                          <p className="text-sm font-semibold text-green-700 mb-1">ComplyCube Flow Session Response:</p>
                          <code className="block p-3 bg-background/50 rounded text-xs break-all font-mono whitespace-pre-wrap">
                            {JSON.stringify(complycubeResponse.flowSessionResponse, null, 2)}
                          </code>
                        </div>
                      )}

                      {redirectUrl && (
                        <div>
                          <p className="text-sm font-semibold text-green-700 mb-1">Redirect URL:</p>
                          <code className="block p-3 bg-background/50 rounded text-xs break-all font-mono">
                            {redirectUrl}
                          </code>
                        </div>
                      )}

                      {complycubeResponse.flowSessionError && (
                        <div>
                          <p className="text-sm font-semibold text-destructive mb-1">Flow Session Error:</p>
                          <code className="block p-3 bg-destructive/10 border border-destructive/30 rounded text-xs break-all font-mono">
                            {complycubeResponse.flowSessionError}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {errorMessage && (
                <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-destructive mb-1">Error:</p>
                      <code className="block p-3 bg-background/50 rounded text-xs break-all font-mono text-destructive whitespace-pre-wrap">
                        {errorMessage}
                      </code>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    let copyData = "";
                    if (complycubeRequest) {
                      copyData += `ComplyCube Request:\n${JSON.stringify(complycubeRequest, null, 2)}`;
                    }
                    if (complycubeResponse) {
                      copyData += `\n\nComplyCube Response:\n${JSON.stringify(complycubeResponse, null, 2)}`;
                    }
                    if (errorMessage) {
                      copyData += `\n\nError:\n${errorMessage}`;
                    }
                    navigator.clipboard.writeText(copyData);
                    toast({
                      title: "Copied!",
                      description: "ComplyCube data copied to clipboard",
                    });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Copy All
                </Button>
                <Button
                  onClick={() => {
                    setRequestBodyModalOpen(false);
                    setErrorMessage("");
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ComplyCube Flow Modal */}
        <Dialog open={showFlowModal} onOpenChange={setShowFlowModal}>
          <DialogContent className="max-w-4xl h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Complete Identity Verification</DialogTitle>
              <DialogDescription>
                Please complete the verification process in the window below
              </DialogDescription>
            </DialogHeader>
            {flowUrl && (
              <div className="px-6 pt-4">
                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <ExternalLink className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Redirect URL:</p>
                      <code className="block text-xs text-foreground/80 break-all font-mono mb-2">
                        {flowUrl}
                      </code>
                      <Button
                        size="sm"
                        onClick={() => {
                          const width = 800;
                          const height = 600;
                          const left = (window.screen.width - width) / 2;
                          const top = (window.screen.height - height) / 2;
                          window.open(
                            flowUrl,
                            'ComplyCubeVerification',
                            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
                          );
                        }}
                        className="gap-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open in Popup Window
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex-1 p-6 overflow-hidden relative">
              {iframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading verification flow...</p>
                  </div>
                </div>
              )}
              {flowUrl && (
                <iframe
                  src={flowUrl}
                  className="w-full h-full border-0 rounded-lg"
                  title="ComplyCube Verification Flow"
                  allow="camera;microphone"
                  onLoad={() => setIframeLoading(false)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
