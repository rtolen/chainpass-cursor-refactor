import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Check, CreditCard, ArrowLeft, Tag, Wallet, Coins } from "lucide-react";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import { cn } from "@/lib/utils";

type PaymentMethod = "card" | "paypal" | "crypto";

export default function PaymentSelection() {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");

  const benefits = [
    "Government ID verification",
    "V.A.I. code (annual renewal required)",
    "Complete anonymity (zero-knowledge)",
    "Usable on any ChainPass V.A.I. platform",
    "24/7 support",
  ];

  const trustSignals = [
    { icon: "🔒", text: "Secure Payment" },
    { icon: "💳", text: "Stripe" },
    { icon: "✓", text: "PCI Compliant" },
  ];

  const paymentMethods = [
    {
      id: "card" as PaymentMethod,
      icon: CreditCard,
      title: "Credit/Debit Card",
      description: "Visa, Mastercard, Amex",
      badge: "Most Popular",
    },
    {
      id: "paypal" as PaymentMethod,
      icon: Wallet,
      title: "PayPal",
      description: "Pay with your PayPal account",
      badge: null,
    },
    {
      id: "crypto" as PaymentMethod,
      icon: Coins,
      title: "Cryptocurrency",
      description: "Bitcoin, Ethereum, USDC",
      badge: "New",
    },
  ];

  const handleContinue = () => {
    // Store selected payment method and referral code in sessionStorage
    sessionStorage.setItem("payment_method", selectedMethod);
    if (referralCode) {
      sessionStorage.setItem("referral_code", referralCode);
    }
    navigate("/payment");
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
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

        {/* Main Pricing Card */}
        <Card className="glass shadow-card animate-slide-up">
          <CardHeader className="text-center space-y-4 pb-6">
            <CardTitle className="text-2xl md:text-3xl lg:text-4xl">Create Your V.A.I.</CardTitle>
            <div className="space-y-2">
              <div className="text-4xl md:text-5xl lg:text-6xl font-bold gradient-primary bg-clip-text text-transparent">
                $99
              </div>
              <p className="text-sm md:text-base text-muted-foreground">Annual verification</p>
              <p className="text-base md:text-lg text-foreground">Usable on any ChainPass V.A.I. platform</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Benefits List */}
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-success" />
                  </div>
                  <p className="text-foreground">{benefit}</p>
                </div>
              ))}
            </div>

            {/* What You're Paying For */}
            <div className="p-4 gradient-glow rounded-lg border border-primary/20">
              <h4 className="font-semibold mb-2">What you're paying for:</h4>
              <p className="text-sm text-muted-foreground">
                This covers identity verification through our licensed KYC provider (bank-level security)
              </p>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Select Payment Method</Label>
              <div className="grid gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedMethod === method.id;
                  
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={cn(
                        "relative p-4 rounded-lg border-2 transition-all text-left",
                        "hover:border-primary/50",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isSelected ? "bg-primary/20" : "bg-muted"
                        )}>
                          <Icon className={cn(
                            "w-5 h-5",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{method.title}</h4>
                            {method.badge && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                {method.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {method.description}
                          </p>
                        </div>
                        
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Referral/Coupon Code */}
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="flex items-center gap-2 text-foreground">
                <Tag className="w-4 h-4" />
                Referral or Coupon Code
              </Label>
              <Input
                id="referralCode"
                type="text"
                placeholder="Enter code (optional)"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="h-12 bg-card border-border"
              />
              {referralCode && (
                <p className="text-xs text-success flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Code: {referralCode}
                </p>
              )}
            </div>

            {/* Continue Button */}
            <Button
              size="lg"
              className="w-full h-14 text-lg"
              onClick={handleContinue}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Continue to {selectedMethod === "card" ? "Card Payment" : selectedMethod === "paypal" ? "PayPal" : "Crypto Payment"}
            </Button>

            {/* Trust Signals */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                {trustSignals.map((signal, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <span>{signal.icon}</span>
                    <span>{signal.text}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Your payment information is encrypted and never stored
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
