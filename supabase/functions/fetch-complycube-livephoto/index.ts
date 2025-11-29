// @ts-ignore - Supplied by the Deno runtime during execution
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Supplied by the Deno runtime during execution
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
// @ts-ignore - Supplied by the Deno runtime during execution
import { createClient } from "npm:@supabase/supabase-js@2";

// Provide a minimal Deno type so TypeScript tooling stops complaining when this
// file is type-checked outside of the Deno runtime (e.g., via tsc or eslint).
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const COMPLYCUBE_API_KEY = Deno.env.get("COMPLYCUBE_API_KEY");
    if (!COMPLYCUBE_API_KEY) {
      throw new Error("COMPLYCUBE_API_KEY not configured");
    }

    const { clientId, includePhoto = false } = await req.json();

    if (!clientId) {
      throw new Error("clientId is required");
    }

    const requestUrl = `https://api.complycube.com/v1/livePhotos?clientId=${clientId}`;

    const livePhotoResp = await fetch(
      requestUrl,
      {
        method: "GET",
        headers: {
          Authorization: COMPLYCUBE_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    if (!livePhotoResp.ok) {
      const body = await livePhotoResp.text();
      throw new Error(
        `Failed to fetch live photos: ${livePhotoResp.status} - ${body}`,
      );
    }

    const livePhotoData = await livePhotoResp.json();
    const livePhotoId = livePhotoData?.data?.[0]?.id;

    if (!livePhotoId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No live photo record returned for client",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const getPhotoIdUrl = `https://api.complycube.com/v1/livePhotos/${livePhotoId}/download`;

    const getPhotoIdResp = await fetch(getPhotoIdUrl, {
      method: "GET",
      headers: {
        Authorization: COMPLYCUBE_API_KEY,
      },
    });

    if (!getPhotoIdResp.ok) {
      const body = await getPhotoIdResp.text();
      throw new Error(
        `getPhotoID request failed: ${getPhotoIdResp.status} - ${body}`,
      );
    }

    let downloadPayload: { id?: string } | null = null;
    let downloadResponsePreview: unknown = null;
    let photoBase64: string | null = null;
    let photoContentType: string | null = null;

    const responseBuffer = new Uint8Array(await getPhotoIdResp.arrayBuffer());
    const responseType = getPhotoIdResp.headers.get("content-type") ?? "";

    if (responseType.includes("application/json")) {
      try {
        const textBody = new TextDecoder().decode(responseBuffer);
        downloadPayload = JSON.parse(textBody);
        downloadResponsePreview = downloadPayload;
      } catch (parseError) {
        console.warn("[fetch-livephoto] Failed to parse JSON download response:", parseError);
        downloadResponsePreview = {
          note: "Failed to parse JSON response",
          contentType: responseType,
          status: getPhotoIdResp.status,
        };
      }
    } else {
      downloadResponsePreview = {
        note: "Non-JSON response",
        contentType: responseType || "unknown",
        status: getPhotoIdResp.status,
        size: responseBuffer.byteLength,
      };
    }

    if (includePhoto) {
      photoBase64 = base64Encode(responseBuffer);
      photoContentType = responseType || "application/octet-stream";
    }

    const livePhotoDownloadId = downloadPayload?.id ?? livePhotoId;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { error: dbError } = await supabase
      .from("verification_records")
      .update({
        complycube_session_id: livePhotoId,
        request_photo_url: requestUrl,
        live_photo_id: livePhotoDownloadId,
        get_photo_url: getPhotoIdUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("complycube_verification_id", clientId);

    if (dbError) {
      console.error("[fetch-livephoto] DB update failed:", dbError);
      throw new Error(dbError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        livePhotoId,
        requestUrl,
        livePhotoDownloadId,
        getPhotoIdUrl,
        photoData: photoBase64,
        photoContentType,
        debugInfo: {
          listRequest: {
            url: requestUrl,
            response: livePhotoData,
          },
          downloadRequest: {
            url: getPhotoIdUrl,
            response: downloadResponsePreview,
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[fetch-livephoto] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

