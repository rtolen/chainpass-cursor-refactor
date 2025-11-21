import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Camera, Lock, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import complycubeLogo from "@/assets/complycube-logo.svg";

export default function VaiIntro() {
  const navigate = useNavigate();

  const dataFlowSteps = [
    {
      provider: "ComplyCube",
      action: "Verifies ID → Stores identity data",
      icon: Shield,
    },
    {
      provider: "ChainPass",
      action: "Receives only verified photo → Generates V.A.I. code",
      icon: Camera,
    },
    {
      provider: "Vairify",
      action: "Gets V.A.I. → No identity data",
      icon: Lock,
    },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2 text-xs md:text-sm"
          >
            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <img src={chainpassLogo} alt="ChainPass" className="h-20 md:h-28 lg:h-32" />
        </div>

        {/* Main Card */}
        <Card className="glass shadow-card">
          <CardContent className="pt-8 space-y-8">
            {/* Title Section */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold gradient-text">
                One More Step
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                To unlock ChainPass features, you need a <span className="font-semibold text-primary">V.A.I.</span>{" "}
                (Verified Anonymous Identity)
              </p>
            </div>

            {/* V.A.I. Explanation */}
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-6 border border-primary/20">
              <div className="text-center mb-6">
                <div className="inline-block bg-primary/20 rounded-full px-6 py-3 mb-4">
                  <h2 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
                    V.A.I.
                  </h2>
                  <p className="text-sm text-muted-foreground">Verified Anonymous Identity</p>
                </div>
                <div className="text-4xl font-mono font-bold text-primary mb-2">
                  9I7T35L
                </div>
                <p className="text-xs text-muted-foreground">Example V.A.I. code</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-1" />
                  <p className="text-sm">
                    <span className="font-semibold">A verified photo + unique code</span>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-1" />
                  <p className="text-sm">
                    <span className="font-semibold">Proves you're real</span> (verified with government ID)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-1" />
                  <p className="text-sm">
                    <span className="font-semibold">Keeps you private</span> (no name/address stored)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-1" />
                  <p className="text-sm">
                    <span className="font-semibold">Works for every encounter</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-center text-sm font-medium text-foreground">
                  That's it. <span className="text-primary">No name. No address. No personal data.</span>
                </p>
              </div>
            </div>

            {/* How It Works */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-center">How it works:</h3>
              <div className="grid gap-4">
                {[
                  { num: 1, text: "Go to ChainPass (our verification partner)" },
                  { num: 2, text: "Upload your government ID" },
                  { num: 3, text: "Take a quick selfie" },
                  { num: 4, text: "Return here with your V.A.I." },
                ].map((step) => (
                  <div
                    key={step.num}
                    className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">{step.num}</span>
                    </div>
                    <p className="text-sm">{step.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Lock className="w-4 h-4 text-primary" />
                <span>Takes 3 minutes • Identity data never reaches Vairify</span>
              </div>
            </div>

            {/* Data Protection Section */}
            <div className="bg-card/30 rounded-lg p-6 border border-border/50">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                How Your Data is Protected
              </h3>
              <div className="space-y-3">
                {dataFlowSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <step.icon className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-sm">{step.provider}</p>
                      <p className="text-xs text-muted-foreground">{step.action}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-sm text-center font-medium text-primary">
                  Your identity data stays with the licensed KYC provider (bank-level security)
                </p>
              </div>
            </div>

            {/* What You'll Need */}
            <div className="bg-gradient-to-br from-accent/10 to-primary/10 rounded-lg p-6 border border-accent/20">
              <h3 className="text-lg font-bold mb-4">You'll need:</h3>
              <ul className="space-y-2 list-disc list-inside text-sm">
                <li>Government ID (license, passport, etc.)</li>
                <li>Smartphone camera</li>
              </ul>
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => navigate("/pricing")}
              size="lg"
              className="w-full h-14 text-lg gradient-primary hover:opacity-90 transition-smooth shadow-glow"
            >
              Get My V.A.I. Now (3 min)
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            {/* Trust Badge */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <img src={complycubeLogo} alt="ComplyCube" className="h-6 opacity-70" />
                <span className="text-xs text-muted-foreground">Licensed KYC Provider</span>
              </div>
              <p className="text-xs text-muted-foreground">
                🔒 Bank-level encryption | GDPR Compliant
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
