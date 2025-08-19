import { corsHeaders, createAPIError, createResponse } from "../_shared/utils.ts";
import { z } from "npm:zod";
import { PQLBuilder } from "../../../src/query/builder.ts";

const Body = z.object({
  aggregate: z.string(),
  entity: z.string(),
  filter: z.string().optional(),
});

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }
  try {
    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return createAPIError(400, "Invalid body");
    }
    const { aggregate, entity, filter } = parsed.data;
    let builder = new PQLBuilder().predict(aggregate).for(entity);
    if (filter) builder = builder.where(filter);
    const query = builder.build();
    return createResponse(200, { query });
  } catch (_e) {
    return createAPIError(500, "Unexpected error");
  }
}

Deno.serve(handler);
