import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { z } from 'npm:zod@3.22.0';
import { authenticateUser } from '../_shared/auth.ts';
import { createAPIError, createResponse } from '../_shared/responses.ts';
import { corsHeaders } from '../_shared/cors.ts';

const RequestSchema = z.object({
  config: z.object({
    baseUrl: z.string().url().optional(),
    timeout: z.number().positive().optional(),
    maxRetries: z.number().positive().max(10).optional(),
  }).optional(),
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

    const apiKey = Deno.env.get('KUMO_API_KEY');
    if (!apiKey) {
      throw new Error('KUMO_API_KEY not configured');
    }

    return createResponse({ initialized: true });
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
