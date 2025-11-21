import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      vaiNumber,
      complycubeClientId,
      contractType,
      contractText,
      facialMatchConfidence,
      deviceFingerprint,
    } = await req.json();

    console.log("[Sign Contract] Processing signature for VAI:", vaiNumber);

    if (!contractType || !contractText || facialMatchConfidence === undefined) {
      throw new Error("Missing required fields");
    }

    if (facialMatchConfidence < 85) {
      throw new Error("Facial match confidence too low to sign contract");
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify that the verification record exists (contract signing happens before V.A.I. generation)
    if (complycubeClientId) {
      const { data: verificationRecord, error: verificationError } = await serviceClient
        .from("verification_records")
        .select("id")
        .eq("complycube_client_id", complycubeClientId)
        .single();

      if (verificationError || !verificationRecord) {
        console.error("[Sign Contract] Verification record not found:", verificationError);
        return new Response(
          JSON.stringify({ success: false, message: "Verification record not found. Please complete identity verification first." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      
      console.log("[Sign Contract] Verification record found:", verificationRecord.id);
    }

    // Generate blockchain-style hash (SHA-256 of contract data)
    const contractDataString = `${vaiNumber}-${contractType}-${contractText}-${facialMatchConfidence}-${Date.now()}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(contractDataString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const blockchainHash =
      "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    console.log("[Sign Contract] Generated blockchain hash:", blockchainHash);

    // Create signed contract record
    const { data: contractData, error: contractError } = await serviceClient
      .from("signed_contracts")
      .insert({
        vai_number: vaiNumber,
        contract_type: contractType,
        contract_text: contractText,
        facial_match_confidence: facialMatchConfidence,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        user_agent: req.headers.get("user-agent"),
        blockchain_hash: blockchainHash,
      })
      .select()
      .single();

    if (contractError) {
      console.error("[Sign Contract] Database error:", contractError);
      throw new Error("Failed to record contract signature");
    }

    console.log("[Sign Contract] Contract signed successfully:", contractData.contract_id);

    return new Response(
      JSON.stringify({
        success: true,
        contractId: contractData.contract_id,
        signedAt: contractData.signed_at,
        blockchainHash: contractData.blockchain_hash,
        message: "Contract signed successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("[Sign Contract] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Failed to sign contract",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
