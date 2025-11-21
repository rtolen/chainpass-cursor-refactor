import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowRight, Shield, Lock, Users, Loader2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import vairifyLogo from "@/assets/vairify-logo.svg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BusinessCardProps {
  id: string;
  name: string;
  description: string;
  logo: string;
  features: string[];
  onClick: () => void;
}

const BusinessCard = ({ name, description, logo, features, onClick }: BusinessCardProps) => (
  <Card className="glass shadow-card transition-smooth hover:shadow-glow hover:border-primary/50 cursor-pointer group" onClick={onClick}>
    <CardHeader className="space-y-4">
      <div className="flex items-center justify-between">
        <img src={logo} alt={name} className="h-12 w-auto" />
        <Badge variant="secondary" className="text-xs">
          VAI Enabled
        </Badge>
      </div>
      <div>
        <CardTitle className="text-2xl group-hover:text-primary transition-smooth">{name}</CardTitle>
        <CardDescription className="mt-2 text-base">{description}</CardDescription>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
      <Button className="w-full group-hover:shadow-glow transition-smooth">
        Start Verification
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </CardContent>
  </Card>
);

interface BusinessConfig {
  business_id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  required_steps: string[];
}

export const BusinessSelection = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<BusinessConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Load businesses from database
  useEffect(() => {
    loadBusinessConfigs();
  }, []);

  // Check for business parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const businessParam = urlParams.get('business');
    
    if (businessParam && businesses.length > 0) {
      const businessExists = businesses.some(b => b.business_id === businessParam);
      if (businessExists) {
        navigate(`/${businessParam}/verify`);
      } else {
        toast.error("Invalid business parameter", {
          description: "The business specified in the URL is not recognized.",
        });
      }
    }
  }, [businesses, navigate]);

  const loadBusinessConfigs = async () => {
    try {
      // Fetch list of active businesses (public fields only)
      const { data, error } = await supabase
        .from("business_configurations")
        .select("business_id, business_name, description, logo_url, required_steps")
        .eq("is_active", true);

      if (error) throw error;

      setBusinesses(data || []);
    } catch (error) {
      console.error("Error loading business configs:", error);
      toast.error("Error", {
        description: "Could not load business options. Please refresh the page.",
      });
      // Fallback to hardcoded list if database fails
      setBusinesses([
        {
          business_id: 'vairify',
          business_name: 'Vairify',
          description: 'Dating safety & verification for law enforcement',
          logo_url: null,
          required_steps: []
        },
        {
          business_id: 'vaivault',
          business_name: 'VAI VAULT',
          description: 'Anonymous encrypted storage via ChainPass VAI',
          logo_url: null,
          required_steps: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getBusinessLogo = (businessId: string, logoUrl: string | null) => {
    if (logoUrl) return logoUrl;
    // Fallback to hardcoded logos
    return businessId === 'vairify' ? vairifyLogo : chainpassLogo;
  };

  const getBusinessFeatures = (businessId: string, requiredSteps: string[]) => {
    // Generate features based on required steps or use defaults
    if (businessId === 'vairify') {
      return [
        'Anonymous identity verification',
        'Law enforcement declaration',
        'Secure signature agreement',
        'Portable VAI code'
      ];
    } else if (businessId === 'vaivault') {
      return [
        'Client-side AES-256 encryption',
        'Stored anonymously with VAI',
        'Zero-knowledge architecture',
        'Accessible across all devices'
      ];
    }
    return ['Secure verification', 'Anonymous identity', 'Portable VAI code'];
  };

  const handleBusinessSelect = (businessId: string) => {
    // Navigate to V.A.I. intro page first
    navigate('/vai-intro');
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-12 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1" />
          <div className="text-center flex-1">
            <img 
              src={chainpassLogo} 
              alt="ChainPass" 
              className="h-20 md:h-28 lg:h-32 mx-auto mb-4"
            />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              ChainPass VAI Infrastructure
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Verified Anonymous Identity system powering secure verification across multiple platforms
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass border-primary/30">
            <CardContent className="pt-6 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold text-lg mb-2">One Verification</h3>
              <p className="text-sm text-muted-foreground">
                Complete verification once, use everywhere
              </p>
            </CardContent>
          </Card>
          
          <Card className="glass border-accent/30">
            <CardContent className="pt-6 text-center">
              <Lock className="w-12 h-12 mx-auto mb-4 text-accent" />
              <h3 className="font-semibold text-lg mb-2">Anonymous & Safe</h3>
              <p className="text-sm text-muted-foreground">
                Your identity stays private with zero-knowledge proofs
              </p>
            </CardContent>
          </Card>
          
          <Card className="glass border-success/30">
            <CardContent className="pt-6 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-success" />
              <h3 className="font-semibold text-lg mb-2">Multi-Platform</h3>
              <p className="text-sm text-muted-foreground">
                Use your VAI across all partner businesses
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Business Selection */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Choose Your Platform</h2>
            <p className="text-muted-foreground">
              Select the business you want to get verified for
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {businesses.map((business) => (
                <BusinessCard
                  key={business.business_id}
                  id={business.business_id}
                  name={business.business_name}
                  description={business.description || ''}
                  logo={getBusinessLogo(business.business_id, business.logo_url)}
                  features={getBusinessFeatures(business.business_id, business.required_steps)}
                  onClick={() => handleBusinessSelect(business.business_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Business Partner CTA */}
        <Card className="glass border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="py-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-bold mb-2">Business Partners</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Integrate VAI verification into your platform and provide secure, anonymous identity verification to your users
            </p>
            <Button variant="outline" size="lg" onClick={() => navigate('/business-partner-registration')}>
              Become a Partner
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
