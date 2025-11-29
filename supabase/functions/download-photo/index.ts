// supabase/functions/download-photo/index.ts
// @ts-ignore - Deno runtime import
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

declare global {
  namespace Deno {
    namespace env {
      function get(key: string): string | undefined;
    }
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Get the live photo ID from query parameters or POST body
  const url = new URL(req.url);
  let photoId = url.searchParams.get("photoId");

  if (!photoId && req.method === "POST") {
    const body = await req.json().catch(() => null);
    photoId = body?.photoId ?? null;
  }
  if (!photoId) {
    return new Response("Missing photoId parameter", {
      status: 400,
      headers: corsHeaders,
    });
  }
  // Retrieve API key from environment variables
  const complycubeApiKey = Deno.env.get("COMPLYCUBE_API_KEY");
  if (!complycubeApiKey) {
    return new Response("ComplyCube API key not set", {
      status: 500,
      headers: corsHeaders,
    });
  }
  try {
    // 1. Get the Live Photo object to find the downloadLink
    const photoDetailsUrl = `https://api.complycube.com/v1/livePhotos/${photoId}/download`;
    const photoDetailsResponse = await fetch(photoDetailsUrl, {
      headers: {
        "Authorization": `${complycubeApiKey}`,
        "Accept": "application/json"
      }
    });
    if (!photoDetailsResponse.ok) {
      const errorBody = await photoDetailsResponse.text();
      throw new Error(`Failed to fetch photo details: ${errorBody}`);
    }
    const photoDetails = await photoDetailsResponse.json();
    const base64Data = photoDetails.data;
    const contentType = photoDetails.contentType || "image/jpeg"; // Default to jpeg if not specified
    if (!base64Data) {
      throw new Error("Download data not available for this photo.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        contentType,
        data: base64Data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(error);
    return new Response(`Error: ${error.message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
