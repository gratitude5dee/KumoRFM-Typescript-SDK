import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { z } from 'npm:zod@3.22.0';
import { authenticateUser, checkRateLimit } from '../_shared/auth.ts';
import { createResponse, createAPIError } from '../_shared/responses.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { SerializedGraphSchema, PQLBuilderSpecSchema } from '../_shared/schemas.ts';
import { deserializeGraph, createRFMClient, PQLBuilder } from '../_shared/sdk.ts';

const RequestSchema = z.object({
  query: z.string().optional(),
  builder: PQLBuilderSpecSchema.optional(),
  graph: SerializedGraphSchema,
  options: z.object({
    useCache: z.boolean().default(false),
    timeout: z.number().positive().optional(),
  }).optional(),
}).refine(
  data => !!data.query || !!data.builder,
  { message: 'Either query or builder must be provided' }
);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req.headers.get('Origin') || undefined) });
  }

  const authResult = await authenticateUser(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const allowed = await checkRateLimit(userId, 100, 60000);
  if (!allowed) {
    return createResponse(
      undefined,
      createAPIError('RATE_LIMITED', 'Too many requests. Please try again later.'),
      429
    );
  }

  try {
    const body = await req.json();
    const validated = RequestSchema.parse(body);

    let query: string;
    if (validated.query) {
      query = validated.query;
    } else if (validated.builder) {
      const builder = new PQLBuilder();
      builder.predict(validated.builder.predict);
      if (validated.builder.for?.length) {
        builder.for(...validated.builder.for);
      }
      if (validated.builder.where?.length) {
        validated.builder.where.forEach(w => builder.where(w));
      }
      if (validated.builder.groupBy?.length) {
        builder.groupBy(...validated.builder.groupBy);
      }
      if (validated.builder.orderBy?.length) {
        builder.orderBy(...validated.builder.orderBy);
      }
      if (validated.builder.limit) {
        builder.limit(validated.builder.limit);
      }
      query = builder.build();
    } else {
      throw new Error('No query provided');
    }

    const graph = deserializeGraph(validated.graph);
    const rfm = createRFMClient(graph);
    const result = await rfm.predict(query, validated.options);

    return createResponse(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createResponse(
        undefined,
        createAPIError('BAD_REQUEST', 'Invalid request', { errors: error.errors }),
        400
      );
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = errorMessage.includes('validation') ? 'VALIDATION_ERROR' : 'INTERNAL';
    return createResponse(
      undefined,
      createAPIError(errorCode, errorMessage),
      errorCode === 'VALIDATION_ERROR' ? 400 : 500
    );
  }
});
