import { corsHeaders, createAPIError } from "../_shared/utils.ts";

export function handler(req: Request): Response {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }
  try {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({ status: "starting" }) + "\n"));
        setTimeout(
          () => controller.enqueue(encoder.encode(JSON.stringify({ chunk: 1 }) + "\n")),
          200,
        );
        setTimeout(
          () => controller.enqueue(encoder.encode(JSON.stringify({ chunk: 2 }) + "\n")),
          400,
        );
        setTimeout(() => controller.close(), 600);
      },
    });
    return new Response(stream, {
      headers: { "content-type": "application/json", ...corsHeaders() },
    });
  } catch (_e) {
    return createAPIError(500, "Unexpected error");
  }
}

Deno.serve(handler);
