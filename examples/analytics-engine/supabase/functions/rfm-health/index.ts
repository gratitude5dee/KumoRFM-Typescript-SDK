import { corsHeaders, createResponse } from '../_shared/utils.ts';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  return createResponse(200, { status: 'ok' });
});
