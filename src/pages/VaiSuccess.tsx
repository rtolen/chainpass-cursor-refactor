import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Copy, Download, ExternalLink, Bookmark, Globe, Users, CheckCircle, Gift } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import { sessionManager } from "@/utils/sessionManager";
import { sendVAIToBusiness, redirectToBusiness, isBusinessVerification } from "@/utils/businessCallback";
import { useNavigate } from "react-router-dom";
import { useVAIStore } from "@/store/vaiStore";

const VaiSuccess = () => {
  const [displayVaiCode, setDisplayVaiCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isSendingCallback, setIsSendingCallback] = useState(false);
  const { t } = useTranslation();
  
  // Get V.A.I. from store
  const { vaiNumber: storeVAI } = useVAIStore();
  const navigate = useNavigate();
  const sessionVAI = sessionManager.getVaiCode();
  const vaiCode = storeVAI || sessionVAI;

  useEffect(() => {
    if (!vaiCode || vaiCode.startsWith('TEMP-')) {
      toast({
        title: "Error",
        description: "No valid V.A.I. found. Please complete verification first.",
        variant: "destructive"
      });
      navigate('/vai-processing');
      return;
    }
  }, [vaiCode, navigate]);

  useEffect(() => {
    if (!vaiCode) return;
    console.log('[VaiSuccess] Loading VAI number:', {
      fromStore: storeVAI,
      fromSessionManager: sessionVAI,
      finalCode: vaiCode
    });
    const displayCode = vaiCode.replace('LEO-', '');
    setDisplayVaiCode(displayCode);
    console.log('[VaiSuccess] VAI number set:', displayCode);
  }, [vaiCode, storeVAI, sessionVAI]);

  // Automatically send callback if this is a business verification
  useEffect(() => {
    if (vaiCode && isBusinessVerification()) {
      sendBusinessCallback();
    }
  }, [vaiCode]);

  const copyVAI = () => {
    navigator.clipboard.writeText(displayVaiCode);
    toast.success("V.A.I. copied to clipboard!");
  };

  const downloadQR = async () => {
    try {
      const qrCode = await QRCode.toDataURL(displayVaiCode, {
        width: 500,
        color: {
          dark: '#3b82f6',
          light: '#1a1a2e'
        }
      });
      
      const link = document.createElement('a');
      link.href = qrCode;
      link.download = 'my-vai-code.png';
      link.click();
      
      toast.success("QR code downloaded!");
    } catch (error) {
      toast.error("Failed to generate QR code");
    }
  };

  const sendBusinessCallback = async () => {
    if (isSendingCallback) return;
    
    setIsSendingCallback(true);
    try {
      const verificationRecordId = sessionManager.getVerificationRecordId();
      if (!verificationRecordId) {
        toast.error("Verification record not found");
        return;
      }

      // Fetch verification data to send in callback
      // This would normally come from your database
      const verificationData = {
        vai_number: vaiCode!,
        biometric_photo_url: sessionStorage.getItem('complycube_photo_url') || '',
        complycube_transaction_number: sessionStorage.getItem('complycube_client_id') || '',
        le_disclosure_accepted: sessionStorage.getItem('userType') === 'law-enforcement',
        signature_agreement_accepted: true,
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

  const continueToBusinessOrVairify = () => {
    if (isBusinessVerification()) {
      redirectToBusiness();
    } else {
      const encodedVai = encodeURIComponent(displayVaiCode);
      window.location.href = `https://login-vairify.lovable.app/login?vai=${encodedVai}`;
    }
  };

  const handleReferralSubmit = () => {
    const alphanumeric = /^[A-Z0-9]{7}$/;
    if (!alphanumeric.test(referralCode.toUpperCase())) {
      toast.error("Referral code must be exactly 7 alphanumeric characters");
      return;
    }
    
    toast.success("Referral code submitted successfully!");
    // Here you would typically send the referral code to your backend
  };

  const handleReferralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 7) {
      setReferralCode(value);
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
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-500/20 mb-4 md:mb-6 animate-scale-in">
            <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-green-500 animate-pulse" />
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4 px-4">
            {t('success.title')}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground px-4">
            {t('success.subtitle')}
          </p>
        </div>

        {/* V.A.I. Display Card */}
        <Card className="max-w-[600px] mx-auto mb-8 bg-gradient-to-br from-blue-600/10 to-purple-600/10 backdrop-blur-sm border-blue-500/30 animate-fade-in" 
              style={{ boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)' }}>
          <CardContent className="p-8 md:p-12 text-center">
            {/* Success Icon */}
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
            
            {/* Label */}
            <p className="text-blue-400 text-base font-medium tracking-wide mb-4">
              Your V.A.I. Code
            </p>
            
            {/* V.A.I. Code */}
            <p className="font-mono text-4xl md:text-5xl font-bold text-white tracking-[0.25em] mb-3">
              {displayVaiCode}
            </p>
            
            {/* Verified Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 mb-4">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-400 text-sm font-semibold">Verified</span>
            </div>
            
            {/* Description */}
            <p className="text-muted-foreground text-sm">
              This is your unique Verified Anonymous Identity code
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 max-w-[600px] mx-auto mb-12">
          <Button
            onClick={copyVAI}
            variant="outline"
            className="flex-1 h-12 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
          >
            <Copy className="w-5 h-5 mr-2" />
            Copy Code
          </Button>
          
          <Button
            onClick={downloadQR}
            variant="outline"
            className="flex-1 h-12 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Download QR Code
          </Button>
        </div>

        {/* Educational Section - NEW */}
        <div className="max-w-[600px] mx-auto mb-12 animate-fade-in">
          <div className="bg-gradient-to-br from-blue-600/5 to-purple-600/5 border border-white/10 rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
              💡 Your V.A.I. Can Be Used To:
            </h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-gray-300">Log in to Vairify</p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-gray-300">Sign legal agreements</p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-gray-300">Verify your identity safely</p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-gray-300">Access ChainPass-verified services</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-400 italic text-center">
              Your V.A.I. works like a username – but keeps you anonymous
            </p>
          </div>
        </div>

        {/* What's Next Section */}
        <div className="max-w-[600px] mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">
            What's Next?
          </h2>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">1</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Bookmark className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-semibold text-base md:text-lg">
                    Save Your V.A.I. Code
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Store it securely – you'll need it to access Vairify
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">2</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-semibold text-base md:text-lg">
                    Visit Vairify
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Use your V.A.I. to create your verified profile
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">3</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-semibold text-base md:text-lg">
                    Start Connecting
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Meet verified people while maintaining your privacy
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Code Section */}
        <div className="max-w-[600px] mx-auto mb-12 animate-fade-in">
          <Card className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 backdrop-blur-sm border-purple-500/30">
            <CardContent className="p-6 md:p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/20 mb-4">
                  <Gift className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t('success.referral.title')}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('success.referral.description')}
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  type="text"
                  placeholder={t('success.referral.placeholder')}
                  value={referralCode}
                  onChange={handleReferralChange}
                  maxLength={7}
                  className="flex-1 h-12 text-center font-mono text-lg tracking-widest uppercase bg-background/50 border-purple-500/50 focus:border-purple-500"
                />
                <Button
                  onClick={handleReferralSubmit}
                  disabled={referralCode.length !== 7}
                  className="h-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('success.referral.submit')}
                </Button>
              </div>
              
              <p className="text-xs text-gray-400 text-center mt-4">
                Referred by a friend? Enter their code to help them earn rewards
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA Card */}
        <Card className="max-w-[600px] mx-auto bg-gradient-to-r from-blue-600 to-purple-600 border-none animate-fade-in"
              style={{ boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Logo */}
              <img src={chainpassLogo} alt="ChainPass" className="h-8 flex-shrink-0 opacity-90" />
              
              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-white text-xl font-bold mb-2">
                  Ready to join Vairify?
                </h3>
                <p className="text-gray-200 text-sm mb-1">
                  Use your V.A.I. code to create your verified anonymous profile and start connecting with real, verified people.
                </p>
              </div>
              
              {/* Button */}
              <Button
                onClick={continueToBusinessOrVairify}
                className="w-full md:w-auto bg-white text-blue-600 font-semibold hover:bg-gray-100 transition-all h-12 px-6"
              >
                {isBusinessVerification() ? 'Continue to Partner Site' : 'Continue to Vairify'}
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
            
            {/* Footer text */}
            <p className="text-center text-gray-300 text-sm mt-4">
              🔒 Your identity stays anonymous
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VaiSuccess;
