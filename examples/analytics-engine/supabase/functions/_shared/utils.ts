export function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  };
}

export function createResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders() },
  });
}

export function createAPIError(status: number, message: string): Response {
  return createResponse(status, { error: message });
}

export function authenticateUser(_req: Request): { userId: string } | null {
  return { userId: "demo" };
}
