import { corsHeaders, createAPIError, createResponse, authenticateUser } from '../_shared/utils.ts';
import { createRFMClient, deserializeGraph } from '../_shared/sdk.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  const auth = await authenticateUser(req);
  if (!auth) return createAPIError(401, 'Unauthorized');

  const body = await req.json().catch(() => null);
  if (!body || !body.query || !body.graph) return createAPIError(400, 'Invalid body');

  const graph = deserializeGraph(body.graph);
  const rfm = createRFMClient(graph);
  const result = await rfm.predict(body.query);
  return createResponse(200, result);
});
