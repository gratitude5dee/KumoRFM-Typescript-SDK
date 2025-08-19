import { corsHeaders, createAPIError, createResponse } from "../_shared/utils.ts";
import { GraphSchema } from "../_shared/schemas.ts";
import { deserializeGraph } from "../_shared/sdk.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }
  try {
    const json = await req.json();
    const parsed = GraphSchema.safeParse(json);
    if (!parsed.success) {
      return createAPIError(400, "Invalid body");
    }
    const graph = deserializeGraph(parsed.data);
    const summary = {
      tables: graph.tables.length,
      links: graph.links.length,
      tableNames: graph.tables.map((t) => t.name),
    };
    return createResponse(200, { ok: true, summary });
  } catch (_e) {
    return createAPIError(500, "Unexpected error");
  }
}

Deno.serve(handler);
