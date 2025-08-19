// ============================================================================
// DENO CONFIGURATION - deno.json
// ============================================================================
{
  "imports": {
    "std/": "https://deno.land/std@0.177.0/",
    "npm:": "https://esm.sh/",
    "@supabase/": "https://esm.sh/@supabase/"
  },
  "tasks": {
    "serve": "deno run --allow-net --allow-env --allow-read --watch supabase/functions/*/index.ts",
    "test": "deno test --allow-net --allow-env",
    "fmt": "deno fmt",
    "lint": "deno lint"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  },
  "fmt": {
    "files": {
      "include": ["supabase/functions/"],
      "exclude": ["node_modules/", "dist/"]
    },
    "options": {
      "useTabs": false,
      "lineWidth": 100,
      "indentWidth": 2,
      "singleQuote": true
    }
  },
  "lint": {
    "files": {
      "include": ["supabase/functions/"],
      "exclude": ["node_modules/", "dist/"]
    }
  }
}

// ============================================================================
// BROWSER CLIENT - client/kumo-rfm-client.ts
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface KumoRFMClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  functionUrl?: string;
}

export class KumoRFMClient {
  private supabase: SupabaseClient;
  private functionUrl: string;

  constructor(config: KumoRFMClientConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    this.functionUrl = config.functionUrl || `${config.supabaseUrl}/functions/v1`;
  }

  async init(config?: { baseUrl?: string; timeout?: number }): Promise<void> {
    const { data, error } = await this.supabase.functions.invoke('rfm-init', {
      body: { config },
    });

    if (error) throw error;
    return data;
  }

  async validateGraph(graph: any): Promise<any> {
    const { data, error } = await this.supabase.functions.invoke('rfm-graph-validate', {
      body: { graph },
    });

    if (error) throw error;
    return data;
  }

  async buildGraph(options: {
    data?: Record<string, any[]>;
    sources?: { tables: string[]; schema?: string };
    inferMetadata?: boolean;
    inferLinks?: boolean;
  }): Promise<any> {
    const { data, error } = await this.supabase.functions.invoke('rfm-graph-build', {
      body: options,
    });

    if (error) throw error;
    return data;
  }

  async predict(params: {
    query?: string;
    builder?: any;
    graph: any;
    options?: { useCache?: boolean; timeout?: number };
  }): Promise<any> {
    const { data, error } = await this.supabase.functions.invoke('rfm-predict', {
      body: params,
    });

    if (error) throw error;
    return data;
  }

  async buildPQL(spec: {
    predict: string;
    for?: string[];
    where?: string[];
    groupBy?: string[];
    orderBy?: string[];
    limit?: number;
  }): Promise<{ query: string }> {
    const { data, error } = await this.supabase.functions.invoke('rfm-pql-build', {
      body: spec,
    });

    if (error) throw error;
    return data;
  }

  async streamPredict(params: {
    query?: string;
    builder?: any;
    graph: any;
  }): Promise<EventSource> {
    const { data: { session } } = await this.supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const url = new URL(`${this.functionUrl}/rfm-predict-stream`);
    if (params.query) {
      url.searchParams.set('query', params.query);
    }
    if (params.builder) {
      url.searchParams.set('builder', JSON.stringify(params.builder));
    }
    url.searchParams.set('graph', JSON.stringify(params.graph));

    const eventSource = new EventSource(url.toString(), {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    } as any);

    return eventSource;
  }

  async health(): Promise<any> {
    const response = await fetch(`${this.functionUrl}/rfm-health`);
    return response.json();
  }
}

// ============================================================================
// REACT HOOKS - client/hooks/useKumoRFM.tsx
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { KumoRFMClient } from '../kumo-rfm-client';

export function useKumoRFM(config: {
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const [client] = useState(() => new KumoRFMClient(config));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const predict = useCallback(async (params: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.predict(params);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const buildGraph = useCallback(async (options: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.buildGraph(options);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  return {
    client,
    predict,
    buildGraph,
    loading,
    error,
  };
}

// ============================================================================
// USAGE EXAMPLES - examples/basic-usage.ts
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function basicExample() {
  // 1. Authenticate user
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'user@example.com',
    password: 'password',
  });

  if (authError) throw authError;

  // 2. Build a graph from inline data
  const { data: graphData, error: buildError } = await supabase.functions.invoke('rfm-graph-build', {
    body: {
      data: {
        users: [
          { user_id: 1, name: 'Alice', signup_date: '2024-01-01' },
          { user_id: 2, name: 'Bob', signup_date: '2024-01-02' },
        ],
        orders: [
          { order_id: 1, user_id: 1, amount: 99.99, created_at: '2024-02-01' },
          { order_id: 2, user_id: 2, amount: 149.99, created_at: '2024-02-15' },
        ],
      },
      inferMetadata: true,
      inferLinks: true,
    },
  });

  if (buildError) throw buildError;

  const { graph, metadata } = graphData;
  console.log('Graph built:', metadata);

  // 3. Validate the graph
  const { data: validation, error: validationError } = await supabase.functions.invoke('rfm-graph-validate', {
    body: { graph },
  });

  if (validationError) throw validationError;
  console.log('Validation result:', validation);

  // 4. Build a PQL query
  const { data: pqlData, error: pqlError } = await supabase.functions.invoke('rfm-pql-build', {
    body: {
      predict: 'SUM(orders.amount)',
      for: ['user_id'],
      where: ['orders.created_at > "2024-01-01"'],
    },
  });

  if (pqlError) throw pqlError;
  console.log('Generated query:', pqlData.query);

  // 5. Make a prediction
  const { data: prediction, error: predictError } = await supabase.functions.invoke('rfm-predict', {
    body: {
      query: pqlData.query,
      graph,
      options: { useCache: true },
    },
  });

  if (predictError) throw predictError;
  console.log('Prediction results:', prediction);
}

// ============================================================================
// STREAMING EXAMPLE - examples/streaming.ts
// ============================================================================

async function streamingExample() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  // Authenticate
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Prepare graph (assume already built)
  const graph = { /* ... */ };

  // Create SSE connection
  const url = new URL(`${process.env.SUPABASE_URL}/functions/v1/rfm-predict-stream`);
  url.searchParams.set('query', 'PREDICT COUNT(orders.order_id) FOR user_id');
  url.searchParams.set('graph', JSON.stringify(graph));

  const eventSource = new EventSource(url.toString(), {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  } as any);

  // Handle events
  eventSource.addEventListener('message', (event) => {
    console.log('Message:', JSON.parse(event.data));
  });

  eventSource.addEventListener('progress', (event) => {
    const { pct } = JSON.parse(event.data);
    console.log(`Progress: ${pct}%`);
  });

  eventSource.addEventListener('result', (event) => {
    const result = JSON.parse(event.data);
    console.log('Result:', result);
  });

  eventSource.addEventListener('done', (event) => {
    const { stats } = JSON.parse(event.data);
    console.log('Completed:', stats);
    eventSource.close();
  });

  eventSource.addEventListener('error', (event) => {
    console.error('Error:', event);
    eventSource.close();
  });
}

// ============================================================================
// CURL EXAMPLES - examples/curl-examples.sh
// ============================================================================

#!/bin/bash

# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_JWT="your-jwt-token"

# 1. Health check (no auth required)
curl -X GET \
  "$SUPABASE_URL/functions/v1/rfm-health"

# 2. Initialize RFM client
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"config":{"timeout":60000}}' \
  "$SUPABASE_URL/functions/v1/rfm-init"

# 3. Build graph from inline data
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "users": [
        {"user_id": 1, "name": "Alice"},
        {"user_id": 2, "name": "Bob"}
      ],
      "orders": [
        {"order_id": 1, "user_id": 1, "amount": 99.99}
      ]
    },
    "inferMetadata": true,
    "inferLinks": true
  }' \
  "$SUPABASE_URL/functions/v1/rfm-graph-build"

# 4. Build PQL query
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "predict": "COUNT(orders.order_id)",
    "for": ["user_id"],
    "where": ["orders.amount > 50"]
  }' \
  "$SUPABASE_URL/functions/v1/rfm-pql-build"

# 5. Make prediction
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "PREDICT COUNT(orders.order_id) FOR user_id",
    "graph": {
      "tables": [...],
      "links": [...]
    }
  }' \
  "$SUPABASE_URL/functions/v1/rfm-predict"

# 6. Stream predictions
curl -X GET \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Accept: text/event-stream" \
  "$SUPABASE_URL/functions/v1/rfm-predict-stream?query=PREDICT%20COUNT(*)&graph={...}"

// ============================================================================
// DEPLOYMENT GUIDE - deployment/deploy.sh
// ============================================================================

#!/bin/bash

echo "🚀 Deploying KumoRFM Edge Functions"

# 1. Create all functions
echo "Creating functions..."
supabase functions new rfm-init
supabase functions new rfm-graph-validate
supabase functions new rfm-graph-build
supabase functions new rfm-predict
supabase functions new rfm-pql-build
supabase functions new rfm-predict-stream
supabase functions new rfm-health

# 2. Copy function implementations
echo "Copying implementations..."
cp -r supabase/functions/* ./supabase/functions/

# 3. Set secrets
echo "Setting secrets..."
supabase secrets set \
  KUMO_API_KEY="$KUMO_API_KEY" \
  KUMO_BASE_URL="https://api.kumorfm.ai" \
  CORS_ORIGINS="https://app.example.com,http://localhost:3000"

# 4. Deploy functions
echo "Deploying functions..."
supabase functions deploy rfm-init
supabase functions deploy rfm-graph-validate
supabase functions deploy rfm-graph-build
supabase functions deploy rfm-predict
supabase functions deploy rfm-pql-build
supabase functions deploy rfm-predict-stream
supabase functions deploy rfm-health

echo "✅ Deployment complete!"

# 5. Test deployment
echo "Testing deployment..."
curl -X GET "$SUPABASE_URL/functions/v1/rfm-health"

// ============================================================================
// ENVIRONMENT VARIABLES - .env.example
// ============================================================================

# Supabase configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# KumoRFM configuration
KUMO_API_KEY=sk_kumo_your_api_key
KUMO_BASE_URL=https://api.kumorfm.ai

# CORS configuration
CORS_ORIGINS=https://app.example.com,http://localhost:3000

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000

// ============================================================================
// TESTING - tests/edge-functions.test.ts
// ============================================================================

import { assertEquals, assertExists } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.test('Health check endpoint', async () => {
  const response = await fetch(`${supabaseUrl}/functions/v1/rfm-health`);
  const data = await response.json();
  
  assertEquals(response.status, 200);
  assertEquals(data.status, 'ok');
  assertExists(data.version);
  assertExists(data.time);
});

Deno.test('Graph validation', async () => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Sign in first
  await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword',
  });

  const { data, error } = await supabase.functions.invoke('rfm-graph-validate', {
    body: {
      graph: {
        tables: [
          {
            name: 'users',
            data: [{ user_id: 1, name: 'Test' }],
            metadata: { primaryKey: 'user_id', semanticTypes: {} },
          },
        ],
        links: [],
      },
    },
  });

  assertEquals(error, null);
  assertExists(data);
  assertEquals(data.valid, true);
});

Deno.test('PQL query building', async () => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword',
  });

  const { data, error } = await supabase.functions.invoke('rfm-pql-build', {
    body: {
      predict: 'COUNT(*)',
      for: ['user_id'],
      where: ['status = "active"'],
    },
  });

  assertEquals(error, null);
  assertExists(data.query);
  assertEquals(data.query, 'PREDICT COUNT(*) FOR user_id WHERE status = "active"');
});