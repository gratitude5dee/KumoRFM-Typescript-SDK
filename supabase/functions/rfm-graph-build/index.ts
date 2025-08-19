import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { z } from 'npm:zod@3.22.0';
import { authenticateUser } from '../_shared/auth.ts';
import { createAPIError, createResponse } from '../_shared/responses.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { LocalGraph, LocalTable } from '../../../src/index.ts';
import { serializeGraph } from '../_shared/sdk.ts';

const RequestSchema = z.union([
  z.object({
    data: z.record(z.array(z.record(z.any()))),
    inferMetadata: z.boolean().default(true),
    inferLinks: z.boolean().default(true),
  }),
  z.object({
    sources: z.object({
      tables: z.array(z.string()),
      schema: z.string().optional(),
    }),
    inferMetadata: z.boolean().default(true),
    inferLinks: z.boolean().default(true),
  }),
]);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req.headers.get('Origin') || undefined) });
  }

  const authResult = await authenticateUser(req);
  if (authResult instanceof Response) return authResult;
  const { supabase } = authResult;

  try {
    const body = await req.json();
    const validated = RequestSchema.parse(body);

    const tables: LocalTable[] = [];

    if ('data' in validated) {
      for (const [name, data] of Object.entries(validated.data)) {
        const table = new LocalTable(data as any[], name);
        if (validated.inferMetadata) {
          table.inferMetadata();
        }
        tables.push(table);
      }
    } else {
      const { sources } = validated;
      for (const tableName of sources.tables) {
        const query = supabase.from(tableName).select('*');
        if (sources.schema) {
          (query as any).schema(sources.schema);
        }
        const { data, error } = await query;
        if (error) {
          throw new Error(`Failed to fetch table ${tableName}: ${error.message}`);
        }
        const table = new LocalTable(data || [], tableName);
        if (validated.inferMetadata) {
          table.inferMetadata();
        }
        tables.push(table);
      }
    }

    const graph = new LocalGraph(tables);
    if (validated.inferLinks) {
      graph.inferLinks();
    }

    const serialized = serializeGraph(graph);
    const metadata = tables.map((t) => ({
      name: t.name,
      schema: t.schema,
      rowCount: t.data.length,
    }));

    return createResponse({ graph: serialized, metadata });
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
