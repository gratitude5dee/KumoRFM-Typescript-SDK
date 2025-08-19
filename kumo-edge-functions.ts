// ============================================================================
// SHARED TYPES - supabase/functions/_shared/types.ts
// ============================================================================

import { z } from 'npm:zod@3.22.0';

// Re-export SDK types
export type {
  DataType,
  SemanticType,
  ColumnMetadata,
  TableMetadata,
  TableSchema,
  TableLink,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  PredictionResult,
  AuthResult,
  RFMConfig,
} from '../../../sdk/index.ts';

// Serialized types for API transport
export interface SerializedTable {
  name: string;
  data: Record<string, any>[];
  metadata?: TableMetadata;
}

export interface SerializedGraph {
  tables: SerializedTable[];
  links: TableLink[];
}

// API response types
export interface APIResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: APIError;
}

export interface APIError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
}

export type ErrorCode = 
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL'
  | 'RATE_LIMITED'
  | 'TIMEOUT';

// PQL Builder spec for typed query construction
export interface PQLBuilderSpec {
  predict: string;
  for?: string[];
  where?: string[];
  groupBy?: string[];
  orderBy?: string[];
  limit?: number;
}

// Zod schemas for validation
export const TableMetadataSchema = z.object({
  primaryKey: z.string().optional(),
  timeColumn: z.string().optional(),
  semanticTypes: z.record(z.enum(['numerical', 'categorical', 'time_column'])),
});

export const TableLinkSchema = z.object({
  srcTable: z.string(),
  fkey: z.string(),
  dstTable: z.string(),
  validated: z.boolean().optional(),
});

export const SerializedTableSchema = z.object({
  name: z.string(),
  data: z.array(z.record(z.any())),
  metadata: TableMetadataSchema.optional(),
});

export const SerializedGraphSchema = z.object({
  tables: z.array(SerializedTableSchema),
  links: z.array(TableLinkSchema),
});

export const PQLBuilderSpecSchema = z.object({
  predict: z.string(),
  for: z.array(z.string()).optional(),
  where: z.array(z.string()).optional(),
  groupBy: z.array(z.string()).optional(),
  orderBy: z.array(z.string()).optional(),
  limit: z.number().positive().optional(),
});

// ============================================================================
// SHARED UTILITIES - supabase/functions/_shared/utils.ts
// ============================================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { APIError, ErrorCode } from './types.ts';

export function createAPIError(
  code: ErrorCode,
  message: string,
  details?: Record<string, any>
): APIError {
  return { code, message, details };
}

export function createResponse<T>(
  data?: T,
  error?: APIError,
  status: number = 200
): Response {
  const body = error
    ? { ok: false, error }
    : { ok: true, data };
  
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function authenticateUser(
  req: Request
): Promise<{ supabase: SupabaseClient; userId: string } | Response> {
  const authorization = req.headers.get('Authorization');
  
  if (!authorization?.startsWith('Bearer ')) {
    return createResponse(
      undefined,
      createAPIError('UNAUTHORIZED', 'Missing or invalid authorization header'),
      401
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return createResponse(
      undefined,
      createAPIError('UNAUTHORIZED', 'Invalid token or user not found'),
      401
    );
  }

  return { supabase, userId: user.id };
}

export function corsHeaders(origin?: string): HeadersInit {
  const allowedOrigins = Deno.env.get('CORS_ORIGINS')?.split(',') || ['*'];
  const allowOrigin = origin && allowedOrigins.includes('*') 
    ? origin 
    : allowedOrigins.includes(origin || '') 
      ? origin 
      : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// Rate limiting using Deno KV
export async function checkRateLimit(
  userId: string,
  limit: number = 100,
  window: number = 60000 // 1 minute
): Promise<boolean> {
  const kv = await Deno.openKv();
  const key = ['rate_limit', userId, Math.floor(Date.now() / window)];
  
  const result = await kv.atomic()
    .sum(key, 1n)
    .commit();
  
  const count = result.versionstamp ? Number(result.versionstamp) : 0;
  return count <= limit;
}

// ============================================================================
// SDK ADAPTER - supabase/functions/_shared/sdk-adapter.ts
// ============================================================================

import {
  LocalTable,
  LocalGraph,
  KumoRFM,
  PQLBuilder,
  type RFMConfig,
} from '../../../sdk/index.ts';
import type { SerializedGraph, SerializedTable } from './types.ts';

export function deserializeTable(serialized: SerializedTable): LocalTable {
  const table = new LocalTable(serialized.data, serialized.name, serialized.metadata);
  if (serialized.metadata) {
    return table;
  }
  return table.inferMetadata();
}

export function deserializeGraph(serialized: SerializedGraph): LocalGraph {
  const tables = serialized.tables.map(deserializeTable);
  const graph = new LocalGraph(tables);
  
  for (const link of serialized.links) {
    graph.link(link.srcTable, link.fkey, link.dstTable);
  }
  
  return graph;
}

export function serializeGraph(graph: LocalGraph): SerializedGraph {
  return {
    tables: graph.tables.map(table => ({
      name: table.name,
      data: table.data,
      metadata: table.metadata,
    })),
    links: graph.links,
  };
}

export function createRFMClient(graph: LocalGraph): KumoRFM {
  const config: RFMConfig = {
    apiKey: Deno.env.get('KUMO_API_KEY')!,
    baseUrl: Deno.env.get('KUMO_BASE_URL') || 'https://api.kumorfm.ai',
    timeout: 60000,
    maxRetries: 3,
  };
  
  return new KumoRFM(graph, config);
}

// ============================================================================
// FUNCTION: rfm-init - supabase/functions/rfm-init/index.ts
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { z } from 'npm:zod@3.22.0';
import { authenticateUser, createResponse, corsHeaders, createAPIError } from '../_shared/utils.ts';
import { init } from '../../../sdk/index.ts';

const RequestSchema = z.object({
  config: z.object({
    baseUrl: z.string().url().optional(),
    timeout: z.number().positive().optional(),
    maxRetries: z.number().positive().max(10).optional(),
  }).optional(),
});

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req.headers.get('Origin')) });
  }

  // Authenticate
  const authResult = await authenticateUser(req);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json();
    const validated = RequestSchema.parse(body);
    
    // Initialize SDK with API key from environment
    const apiKey = Deno.env.get('KUMO_API_KEY');
    if (!apiKey) {
      throw new Error('KUMO_API_KEY not configured');
    }

    init(apiKey, validated.config);
    
    return createResponse({ initialized: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createResponse(
        undefined,
        createAPIError('BAD_REQUEST', 'Invalid request', { errors: error.errors }),
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

// ============================================================================
// FUNCTION: rfm-graph-validate - supabase/functions/rfm-graph-validate/index.ts
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { z } from 'npm:zod@3.22.0';
import { authenticateUser, createResponse, corsHeaders, createAPIError } from '../_shared/utils.ts';
import { SerializedGraphSchema } from '../_shared/types.ts';
import { deserializeGraph } from '../_shared/sdk-adapter.ts';

const RequestSchema = z.object({
  graph: SerializedGraphSchema,
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req.headers.get('Origin')) });
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

// ============================================================================
// FUNCTION: rfm-graph-build - supabase/functions/rfm-graph-build/index.ts
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { z } from 'npm:zod@3.22.0';
import { authenticateUser, createResponse, corsHeaders, createAPIError } from '../_shared/utils.ts';
import { LocalTable, LocalGraph } from '../../../sdk/index.ts';
import { serializeGraph } from '../_shared/sdk-adapter.ts';

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
    return new Response(null, { headers: corsHeaders(req.headers.get('Origin')) });
  }

  const authResult = await authenticateUser(req);
  if (authResult instanceof Response) return authResult;
  const { supabase } = authResult;

  try {
    const body = await req.json();
    const validated = RequestSchema.parse(body);
    
    let tables: LocalTable[] = [];
    
    if ('data' in validated) {
      // Build from inline data
      for (const [name, data] of Object.entries(validated.data)) {
        const table = new LocalTable(data, name);
        if (validated.inferMetadata) {
          table.inferMetadata();
        }
        tables.push(table);
      }
    } else {
      // Build from Supabase tables
      const { sources } = validated;
      
      for (const tableName of sources.tables) {
        const query = supabase
          .from(tableName)
          .select('*');
        
        if (sources.schema) {
          query.schema(sources.schema);
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
    const metadata = tables.map(t => ({
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

// ============================================================================
// FUNCTION: rfm-predict - supabase/functions/rfm-predict/index.ts
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { z } from 'npm:zod@3.22.0';
import { authenticateUser, createResponse, corsHeaders, createAPIError, checkRateLimit } from '../_shared/utils.ts';
import { SerializedGraphSchema, PQLBuilderSpecSchema } from '../_shared/types.ts';
import { deserializeGraph, createRFMClient } from '../_shared/sdk-adapter.ts';
import { PQLBuilder } from '../../../sdk/index.ts';

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
    return new Response(null, { headers: corsHeaders(req.headers.get('Origin')) });
  }

  const authResult = await authenticateUser(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  // Rate limiting
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
    
    // Build query
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
    
    // Execute prediction
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

// ============================================================================
// FUNCTION: rfm-pql-build - supabase/functions/rfm-pql-build/index.ts
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { z } from 'npm:zod@3.22.0';
import { authenticateUser, createResponse, corsHeaders, createAPIError } from '../_shared/utils.ts';
import { PQLBuilderSpecSchema } from '../_shared/types.ts';
import { PQLBuilder } from '../../../sdk/index.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req.headers.get('Origin')) });
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
      validated.where.forEach(w => builder.where(w));
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

// ============================================================================
// FUNCTION: rfm-predict-stream - supabase/functions/rfm-predict-stream/index.ts
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { authenticateUser, corsHeaders, createAPIError } from '../_shared/utils.ts';
import { deserializeGraph, createRFMClient } from '../_shared/sdk-adapter.ts';
import { PQLBuilder } from '../../../sdk/index.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req.headers.get('Origin')) });
  }

  const authResult = await authenticateUser(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const url = new URL(req.url);
  const queryParam = url.searchParams.get('query');
  const builderParam = url.searchParams.get('builder');
  const graphParam = url.searchParams.get('graph');

  if (!graphParam || (!queryParam && !builderParam)) {
    return new Response(
      JSON.stringify(createAPIError('BAD_REQUEST', 'Missing required parameters')),
      { status: 400 }
    );
  }

  try {
    // Parse parameters
    const graph = deserializeGraph(JSON.parse(graphParam));
    let query: string;

    if (queryParam) {
      query = queryParam;
    } else if (builderParam) {
      const spec = JSON.parse(builderParam);
      const builder = new PQLBuilder();
      builder.predict(spec.predict);
      if (spec.for) builder.for(...spec.for);
      if (spec.where) spec.where.forEach((w: string) => builder.where(w));
      query = builder.build();
    } else {
      throw new Error('No query provided');
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial event
          controller.enqueue(
            encoder.encode(`event: message\ndata: ${JSON.stringify({ status: 'starting' })}\n\n`)
          );

          // Initialize RFM client
          const rfm = createRFMClient(graph);

          // Simulate streaming progress (in real implementation, this would be actual progress)
          for (let i = 0; i <= 100; i += 10) {
            controller.enqueue(
              encoder.encode(`event: progress\ndata: ${JSON.stringify({ pct: i })}\n\n`)
            );
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Execute prediction
          const result = await rfm.predict(query);

          // Send result
          controller.enqueue(
            encoder.encode(`event: result\ndata: ${JSON.stringify(result)}\n\n`)
          );

          // Send done event
          controller.enqueue(
            encoder.encode(`event: done\ndata: ${JSON.stringify({ 
              stats: {
                rowCount: result.predictions.length,
                executionTime: result.metadata.executionTime
              }
            })}\n\n`)
          );

          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({
              message: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders(req.headers.get('Origin')),
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify(createAPIError('INTERNAL', error instanceof Error ? error.message : 'Unknown error')),
      { status: 500 }
    );
  }
});

// ============================================================================
// FUNCTION: rfm-health - supabase/functions/rfm-health/index.ts
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/utils.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req.headers.get('Origin')) });
  }

  const health = {
    status: 'ok',
    version: '1.0.0',
    time: new Date().toISOString(),
    environment: {
      hasKumoApiKey: !!Deno.env.get('KUMO_API_KEY'),
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasSupabaseKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
    },
  };

  return new Response(JSON.stringify(health), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(req.headers.get('Origin')),
    },
  });
});