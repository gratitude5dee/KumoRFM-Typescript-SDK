import { corsHeaders, createAPIError, createResponse } from "../_shared/utils.ts";

export function handler(req: Request): Response {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }
  try {
    return createResponse(200, { ok: true, message: "initialized" });
  } catch (_e) {
    return createAPIError(500, "Unexpected error");
  }
}

Deno.serve(handler);
