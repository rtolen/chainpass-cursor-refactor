import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMPLYCUBE_API_URL = "https://api.complycube.com/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId } = await req.json();

    const COMPLYCUBE_API_KEY = Deno.env.get("COMPLYCUBE_API_KEY");
    if (!COMPLYCUBE_API_KEY) {
      throw new Error("COMPLYCUBE_API_KEY not configured");
    }

    console.log(`[ComplyCube Callback] Processing client: ${clientId}`);

    // Step 1: Get check results from ComplyCube
    const checksResponse = await fetch(
      `${COMPLYCUBE_API_URL}/clients/${clientId}/checks`,
      {
        headers: { "Authorization": COMPLYCUBE_API_KEY },
      }
    );

    if (!checksResponse.ok) {
      throw new Error("Failed to fetch checks from ComplyCube");
    }

    const checks = await checksResponse.json();
    const latestCheck = checks.items?.[0];

    if (!latestCheck) {
      throw new Error("No checks found for client");
    }

    console.log(`[ComplyCube Callback] Check outcome: ${latestCheck.outcome}`);
    console.log(`[ComplyCube Callback] Transaction ID: ${latestCheck.id}`);

    // Step 2: Get documents (live photo)
    const documentsResponse = await fetch(
      `${COMPLYCUBE_API_URL}/clients/${clientId}/documents`,
      {
        headers: { "Authorization": COMPLYCUBE_API_KEY },
      }
    );

    if (!documentsResponse.ok) {
      throw new Error("Failed to fetch documents from ComplyCube");
    }

    const documents = await documentsResponse.json();
    const livePhoto = documents.items?.find((doc: any) => doc.type === "live_photo");

    if (!livePhoto) {
      throw new Error("No live photo found");
    }

    console.log(`[ComplyCube Callback] Found live photo: ${livePhoto.id}`);

    // Step 3: Download live photo
    const livePhotoResponse = await fetch(
      `${COMPLYCUBE_API_URL}/documents/${livePhoto.id}/download`,
      {
        headers: { "Authorization": COMPLYCUBE_API_KEY },
      }
    );

    if (!livePhotoResponse.ok) {
      throw new Error("Failed to download live photo");
    }

    const livePhotoBlob = await livePhotoResponse.arrayBuffer();

    // Step 4: Upload to Supabase Storage
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const livePhotoFileName = `${clientId}-live-photo.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("verification-photos")
      .upload(livePhotoFileName, livePhotoBlob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("[Storage] Upload error:", uploadError);
      throw new Error(`Failed to upload photo: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("verification-photos")
      .getPublicUrl(livePhotoFileName);

    console.log(`[ComplyCube Callback] Photo stored at: ${publicUrl}`);

    // Step 5: Update verification record
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
      console.error("[Database] Update error:", updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: latestCheck.outcome === "clear",
        outcome: latestCheck.outcome,
        transactionNumber: latestCheck.id,
        livePhotoUrl: publicUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ComplyCube Callback] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
