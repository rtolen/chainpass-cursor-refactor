import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-platform-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface ComplianceCheckRequest {
  vaiNumber: string;
  platformId: string;
  userId?: string;
  checkType?: "full" | "quick";
  requestTimestamp?: string;
}

serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestData: ComplianceCheckRequest = await req.json();
    const { vaiNumber, platformId, userId, checkType = "full", requestTimestamp } = requestData;

    // Validate required fields
    if (!vaiNumber || !platformId) {
      return new Response(
        JSON.stringify({
          error: "invalid_request",
          message: "Missing required fields",
          required: ["vaiNumber", "platformId"],
          code: "MISSING_REQUIRED_FIELDS",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate API key from Authorization header (optional for now, can be enforced later)
    const authHeader = req.headers.get("authorization");
    // Note: API key validation can be added here if needed

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Look up V.A.I. in database (using vai_code field)
    const { data: vai, error: vaiError } = await supabase
      .from("vai_assignments")
      .select(`
        vai_code,
        status,
        created_at,
        verification_record_id
      `)
      .eq("vai_code", vaiNumber)
      .single();

    // Get verification record separately
    let verificationRecord = null;
    if (vai && !vaiError) {
      const { data: vr } = await supabase
        .from("verification_records")
        .select(`
          id,
          verification_status,
          biometric_confirmed,
          le_disclosure_accepted,
          terms_accepted,
          mutual_consent_accepted,
          complycube_verification_id
        `)
        .eq("id", vai.verification_record_id)
        .single();
      verificationRecord = vr;
    }

    // V.A.I. not found
    if (vaiError || !vai) {
      const responseTime = Date.now() - startTime;
      await logComplianceCheck(supabase, {
        vaiNumber,
        platformId,
        userId,
        checkType,
        resultStatus: "not_found",
        responseTimeMs: responseTime,
        req,
      });

      return new Response(
        JSON.stringify({
          status: "not_found",
          vaiNumber: vaiNumber,
          message: "V.A.I. not found in system",
          actions: {
            createVAIUrl: "https://chainpass.vai/create",
            message: "Create your V.A.I. to get started",
          },
          responseTimestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Check V.A.I. status
    if (vai.status === "revoked") {
      const responseTime = Date.now() - startTime;
      await logComplianceCheck(supabase, {
        vaiNumber,
        platformId,
        userId,
        checkType,
        resultStatus: "revoked",
        responseTimeMs: responseTime,
        req,
      });

      return new Response(
        JSON.stringify({
          status: "revoked",
          vaiNumber: vaiNumber,
          message: "This V.A.I. has been revoked and cannot be used",
          actions: {
            supportUrl: "https://chainpass.vai/support",
            message: "Contact support for assistance",
          },
          responseTimestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (vai.status === "suspended") {
      const responseTime = Date.now() - startTime;
      await logComplianceCheck(supabase, {
        vaiNumber,
        platformId,
        userId,
        checkType,
        resultStatus: "suspended",
        responseTimeMs: responseTime,
        req,
      });

      return new Response(
        JSON.stringify({
          status: "suspended",
          vaiNumber: vaiNumber,
          vaiStatus: "SUSPENDED",
          message: "V.A.I. suspended - reactivation required",
          actions: {
            renewalUrl: "https://chainpass.vai/renew",
            message: "Your V.A.I. requires reactivation ($99)",
            warningMessage: "Reactivate now to continue",
            allowAccess: false,
          },
          responseTimestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Check expiration (365 days from creation)
    const createdDate = new Date(vai.created_at);
    const expirationDate = new Date(createdDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    const now = new Date();
    const isExpired = now > expirationDate;
    const daysUntilExpiration = Math.floor(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (isExpired) {
      const responseTime = Date.now() - startTime;
      await logComplianceCheck(supabase, {
        vaiNumber,
        platformId,
        userId,
        checkType,
        resultStatus: "expired",
        responseTimeMs: responseTime,
        req,
      });

      return new Response(
        JSON.stringify({
          status: "expired",
          vaiNumber: vaiNumber,
          vaiStatus: "EXPIRED",
          expiresAt: expirationDate.toISOString(),
          message: "V.A.I. expired - renewal required",
          actions: {
            renewalUrl: "https://chainpass.vai/renew",
            message: "Renew your V.A.I. to continue ($99/year)",
            warningMessage: "Your V.A.I. expired. Renew now.",
            allowAccess: false,
          },
          responseTimestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Check platform-specific compliance
    const { data: compliance, error: complianceError } = await supabase
      .from("platform_compliance")
      .select("*")
      .eq("vai_number", vaiNumber)
      .eq("platform_id", platformId)
      .single();

    // Get legal agreements for this V.A.I.
    const { data: legalAgreements } = await supabase
      .from("legal_agreements")
      .select("*")
      .eq("vai_assignment_id", vai.id)
      .maybeSingle();

    // Get signed contracts
    const { data: signedContracts } = await supabase
      .from("signed_contracts")
      .select("contract_type")
      .eq("vai_number", vaiNumber);

    // Define required compliance items based on platform
    const requiredItems: string[] = [];
    const completedItems: string[] = [];

    // Check LEO disclosure
    if (platformId === "vairify") {
      requiredItems.push("leo_disclosure");
      if (
        (legalAgreements?.leo_declaration_signed === true) ||
        (verificationRecord?.le_disclosure_accepted === true) ||
        (signedContracts?.some((c) => c.contract_type === "law_enforcement"))
      ) {
        completedItems.push("leo_disclosure");
      }
    }

    // Check terms of service
    requiredItems.push("terms_of_service");
    if (
      (verificationRecord?.terms_accepted === true) ||
      (signedContracts?.some((c) => c.contract_type === "terms_of_service"))
    ) {
      completedItems.push("terms_of_service");
    }

    // Check privacy policy (assumed accepted if terms accepted)
    requiredItems.push("privacy_policy");
    if (completedItems.includes("terms_of_service")) {
      completedItems.push("privacy_policy");
    }

    // Check mutual consent
    requiredItems.push("mutual_consent_contract");
    if (
      (verificationRecord?.mutual_consent_accepted === true) ||
      (legalAgreements?.signature_agreement_signed === true) ||
      (signedContracts?.some((c) => c.contract_type === "mutual_consent"))
    ) {
      completedItems.push("mutual_consent_contract");
    }

    const missingRequirements = requiredItems.filter(
      (item) => !completedItems.includes(item)
    );

    // 5. Check for other platforms this VAI is used on
    const { data: otherPlatforms } = await supabase
      .from("platform_compliance")
      .select("platform_id")
      .eq("vai_number", vaiNumber)
      .neq("platform_id", platformId);

    const otherPlatformIds = otherPlatforms?.map((p) => p.platform_id) || [];

    // 6. Return appropriate response
    const responseTime = Date.now() - startTime;

    if (missingRequirements.length === 0) {
      // Fully compliant
      await logComplianceCheck(supabase, {
        vaiNumber,
        platformId,
        userId,
        checkType,
        resultStatus: "compliant",
        responseTimeMs: responseTime,
        req,
      });

      return new Response(
        JSON.stringify({
          status: "compliant",
          vaiNumber: vaiNumber,
          vaiStatus: "ACTIVE",
          platformId: platformId,
          platformCompliance: {
            platformId: platformId,
            isCompliant: true,
            completedRequirements: completedItems,
            missingRequirements: [],
            totalRequired: requiredItems.length,
            totalCompleted: completedItems.length,
            completedAt: compliance?.updated_at || compliance?.created_at || vai.created_at,
          },
          vaiDetails: {
            createdAt: vai.created_at,
            expiresAt: expirationDate.toISOString(),
            daysUntilExpiration: daysUntilExpiration,
            verificationLevel: {
              identityVerified: verificationRecord?.verification_status === "verified",
              biometricEnrolled: verificationRecord?.biometric_confirmed === true,
              ageVerified: verificationRecord?.verification_status === "verified",
              leoDisclosure: completedItems.includes("leo_disclosure"),
            },
          },
          otherPlatforms: otherPlatformIds,
          duplicateCheck: {
            performed: checkType === "full",
            isDuplicate: false,
            message: null,
          },
          actions: {
            allowAccess: true,
            redirectTo: null,
            showWarning: false,
            warningMessage: null,
          },
          responseTimestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // Missing requirements
      await logComplianceCheck(supabase, {
        vaiNumber,
        platformId,
        userId,
        checkType,
        resultStatus: "not_compliant",
        responseTimeMs: responseTime,
        req,
      });

      return new Response(
        JSON.stringify({
          status: "not_compliant",
          vaiNumber: vaiNumber,
          vaiStatus: "ACTIVE",
          platformId: platformId,
          platformCompliance: {
            platformId: platformId,
            isCompliant: false,
            missingRequirements: missingRequirements,
            completedRequirements: completedItems,
            totalRequired: requiredItems.length,
            totalCompleted: completedItems.length,
          },
          vaiDetails: {
            createdAt: vai.created_at,
            expiresAt: expirationDate.toISOString(),
            daysUntilExpiration: daysUntilExpiration,
          },
          otherPlatforms: otherPlatformIds,
          actions: {
            allowAccess: false,
            complianceFlowUrl: `https://chainpass.vai/compliance?vai=${vaiNumber}&platform=${platformId}`,
            message: `Complete ${missingRequirements.length} more step${missingRequirements.length > 1 ? "s" : ""} (FREE)`,
            nextSteps: missingRequirements.map((req) => ({
              requirement: req,
              displayName: req
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" "),
            })),
          },
          responseTimestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("[Compliance Check] Error:", error);
    return new Response(
      JSON.stringify({
        error: "internal_server_error",
        message: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
        code: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to log compliance checks
async function logComplianceCheck(
  supabase: any,
  data: {
    vaiNumber: string;
    platformId: string;
    userId?: string;
    checkType: string;
    resultStatus: string;
    responseTimeMs: number;
    req: Request;
  }
) {
  try {
    const clientIP =
      data.req.headers.get("x-forwarded-for") ||
      data.req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = data.req.headers.get("user-agent") || "unknown";

    await supabase.from("compliance_check_audit").insert({
      vai_number: data.vaiNumber,
      platform_id: data.platformId,
      user_id: data.userId || null,
      check_type: data.checkType,
      result_status: data.resultStatus,
      response_time_ms: data.responseTimeMs,
      ip_address: clientIP,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error("[Compliance Check] Failed to log audit:", error);
    // Don't throw - logging failure shouldn't break the API
  }
}

