# Hyper-Personalized E‑commerce Analytics Engine (Example)

This example is an isolated monorepo under `examples/analytics-engine/` that demonstrates a three‑tier architecture for building a hyper‑personalized analytics engine powered by KumoRFM:

- Core TypeScript SDK: `src/`
- Supabase Edge Functions (BFF): `supabase/functions/`
- Shopify Admin demo app (Remix + Polaris): `shopify-app/app/`

It is self‑contained, has its own tooling, and is excluded from the root package publish and lint to avoid interference.

Architecture

- Data: Shopify Admin API -> shaped into users/items/orders
- Graph: LocalTable + LocalGraph (orders links to users via customer_id and to items via item_id)
- Queries: PQLBuilder and KumoRFM.predict
- API: Supabase Edge Functions wrap the SDK and provide HTTP endpoints
- UI: Shopify Admin embedded app calls the BFF for insights

ASCII Overview
[Shopify Admin] -> [Remix loaders] -> [LocalGraph + KumoRFM] -> [Supabase Edge Functions (BFF)]
| ^
+------------------------------ fetch -------------------------+

Repository structure

- src/ Core example SDK
  - core/ LocalTable, LocalGraph, KumoRFM, types
  - api/ Mock API client and domain errors
  - query/ PQLBuilder fluent API
  - utils/ Data helpers
  - index.ts Barrel exports
- supabase/functions/ Supabase Edge Functions (Deno)
  - \_shared/ cors/response/auth helpers, schemas, sdk helpers
  - rfm-health/ Health check
  - rfm-graph-build/ Build graph from payload
  - rfm-graph-validate/ Validate graph
  - rfm-pql-build/ Build PQL from params
  - rfm-predict/ Run predict
  - rfm-predict-stream/ Streaming stub
  - rfm-init/ Init stub
- shopify-app/app/ Remix app stubs
  - lib/ shopify-data.server.ts, kumorfm.server.ts
  - routes/ api.kumorfm.tsx, app.\_index.tsx, app.customer.$id.tsx

Prereqs

- Node.js 20+
- Deno 1.40+
- No external services required; the example uses a mocked KumoRFM client. If you set KUMO_API_KEY, it will be forwarded but not required.

Install and local checks

- cd examples/analytics-engine
- npm ci
- npm run lint
- npm run format:check
- npm test
- npm run build
- npm run docs
- deno fmt --check supabase/functions
- deno lint supabase/functions

Supabase Edge Functions (BFF)

- Health
  curl -i http://localhost:54321/functions/v1/rfm-health
- Build graph
  curl -s -X POST http://localhost:54321/functions/v1/rfm-graph-build \
   -H "content-type: application/json" \
   -d '{
  "users": [{"id":"u1"}],
  "items": [{"id":"i1"}],
  "orders":[{"id":"o1","customer_id":"u1","item_id":"i1","price":"10.00","date":"2024-01-01"}]
  }'
- Validate graph
  curl -s -X POST http://localhost:54321/functions/v1/rfm-graph-validate \
   -H "content-type: application/json" \
   -d '{"users":[{"id":"u1"}],"items":[{"id":"i1"}],"orders":[{"id":"o1","customer_id":"u1","item_id":"i1"}]}'
- Build PQL
  curl -s -X POST http://localhost:54321/functions/v1/rfm-pql-build \
   -H "content-type: application/json" \
   -d '{"type":"product_recommendations","customerId":"gid://shopify/Customer/1"}'
- Predict
  curl -s -X POST http://localhost:54321/functions/v1/rfm-predict \
   -H "content-type: application/json" \
   -d '{
  "graph": {
  "users": [{"id":"u1"}],
  "items": [{"id":"i1"}],
  "orders":[{"id":"o1","customer_id":"u1","item_id":"i1","price":"10.00","date":"2024-01-01"}]
  },
  "pql": "PREDICT COUNT(orders.\*, 0, 90, days)=0 FOR users.id='\''u1'\''"
  }'

Shopify Admin demo (Remix)

- This is a scaffold to illustrate integration. To run a real Shopify app:
  1. Create an app using the official template:
     npm init @shopify/app@latest -- --template https://github.com/Shopify/shopify-app-template-remix
  2. Request scopes in shopify.app.toml:
     - read_products
     - read_customers
     - read_orders
  3. Copy these example files into your app:
     - app/lib/shopify-data.server.ts
     - app/lib/kumorfm.server.ts
     - app/routes/api.kumorfm.tsx
     - app/routes/app.\_index.tsx
     - app/routes/app.customer.$id.tsx
  4. Set KUMO_API_KEY in your app environment.
  5. npm install and npm run dev per Shopify docs.
- Data ingestion: app/lib/shopify-data.server.ts paginates customers/products/orders and shapes into users/items/orders, one order line item per row.

Notes

- Lint and format are scoped to src/ in this example package; shopify-app and supabase code are excluded from Node ESLint to avoid requiring those deps. Deno lint/fmt validate the Supabase code.
- The SDK is a mock for demo purposes; replace the mock client with the real Kumo SDK client when integrating with production services.
