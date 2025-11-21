import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Copy, Download, ExternalLink, AlertTriangle, Bookmark, Globe, FileText } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import { sessionManager } from "@/utils/sessionManager";
import { sendVAIToBusiness, redirectToBusiness, isBusinessVerification } from "@/utils/businessCallback";
import { useVAIStore } from "@/store/vaiStore";

const LEOVaiSuccess = () => {
  const [vaiCode, setVaiCode] = useState("");
  const [isSendingCallback, setIsSendingCallback] = useState(false);
  
  // Get V.A.I. from store
  const { vaiNumber } = useVAIStore();

  // Load V.A.I. code from session on mount
  useEffect(() => {
    // Check store first, then sessionManager as fallback
    const code = vaiNumber || sessionManager.getVaiCode();
    if (code) {
      // Always display with LEO- prefix on this page
      const displayCode = code.startsWith('LEO-') ? code : `LEO-${code}`;
      setVaiCode(displayCode);
    } else {
      // If no code in session, redirect to start
      toast.error("No V.A.I. code found. Please complete the verification process.");
      window.location.href = '/';
    }
  }, [vaiNumber]);

  // Automatically send callback if this is a business verification
  useEffect(() => {
    if (vaiCode && isBusinessVerification()) {
      sendBusinessCallback();
    }
  }, [vaiCode]);

  const sendBusinessCallback = async () => {
    if (isSendingCallback) return;
    
    setIsSendingCallback(true);
    try {
      const verificationRecordId = sessionManager.getVerificationRecordId();
      if (!verificationRecordId) {
        toast.error("Verification record not found");
        return;
      }

      // Always send the base code (without LEO- prefix) to business
      const baseCode = vaiCode.replace('LEO-', '');
      
      const verificationData = {
        vai_number: baseCode,
        biometric_photo_url: '',
        complycube_transaction_number: '',
        le_disclosure_accepted: true, // LEO status
        signature_agreement_accepted: false,
      };

      await sendVAIToBusiness(verificationData);
      toast.success("Verification data sent successfully!");
    } catch (error) {
      console.error('Error sending business callback:', error);
      toast.error("Failed to send verification data. You can try again later.");
    } finally {
      setIsSendingCallback(false);
    }
  };

  const copyLEOCode = () => {
    navigator.clipboard.writeText(vaiCode);
    toast.success("LEO V.A.I. copied to clipboard!", {
      icon: "🛡️"
    });
  };

  const downloadQR = async () => {
    try {
      const qrCode = await QRCode.toDataURL(vaiCode, {
        width: 500,
        color: {
          dark: '#FFD700',
          light: '#1a1a2e'
        }
      });
      
      const link = document.createElement('a');
      link.href = qrCode;
      link.download = 'leo-vai-badge.png';
      link.click();
      
      toast.success("LEO badge QR downloaded!");
    } catch (error) {
      toast.error("Failed to generate QR code");
    }
  };

  const continueToBusinessOrVairify = () => {
    if (isBusinessVerification()) {
      redirectToBusiness();
    } else {
      const encodedVai = encodeURIComponent(vaiCode);
      window.location.href = `https://login-vairify.lovable.app/login?vai=${encodedVai}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* ChainPass Logo */}
        <div className="flex justify-end mb-6 md:mb-8">
          <img src={chainpassLogo} alt="ChainPass" className="h-6 md:h-8" />
        </div>

        {/* Success Animation */}
        <div className="text-center mb-6 md:mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#FFD700]/20 mb-4 md:mb-6 animate-scale-in">
            <Shield className="w-10 h-10 md:w-12 md:h-12 text-[#FFD700] animate-pulse" />
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4 px-4">
            LEO V.A.I. Created Successfully! 🛡️
          </h1>
          <p className="text-base md:text-lg text-muted-foreground px-4">
            Your Law Enforcement Verifiable Anonymous Identity is ready
          </p>
        </div>

        {/* LEO V.A.I. Display Card */}
        <Card className="max-w-[600px] mx-auto mb-8 bg-gradient-to-br from-[#FFD700]/10 to-[#FFA500]/10 backdrop-blur-sm border-[#FFD700]/30 animate-fade-in" 
              style={{ 
                borderWidth: '2px',
                borderImage: 'linear-gradient(135deg, #FFD700, #FFA500) 1',
                boxShadow: '0 0 30px rgba(255, 215, 0, 0.3)'
              }}>
          <CardContent className="p-8 md:p-12 text-center">
            {/* Badge Icon */}
            <Shield className="w-16 h-16 text-[#FFD700] mx-auto mb-6 animate-pulse" />
            
            {/* Label */}
            <p className="text-[#FFD700] text-base font-medium tracking-wide mb-4">
              Your LEO V.A.I. Code
            </p>
            
            {/* V.A.I. Code */}
            <p className="font-mono text-4xl md:text-5xl font-bold text-white tracking-[0.25em] mb-3">
              {vaiCode}
            </p>
            
            {/* Status Label */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD700]/20 mb-4">
              <Shield className="w-4 h-4 text-[#FFD700]" />
              <span className="text-[#FFD700] text-sm font-bold tracking-widest">LAW ENFORCEMENT OFFICER</span>
            </div>
            
            {/* Description */}
            <p className="text-muted-foreground text-sm">
              This is your unique Law Enforcement V.A.I. code
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 max-w-[600px] mx-auto mb-8">
          <Button
            onClick={copyLEOCode}
            variant="outline"
            className="flex-1 h-12 border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-black transition-colors"
          >
            <Copy className="w-5 h-5 mr-2" />
            Copy Code
          </Button>
          
          <Button
            onClick={downloadQR}
            variant="outline"
            className="flex-1 h-12 border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-black transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Download QR
          </Button>
        </div>

        {/* LEO Visibility Warning - CRITICAL SECTION */}
        <div className="max-w-[600px] mx-auto mb-12 animate-fade-in">
          <div className="bg-gradient-to-br from-[#FFD700]/12 to-[#FFA500]/12 border-2 border-[#FFD700]/40 rounded-xl p-6 md:p-8">
            <div className="flex items-start gap-4 mb-4">
              <AlertTriangle className="w-8 h-8 text-[#FFD700] flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-bold text-[#FFD700] mb-2">
                  ⚠️ VISIBILITY NOTICE
                </h3>
                <p className="text-white text-base font-medium mb-4">
                  Your law enforcement status is visible to ALL platform users in ALL interactions.
                </p>
                
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-3">When you use Vairify, all users will see:</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <p className="text-gray-300 text-sm">Gold LEO badge icon</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <p className="text-gray-300 text-sm">"LAW ENFORCEMENT OFFICER" label</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <p className="text-gray-300 text-sm">LEO- prefix on your V.A.I. code</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <p className="text-gray-300 text-sm">Gold highlighting on your profile</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-white text-sm font-bold">
                  This visibility cannot be changed or hidden.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Educational Section - LEO Version */}
        <div className="max-w-[600px] mx-auto mb-12 animate-fade-in">
          <div className="bg-gradient-to-br from-[#FFD700]/8 to-[#FFA500]/8 border border-[#FFD700]/20 rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
              💡 Your LEO V.A.I. Can Be Used To:
            </h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                <p className="text-gray-300">Log in to Vairify with LEO status</p>
              </div>
              
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                <p className="text-gray-300">Sign legal agreements as LEO</p>
              </div>
              
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                <p className="text-gray-300">Verify your identity as law enforcement</p>
              </div>
              
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                <p className="text-gray-300">Access ChainPass-verified services</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-400 italic text-center">
              Your LEO V.A.I. works like a username – but identifies you as law enforcement
            </p>
          </div>
        </div>

        {/* What's Next Section - LEO Version */}
        <div className="max-w-[600px] mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">
            What's Next?
          </h2>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FFD700] flex items-center justify-center flex-shrink-0">
                <span className="text-black font-bold">1</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Bookmark className="w-5 h-5 text-[#FFD700]" />
                  <h3 className="text-white font-semibold text-base md:text-lg">
                    Save Your LEO V.A.I. Code
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Store it securely – you'll need it to access Vairify with your LEO status
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FFD700] flex items-center justify-center flex-shrink-0">
                <span className="text-black font-bold">2</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-5 h-5 text-[#FFD700]" />
                  <h3 className="text-white font-semibold text-base md:text-lg">
                    Visit Vairify
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Use your LEO V.A.I. to create your law enforcement profile
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FFD700] flex items-center justify-center flex-shrink-0">
                <span className="text-black font-bold">3</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5 text-[#FFD700]" />
                  <h3 className="text-white font-semibold text-base md:text-lg">
                    Understand LEO Requirements
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Review platform use guidelines for law enforcement officers
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Card - LEO Version */}
        <Card className="max-w-[600px] mx-auto bg-gradient-to-r from-[#FFD700]/15 to-[#FFA500]/15 border border-[#FFD700]/30 animate-fade-in"
              style={{ boxShadow: '0 0 20px rgba(255, 215, 0, 0.2)' }}>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Logo */}
              <img src={chainpassLogo} alt="ChainPass" className="h-8 flex-shrink-0 opacity-90" />
              
              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-white text-xl font-bold mb-2">
                  Ready to join Vairify?
                </h3>
                <p className="text-gray-300 text-sm mb-1">
                  Use your LEO V.A.I. code to create your law enforcement profile. Your status will be visible to all users, ensuring transparency in all interactions.
                </p>
              </div>
              
              {/* Button */}
              <Button
                onClick={continueToBusinessOrVairify}
                className="w-full md:w-auto bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-semibold hover:from-[#FFC700] hover:to-[#FF9500] transition-all h-12 px-6"
              >
                {isBusinessVerification() ? 'Continue to Partner Site' : 'Continue to Vairify'}
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
            
            {/* Footer text */}
            <p className="text-center text-gray-400 text-sm mt-4 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-[#FFD700]" />
              Your LEO status is verified and visible
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LEOVaiSuccess;
