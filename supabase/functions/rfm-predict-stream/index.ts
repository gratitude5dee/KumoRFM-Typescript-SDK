import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { z } from 'npm:zod@3.22.0';
import { authenticateUser } from '../_shared/auth.ts';
import { createAPIError, createResponse } from '../_shared/responses.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { PQLBuilderSpecSchema, SerializedGraphSchema } from '../_shared/schemas.ts';

const RequestSchema = z.object({
  query: z.string().optional(),
  builder: PQLBuilderSpecSchema.optional(),
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
    RequestSchema.parse(body);
    return createResponse(undefined, createAPIError('NOT_FOUND', 'Streaming not implemented'), 501);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createResponse(
        undefined,
        createAPIError('BAD_REQUEST', 'Invalid request', { errors: error.errors }),
        400,
      );
    }
    return createResponse(
      undefined,
      createAPIError('INTERNAL', error instanceof Error ? error.message : 'Unknown error'),
      500,
    );
  }
});
