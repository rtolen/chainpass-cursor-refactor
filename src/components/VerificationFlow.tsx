import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { BenefitCard } from "@/components/BenefitCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { User, CheckCircle, EyeOff, Users, Repeat, ArrowRight, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import vairifyLogo from "@/assets/vairify-logo.svg";
import complycubeLogo from "@/assets/complycube-logo.svg";
import { verificationNavigator } from "@/utils/verificationNavigation";
import { sessionManager } from "@/utils/sessionManager";

export const VerificationFlow = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const businessId = sessionManager.getBusinessId();
  const businessName = verificationNavigator.getBusinessName();
  const totalSteps = verificationNavigator.getTotalSteps();
  
  // Determine which logo to show
  const getBusinessLogo = () => {
    if (businessId === 'vairify') return vairifyLogo;
    return chainpassLogo;
  };
  
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        {/* Header with Logo and Language Switcher */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1" />
          <div className="text-center flex-1">
            <img 
              src={getBusinessLogo()} 
              alt={businessName} 
              className="h-20 md:h-28 lg:h-32 mx-auto"
            />
            {businessId && (
              <p className="mt-2 text-sm text-muted-foreground">Powered by ChainPass</p>
            )}
          </div>
          <div className="flex-1 flex justify-end">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator currentStep={1} totalSteps={totalSteps + 1} />

        {/* Main Card */}
        <Card className="glass shadow-card animate-slide-up">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-3xl md:text-4xl">V.A.I.</CardTitle>
            <CardDescription className="text-lg md:text-xl text-foreground">
              Verified Anonymous Identity
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Visual Example */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 gradient-glow rounded-xl border border-primary/30 text-center transition-smooth hover:shadow-glow">
                <div className="w-20 h-20 mx-auto bg-secondary rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Verified Photo</p>
                <p className="text-xs text-muted-foreground/70">(from your ID)</p>
              </div>
              
              <div className="p-6 gradient-glow rounded-xl border border-accent/30 text-center transition-smooth hover:shadow-glow">
                <div className="mt-6 px-4 py-3 bg-secondary rounded-lg">
                  <p className="text-2xl font-mono font-bold">9I7T35L</p>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">V.A.I. Code</p>
                <p className="text-xs text-muted-foreground/70">(unique to you)</p>
              </div>
            </div>

            <p className="text-center text-foreground">
              That's it. <span className="font-semibold">No name. No address. No personal data.</span>
            </p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BenefitCard
                icon={CheckCircle}
                title="VERIFIED"
                description="Proves you're a real adult (18+)"
                color="success"
              />
              <BenefitCard
                icon={EyeOff}
                title="ANONYMOUS"
                description="No identity data stored"
                color="accent"
              />
              <BenefitCard
                icon={Users}
                title="ACCOUNTABLE"
                description="Every action links to your V.A.I."
                color="primary"
              />
              <BenefitCard
                icon={Repeat}
                title="PORTABLE"
                description="Works on all ChainPass platforms"
                color="destructive"
              />
            </div>

            {/* Data Flow Diagram */}
            <div className="p-6 gradient-glow rounded-lg border border-primary/20">
              <h3 className="font-semibold text-center mb-6 text-lg">How Your Data is Protected:</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <img src={complycubeLogo} alt="Comply Cube" className="h-8 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-semibold">Comply Cube</span> verifies ID → Provides ChainPass with verified photo from KYC process
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <img src={chainpassLogo} alt="ChainPass" className="h-8 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-semibold">ChainPass</span> receives verified photo → Generates V.A.I. code
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <img src={getBusinessLogo()} alt={businessName} className="h-8 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-semibold">{businessName}</span> gets V.A.I. → No identity data
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="mt-4 text-xs text-center text-muted-foreground">
                Your identity data stays with the licensed KYC provider (bank-level security)
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                className="flex-1 h-14 text-lg gradient-primary hover:opacity-90 transition-smooth shadow-glow group"
                onClick={() => navigate("/pricing")}
              >
                Continue to Pricing
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-smooth" />
              </Button>
              
              <Button
                variant="outline"
                className="flex-1 h-14 text-lg border-2 hover:bg-accent transition-smooth group"
                onClick={() => navigate("/business-partner-registration")}
              >
                <Building2 className="mr-2 h-5 w-5" />
                Business Partners
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex justify-center items-center gap-6 pt-8 opacity-60">
          <img src={chainpassLogo} alt="ChainPass" className="h-16" />
          <img src={vairifyLogo} alt="Vairify" className="h-8" />
          <img src={complycubeLogo} alt="Comply Cube" className="h-8" />
        </div>
      </div>
    </div>
  );
};
