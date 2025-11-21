import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sessionManager } from "@/utils/sessionManager";
import { VerificationFlow } from "@/components/VerificationFlow";

const BusinessVerificationStart = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    if (!businessId) {
      toast.error("No business selected");
      navigate('/');
      return;
    }

    loadBusinessConfig();
  }, [businessId, navigate]);

  const loadBusinessConfig = async () => {
    try {
      // First, validate business exists (quick check)
      const { data: businessExists, error: checkError } = await supabase
        .from("business_configurations")
        .select("business_id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .single();

      if (checkError || !businessExists) {
        toast.error("Invalid Business ID", {
          description: "The business ID provided is not recognized.",
        });
        navigate('/');
        return;
      }

      // Fetch full config via edge function (secure, includes API key)
      const { data, error } = await supabase.functions.invoke("get-business-config", {
        body: { businessId }
      });

      if (error) throw error;

      if (data?.config) {
        const businessConfig = data.config;
        
        // Store business configuration for the flow
        sessionManager.setBusinessId(businessId);
        sessionManager.setBusinessConfig(JSON.stringify(businessConfig));

        console.log(`Starting verification for: ${businessConfig.business_name}`);
        
        toast.success(`${businessConfig.business_name} Verification`, {
          description: `Starting V.A.I. verification process`,
        });

        setConfigLoaded(true);
      } else {
        throw new Error("No config returned");
      }
    } catch (error) {
      console.error("Error loading business config:", error);
      toast.error("Error", {
        description: "Could not load business configuration. Please try again.",
      });
      navigate('/');
    }

    // Check for incoming redirect with user_id
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id');
    if (userId) {
      sessionManager.setBusinessUserId(userId);
      console.log(`External user redirect detected: ${userId}`);
    }
  };

  if (!configLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading business configuration...</p>
        </div>
      </div>
    );
  }

  return <VerificationFlow />;
};

export default BusinessVerificationStart;
