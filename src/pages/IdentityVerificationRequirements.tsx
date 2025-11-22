//import { useHistory } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import chainpassLogo from "@/assets/chainpass-logo.svg";

export default function IdentityVerificationRequirements() {
  //const history = useHistory();
const navigate = useNavigate();
  const infoCards = [
    {
      icon: Shield,
      title: "What We'll Collect",
      items: [
        "Government-issued ID",
        "Live facial biometric",
        "Basic contact information",
        "Device verification",
      ],
    },
    {
      icon: Shield,
      title: "Why We Need This",
      items: [
        "Prevent fraud and identity theft",
        "Comply with KYC regulations",
        "Ensure platform safety",
        "Verify you're a real person",
      ],
    },
    {
      icon: Lock,
      title: "Your Privacy",
      items: [
        "Zero-knowledge architecture",
        "We never store your real identity",
        "ComplyCube handles verification",
        "Your data is encrypted",
      ],
    },
  ];

  const steps = [
    {
      number: 1,
      title: "Enter Personal Details",
      description: "Provide your legal name and basic information",
    },
    {
      number: 2,
      title: "Upload ID Document",
      description: "Government-issued ID (passport, driver's license, etc.)",
    },
    {
      number: 3,
      title: "Facial Verification",
      description: "Take a live selfie to confirm your identity",
    },
    {
      number: 4,
      title: "V.A.I. Generation",
      description: "Receive your verified anonymous identity number",
    },
  ];

  return (
    <div className="min-h-screen bg-[#1E293B] flex flex-col">
      {/* Header */}
      <header className="pt-8 pb-6 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <img
            src={chainpassLogo}
            alt="ChainPass"
            className="h-16 md:h-20 mx-auto mb-6"
          />
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
            Identity Verification Requirements
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            To comply with identity verification standards, we'll need to collect some basic information.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-12">
        <div className="max-w-6xl mx-auto space-y-12 animate-fade-in">
          {/* Section 1: Three Info Cards */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {infoCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <Card
                    key={index}
                    className="glass shadow-card hover:shadow-glow transition-smooth"
                  >
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mx-auto">
                        <Icon className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-center text-foreground">
                        {card.title}
                      </h3>
                      <ul className="space-y-2">
                        {card.items.map((item, itemIndex) => (
                          <li
                            key={itemIndex}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Section 2: What Happens Next Timeline */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-center text-white mb-8">
              What Happens Next
            </h2>
            <div className="space-y-6">
              {steps.map((step, index) => (
                <Card
                  key={index}
                  className="glass shadow-card hover:border-primary/50 transition-smooth"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
                          {step.number}
                        </div>
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          {step.title}
                        </h3>
                        <p className="text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Footer Section */}
          <section className="text-center space-y-6">
            <Card className="glass border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
                  Your information is handled by ComplyCube, a certified identity verification provider. ChainPass uses zero-knowledge architecture - we never see or store your real identity data.
                </p>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button
                //onClick={() => history.push("/verification-transition")}
                onClick={() => navigate("/verification-transition")}
                size="lg"
                className="w-full md:w-auto min-w-[280px] h-14 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-glow"
              >
                Continue to Verification
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <div>
                <button
                  onClick={() => {
                    // TODO: Open privacy policy modal or navigate to privacy page
                    console.log("Privacy practices clicked");
                  }}
                  className="text-sm text-muted-foreground hover:text-primary underline transition-colors"
                >
                  Learn more about our privacy practices
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

