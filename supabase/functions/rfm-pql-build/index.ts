import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { z } from 'npm:zod@3.22.0';
import { authenticateUser } from '../_shared/auth.ts';
import { createAPIError, createResponse } from '../_shared/responses.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { PQLBuilderSpecSchema } from '../_shared/schemas.ts';
import { PQLBuilder } from '../_shared/sdk.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req.headers.get('Origin') || undefined) });
  }

  const authResult = await authenticateUser(req);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json();
    const validated = PQLBuilderSpecSchema.parse(body);

    const builder = new PQLBuilder();
    builder.predict(validated.predict);
    if (validated.for?.length) {
      builder.for(...validated.for);
    }
    if (validated.where?.length) {
      validated.where.forEach((w) => builder.where(w));
    }
    if (validated.groupBy?.length) {
      builder.groupBy(...validated.groupBy);
    }
    if (validated.orderBy?.length) {
      builder.orderBy(...validated.orderBy);
    }
    if (validated.limit) {
      builder.limit(validated.limit);
    }

    const query = builder.build();
    return createResponse({ query });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createResponse(
        undefined,
        createAPIError('BAD_REQUEST', 'Invalid builder specification', { errors: error.errors }),
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
