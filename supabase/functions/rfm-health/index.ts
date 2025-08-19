import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createResponse } from '../_shared/responses.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req.headers.get('Origin') || undefined) });
  }
  return createResponse({ status: 'ok', timestamp: Date.now() });
});
