import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { z } from 'npm:zod@3.22.0';
import { authenticateUser } from '../_shared/auth.ts';
import { createResponse, createAPIError } from '../_shared/responses.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { SerializedGraphSchema } from '../_shared/schemas.ts';
import { deserializeGraph } from '../_shared/sdk.ts';

const RequestSchema = z.object({
  graph: SerializedGraphSchema,
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req.headers.get('Origin') || undefined) });
  }

  const authResult = await authenticateUser(req);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json();
    const validated = RequestSchema.parse(body);

    const graph = deserializeGraph(validated.graph);
    const validationResult = graph.validate();

    return createResponse(validationResult);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createResponse(
        undefined,
        createAPIError('BAD_REQUEST', 'Invalid graph structure', { errors: error.errors }),
        400
      );
    }
    return createResponse(
      undefined,
      createAPIError('INTERNAL', error instanceof Error ? error.message : 'Unknown error'),
      500
    );
  }
});
