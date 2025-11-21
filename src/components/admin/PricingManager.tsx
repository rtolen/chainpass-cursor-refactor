import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Save } from "lucide-react";

interface PricingConfig {
  id: string;
  product_name: string;
  base_price: number;
  currency: string;
  is_active: boolean;
}

export function PricingManager() {
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [basePrice, setBasePrice] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      const { data, error } = await supabase
        .from("pricing_config")
        .select("*")
        .eq("product_name", "vai_verification")
        .single();

      if (error) throw error;
      setPricing(data);
      setBasePrice(data.base_price.toString());
    } catch (error: any) {
      toast({
        title: "Error loading pricing",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const newPrice = parseFloat(basePrice);
      
      if (isNaN(newPrice) || newPrice <= 0) {
        throw new Error("Please enter a valid price");
      }

      const { error } = await supabase
        .from("pricing_config")
        .update({ base_price: newPrice })
        .eq("product_name", "vai_verification");

      if (error) throw error;

      toast({
        title: "Pricing updated successfully",
        description: `Base price set to $${newPrice.toFixed(2)}`,
      });
      
      loadPricing();
    } catch (error: any) {
      toast({
        title: "Error updating pricing",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">Loading pricing...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Pricing Configuration
        </CardTitle>
        <CardDescription>Manage V.A.I. verification pricing</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="base_price">Base Price (USD)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="pl-7"
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Current price: ${pricing?.base_price.toFixed(2)} {pricing?.currency.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-semibold mb-2">Product Information</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-medium">V.A.I. Verification</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">Annual Subscription</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-success">Active</span>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
