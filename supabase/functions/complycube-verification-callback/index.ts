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
    console.log("═══ ComplyCube Callback Processing START ═══");
    
    const { clientId } = await req.json();
    
    if (!clientId) {
      throw new Error("clientId is required");
    }
    
    console.log("Processing client:", clientId);
    
    const COMPLYCUBE_API_KEY = Deno.env.get("COMPLYCUBE_API_KEY");
    
    // STEP 1: Get verification checks
    console.log("Fetching checks...");
    
    const checksResponse = await fetch(
      `https://api.complycube.com/v1/clients/${clientId}/checks`,
      {
        headers: { "Authorization": COMPLYCUBE_API_KEY! },
      }
    );

    if (!checksResponse.ok) {
      const error = await checksResponse.text();
      throw new Error(`Failed to fetch checks: ${error}`);
    }

    const checksData = await checksResponse.json();
    
    // Get most recent check
    const latestCheck = checksData.items?.[0];
    
    if (!latestCheck) {
      // Verification might still be processing
      return new Response(
        JSON.stringify({
          success: false,
          status: "processing",
          message: "Verification still in progress"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Latest check:", {
      id: latestCheck.id,
      type: latestCheck.type,
      status: latestCheck.status,
      outcome: latestCheck.outcome
    });
    
    // Check if verification is complete
    if (latestCheck.status !== "complete") {
      return new Response(
        JSON.stringify({
          success: false,
          status: "processing",
          message: "Verification not yet complete"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // STEP 2: Get documents (including live photo)
    console.log("Fetching documents...");
    
    const documentsResponse = await fetch(
      `https://api.complycube.com/v1/clients/${clientId}/documents`,
      {
        headers: { "Authorization": COMPLYCUBE_API_KEY! },
      }
    );

    if (!documentsResponse.ok) {
      throw new Error("Failed to fetch documents");
    }

    const documentsData = await documentsResponse.json();
    
    // Find live photo
    const livePhoto = documentsData.items?.find((doc: any) => 
      doc.type === "live_photo" && doc.status === "approved"
    );
    
    if (!livePhoto) {
      throw new Error("No approved live photo found");
    }
    
    console.log("Found live photo:", livePhoto.id);
    
    // STEP 3: Download live photo
    console.log("Downloading biometric photo...");
    
    const photoResponse = await fetch(
      `https://api.complycube.com/v1/documents/${livePhoto.id}/download`,
      {
        headers: { "Authorization": COMPLYCUBE_API_KEY! },
      }
    );

    if (!photoResponse.ok) {
      throw new Error("Failed to download photo");
    }

    const photoBlob = await photoResponse.arrayBuffer();
    
    // STEP 4: Upload to Supabase Storage
    console.log("Uploading to Supabase Storage...");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const fileName = `${clientId}-complycube-biometric.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from("verification-photos")
      .upload(fileName, photoBlob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Failed to upload photo: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("verification-photos")
      .getPublicUrl(fileName);

    console.log("✓ Photo stored:", publicUrl);

    // STEP 5: Update verification record
    console.log("Updating database...");
    
    const { error: updateError } = await supabase
      .from("verification_records")
      .update({
        complycube_verification_id: latestCheck.id,
        verification_status: latestCheck.outcome,
        biometric_confirmed: latestCheck.outcome === "clear",
        selfie_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("complycube_client_id", clientId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log("✓ Database updated");
    console.log("═══ ComplyCube Callback Processing SUCCESS ═══");

    return new Response(
      JSON.stringify({
        success: true,
        outcome: latestCheck.outcome,
        transactionId: latestCheck.id,
        biometricUrl: publicUrl,
        verified: latestCheck.outcome === "clear",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("═══ ComplyCube Callback Processing FAILED ═══");
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
