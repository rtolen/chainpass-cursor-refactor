// @ts-ignore - Deno standard library import for HTTP server
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Base64 encoder for binary payloads
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GetComplyCubePhotoPayload {
  url?: string;
  authorizationKey?: string;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body: GetComplyCubePhotoPayload = await req.json();
    const requestUrl = body.url;
    const authorizationKey = body.authorizationKey;

    if (!requestUrl || typeof requestUrl !== "string") {
      return jsonResponse({ error: "The 'url' parameter is required." }, 400);
    }

    if (!authorizationKey || typeof authorizationKey !== "string") {
      return jsonResponse({ error: "The 'authorizationKey' parameter is required." }, 400);
    }

    const upstreamResponse = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Authorization: authorizationKey,
      },
    });

    const responseContentType = upstreamResponse.headers.get("content-type") ?? "";
    let responsePayload: { type: "text" | "json" | "binary"; data: unknown };

    if (responseContentType.includes("application/json")) {
      responsePayload = {
        type: "json",
        data: await upstreamResponse.json(),
      };
    } else if (responseContentType.includes("text/")) {
      responsePayload = {
        type: "text",
        data: await upstreamResponse.text(),
      };
    } else {
      const binaryData = new Uint8Array(await upstreamResponse.arrayBuffer());
      responsePayload = {
        type: "binary",
        data: base64Encode(binaryData),
      };
    }

    const sanitizedHeaders: Record<string, string> = {};
    upstreamResponse.headers.forEach((value, key) => {
      sanitizedHeaders[key] = value;
    });

    return jsonResponse({
      success: true,
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: sanitizedHeaders,
      contentType: responseContentType,
      body: responsePayload,
      fetchedAt: new Date().toISOString(),
      request: {
        url: requestUrl,
        authorizationProvided: Boolean(authorizationKey),
      },
    });
  } catch (error) {
    console.error("[get-comply-cube-photo] Request failed:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

