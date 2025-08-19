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
  const body = error ? { ok: false, error } : { ok: true, data };
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

export async function checkRateLimit(
  userId: string,
  limit: number = 100,
  window: number = 60000
): Promise<boolean> {
  const kv = await Deno.openKv();
  const key = ['rate_limit', userId, Math.floor(Date.now() / window)];
  const result = await kv.atomic().sum(key, 1n).commit();
  const count = result.versionstamp ? Number(result.versionstamp) : 0;
  return count <= limit;
}
