import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Wallet, Coins, Tag, X } from "lucide-react";
import { ProgressStepsIndicator } from "@/components/ProgressStepsIndicator";
import { StripePaymentForm } from "@/components/StripePaymentForm";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

type PaymentMethod = "card" | "paypal" | "crypto";

export default function PaymentForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [basePrice, setBasePrice] = useState(99.00);
  const [finalPrice, setFinalPrice] = useState(99.00);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPaymentIntent, setLoadingPaymentIntent] = useState(false);

  const isFullyDiscounted = appliedCoupon?.discount_percentage === 100;

  useEffect(() => {
    const savedMethod = sessionStorage.getItem("payment_method") as PaymentMethod;
    if (savedMethod) setPaymentMethod(savedMethod);
    
    loadPricing();
    const savedCoupon = sessionStorage.getItem("applied_coupon");
    if (savedCoupon) {
      const coupon = JSON.parse(savedCoupon);
      setAppliedCoupon(coupon);
      setCouponCode(coupon.code);
    }
  }, []);

  useEffect(() => {
    calculateFinalPrice(basePrice, appliedCoupon);
  }, [basePrice, appliedCoupon]);

  useEffect(() => {
    if (!isFullyDiscounted && (paymentMethod === "card" || paymentMethod === "paypal")) {
      createPaymentIntent();
    }
  }, [finalPrice, paymentMethod, isFullyDiscounted]);

  const createPaymentIntent = async () => {
    if (finalPrice <= 0) return;
    
    setLoadingPaymentIntent(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: {
          amount: Math.round(finalPrice * 100),
          currency: "usd",
          paymentMethod,
        }
      });

      if (error) throw error;
      if (data?.clientSecret) {
        setClientSecret(data.clientSecret);
      }
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      toast({ 
        title: "Payment Setup Failed", 
        description: "Unable to initialize payment. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setLoadingPaymentIntent(false);
    }
  };

  const loadPricing = async () => {
    try {
      const { data } = await supabase.from("pricing_config").select("base_price").eq("product_name", "vai_verification").single();
      if (data) {
        setBasePrice(data.base_price);
        setFinalPrice(data.base_price);
      }
    } catch (error) {
      console.error("Error loading pricing:", error);
    }
  };

  const calculateFinalPrice = (price: number, coupon: any) => {
    if (!coupon) {
      setFinalPrice(price);
      return;
    }
    const discount = coupon.discount_type === "percentage" ? price * (coupon.discount_value / 100) : coupon.discount_value;
    setFinalPrice(Math.max(0, price - discount));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const sessionId = sessionStorage.getItem("session_id") || crypto.randomUUID();
      sessionStorage.setItem("session_id", sessionId);
      const { data, error } = await supabase.functions.invoke("validate-coupon", { body: { code: couponCode.toUpperCase(), sessionId } });
      if (error) throw error;
      if (data.valid) {
        setAppliedCoupon(data.coupon);
        sessionStorage.setItem("applied_coupon", JSON.stringify(data.coupon));
        toast({ title: "Coupon applied!", description: data.coupon.description || `${data.coupon.discount_percentage}% discount applied` });
      } else {
        toast({ title: "Invalid coupon", description: data.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setValidatingCoupon(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/pricing")} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
          <img src={chainpassLogo} alt="ChainPass" className="h-32" />
        </div>
        <ProgressStepsIndicator currentPath="/payment" />
        
        <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Tag className="w-5 h-5 text-primary mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Have a Coupon Code?</h3>
                <p className="text-sm text-muted-foreground">Enter your coupon code to receive a discount</p>
              </div>
            </div>
            {!appliedCoupon ? (
              <div className="flex gap-2">
                <Input placeholder="Enter coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()} />
                <Button onClick={handleApplyCoupon} disabled={!couponCode.trim() || validatingCoupon}>{validatingCoupon ? "Validating..." : "Apply"}</Button>
              </div>
            ) : (
              <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center"><Tag className="w-5 h-5 text-success" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="font-bold text-lg">{appliedCoupon.code}</code>
                      <Badge className="bg-success text-success-foreground">{appliedCoupon.discount_percentage}% OFF</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{appliedCoupon.description || "Discount applied"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setAppliedCoupon(null); setCouponCode(""); sessionStorage.removeItem("applied_coupon"); }}><X className="w-4 h-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        {isFullyDiscounted && (
          <Alert className="mb-6 border-success bg-success/10">
            <Tag className="w-4 h-4 text-success" />
            <AlertDescription className="text-success">Your coupon provides 100% discount! Click continue to proceed without payment.</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 order-1 lg:order-2">
            <Card className="glass shadow-card sticky top-8">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-lg">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><div><p className="font-medium">V.A.I. Creation</p><p className="text-xs text-muted-foreground">Annual verification</p></div><p className="font-medium">${basePrice.toFixed(2)}</p></div>
                  {appliedCoupon && <div className="flex justify-between text-success"><p className="font-medium">Discount ({appliedCoupon.code})</p><p className="font-medium">-${(basePrice - finalPrice).toFixed(2)}</p></div>}
                  <div className="border-t pt-3"><div className="flex justify-between items-center"><p className="font-semibold text-lg">Total</p><div className="text-right">{appliedCoupon && basePrice !== finalPrice && <p className="text-sm text-muted-foreground line-through">${basePrice.toFixed(2)}</p>}<p className="font-bold text-2xl gradient-primary bg-clip-text text-transparent">${finalPrice.toFixed(2)}</p></div></div></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 order-2 lg:order-1">
            <Card className="glass shadow-card">
              <CardContent className="p-6">
                {isFullyDiscounted ? (
                  <div className="space-y-4">
                    <Alert className="border-success bg-success/10"><AlertDescription className="text-success"><p className="font-semibold mb-2">Payment Not Required</p>Your 100% discount covers the full cost.</AlertDescription></Alert>
                    <Button onClick={async () => { const sessionId = sessionStorage.getItem("session_id"); await supabase.functions.invoke("record-coupon-usage", { body: { couponId: appliedCoupon.id, sessionId, userEmail: sessionStorage.getItem("user_email") } }); sessionStorage.setItem("payment_status", "completed_comp"); navigate("/verification-transition"); }} className="w-full" size="lg">Continue to Verification</Button>
                  </div>
                ) : stripePromise && clientSecret && (paymentMethod === "card" || paymentMethod === "paypal") ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}><StripePaymentForm paymentMethod={paymentMethod} amount={finalPrice} appliedCoupon={appliedCoupon} clientSecret={clientSecret} /></Elements>
                ) : loadingPaymentIntent ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Setting up payment...</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
