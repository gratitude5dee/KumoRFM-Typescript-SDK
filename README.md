# KumoRFM TypeScript SDK

A fully-typed, modern TypeScript SDK for KumoRFM - a foundation model for business data that provides predictive analytics through a SQL-like query interface.

[![npm version](https://img.shields.io/npm/v/kumo-rfm-sdk.svg)](https://www.npmjs.com/package/kumo-rfm-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Coverage](https://img.shields.io/badge/coverage-90%25-green.svg)](https://github.com/yourusername/kumo-rfm-sdk)

## Features

- 🚀 **Full TypeScript Support** - Complete type safety with excellent IDE support
- 🔄 **100% Feature Parity** - All Python SDK features implemented
- 📊 **Smart Data Handling** - Automatic metadata inference and validation
- 🔗 **Graph-Based Architecture** - Intuitive table relationship management
- 🎯 **PQL Query Builder** - Type-safe predictive query construction
- ⚡ **Performance Optimized** - Efficient data processing and caching
- 🌐 **Isomorphic** - Works in both Node.js and browser environments
- 🔄 **Migration Support** - Easy migration from Python SDK

## Installation

```bash
npm install kumo-rfm-sdk
# or
yarn add kumo-rfm-sdk
# or
pnpm add kumo-rfm-sdk
```

## Quick Start

```typescript
import { init, LocalTable, LocalGraph, KumoRFM, PQLBuilder } from 'kumo-rfm-sdk';

// Initialize with your API key
init('your-api-key');

// Load your data
const usersData = [
  { user_id: 1, name: 'Alice', signup_date: '2024-01-01' },
  { user_id: 2, name: 'Bob', signup_date: '2024-01-02' },
];

const ordersData = [
  { order_id: 1, user_id: 1, amount: 99.99, created_at: '2024-02-01' },
  { order_id: 2, user_id: 2, amount: 149.99, created_at: '2024-02-15' },
];

// Create tables with automatic metadata inference
const users = new LocalTable(usersData, 'users').inferMetadata();
const orders = new LocalTable(ordersData, 'orders').inferMetadata();

// Build a graph with relationships
const graph = new LocalGraph([users, orders]);
graph.link('orders', 'user_id', 'users');

// Initialize the model
const model = new KumoRFM(graph);

// Make predictions using PQL
const query = new PQLBuilder()
  .predict('SUM(orders.amount)')
  .for('user_id')
  .where('orders.created_at > "2024-01-01"')
  .build();

const results = await model.predict(query);
console.log('Predictions:', results.predictions);
```

## Core Concepts

### LocalTable

Represents a data table with metadata and type information.

```typescript
const table = new LocalTable(data, 'table_name');

// Automatic metadata inference
table.inferMetadata();

// Manual configuration
table.setPrimaryKey('id');
table.setTimeColumn('created_at');

// Validation
const validation = table.validate();
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### LocalGraph

Manages relationships between tables.

```typescript
const graph = new LocalGraph([table1, table2, table3]);

// Define relationships
graph.link('orders', 'user_id', 'users');
graph.link('orders', 'item_id', 'items');

// Automatic relationship inference
graph.inferLinks();

// Validation
const validation = graph.validate();

// Visualization
graph.printMetadata();
graph.printLinks();
graph.visualize();
```

### KumoRFM

The main prediction model class.

```typescript
const model = new KumoRFM(graph, {
  apiKey: 'your-api-key',
  baseUrl: 'https://api.kumorfm.ai',
  timeout: 30000,
});

// Single prediction
const result = await model.predict(query);

// Batch predictions
const results = await model.batchPredict(queries, {
  concurrency: 5,
  useCache: true,
});
```

### PQL Query Builder

Type-safe query construction for predictions.

```typescript
const query = new PQLBuilder()
  .predict('COUNT(orders.order_id)') // Prediction target
  .for('user_id') // Entity to predict for
  .where('orders.status = "completed"') // Conditions
  .groupBy('category') // Grouping
  .orderBy('count DESC') // Sorting
  .limit(10) // Limit results
  .build();
```

## Common Use Cases

### Customer Lifetime Value (LTV)

```typescript
const ltvQuery = new PQLBuilder()
  .predict('SUM(orders.amount)')
  .for('user_id')
  .where('orders.created_at > DATE_SUB(NOW(), INTERVAL 1 YEAR)')
  .build();

const ltvPredictions = await model.predict(ltvQuery);
```

### Churn Prediction

```typescript
const churnQuery = new PQLBuilder()
  .predict('COUNT(orders.order_id)')
  .for('user_id')
  .where('orders.created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)')
  .build();

const churnRisk = await model.predict(churnQuery);
```

### Product Recommendations

```typescript
const recoQuery = new PQLBuilder()
  .predict('RANK(items.item_id)')
  .for('user_id')
  .where('user_id IN (1, 2, 3)')
  .limit(5)
  .build();

const recommendations = await model.predict(recoQuery);
```

### Fraud Detection

```typescript
const fraudQuery = new PQLBuilder()
  .predict('PROBABILITY(is_fraud)')
  .for('transaction_id')
  .where('amount > 1000')
  .build();

const fraudScores = await model.predict(fraudQuery);
```

## Advanced Features

### Data Preprocessing

```typescript
import { DataFrameUtils } from 'kumo-rfm-sdk';

// Aggregate data
const aggregated = DataFrameUtils.aggregate(data, 'user_id', {
  total_spend: (items) => items.reduce((sum, item) => sum + item.amount, 0),
  order_count: (items) => items.length,
  avg_order_value: (items) => {
    const sum = items.reduce((s, item) => s + item.amount, 0);
    return sum / items.length;
  },
});

// Group data
const grouped = DataFrameUtils.groupBy(data, 'category');
```

### Migration from Python

```typescript
import { MigrationUtils } from 'kumo-rfm-sdk';

// Convert Python queries
const pythonQuery = 'PREDICT COUNT(*) FOR user_id WHERE status is not None';
const tsQuery = MigrationUtils.convertPythonQuery(pythonQuery);

// Use pandas-like operations
const adapter = new MigrationUtils.PandasDataFrameAdapter(data);
console.log('Shape:', adapter.shape());
console.log('Head:', adapter.head(5));
console.log('Stats:', adapter.describe());
```

### Error Handling

```typescript
import { RFMError, ValidationError, APIError } from 'kumo-rfm-sdk';

try {
  const result = await model.predict(query);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message, error.details);
  } else if (error instanceof APIError) {
    console.error('API error:', error.message, 'Status:', error.statusCode);
  } else if (error instanceof RFMError) {
    console.error('RFM error:', error.code, error.message);
  }
}
```

### Custom Configuration

```typescript
const config: RFMConfig = {
  apiKey: process.env.KUMO_API_KEY,
  baseUrl: 'https://api.kumorfm.ai',
  timeout: 30000,
  maxRetries: 3,
  headers: {
    'X-Custom-Header': 'value',
  },
};

const model = new KumoRFM(graph, config);
```

## API Reference

### Core Classes

- `LocalTable<T>` - Data table with metadata
- `LocalGraph` - Graph structure for table relationships
- `KumoRFM` - Main prediction model
- `PQLBuilder` - Query builder for predictions
- `RFMApiClient` - API client for server communication

### Utility Functions

- `init(apiKey, config?)` - Initialize global configuration
- `authenticate()` - Authenticate with the API
- `query(pql)` - Execute standalone PQL query

### Types

```typescript
interface TableMetadata {
  primaryKey?: string;
  timeColumn?: string;
  semanticTypes: Record<string, SemanticType>;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface PredictionResult {
  query: string;
  predictions: Record<string, any>[];
  metadata: {
    executionTime: number;
    rowCount: number;
    modelVersion?: string;
  };
}
```

## Migration Guide

### From Python SDK

```python
# Python
import kumoai.experimental.rfm as rfm
from kumoai.experimental.rfm import LocalTable, LocalGraph, KumoRFM

rfm.init(api_key="your-key")
table = rfm.LocalTable(df=df, name="users").infer_metadata()
graph = rfm.LocalGraph(tables=[table])
model = KumoRFM(graph)
result = model.predict("PREDICT COUNT(*) FOR user_id")
```

```typescript
// TypeScript
import { init, LocalTable, LocalGraph, KumoRFM } from 'kumo-rfm-sdk';

init('your-key');
const table = new LocalTable(data, 'users').inferMetadata();
const graph = new LocalGraph([table]);
const model = new KumoRFM(graph);
const result = await model.predict('PREDICT COUNT(*) FOR user_id');
```

### Key Differences

1. **Async/Await**: All API calls are asynchronous in TypeScript
2. **Type Safety**: Full TypeScript types for all operations
3. **Data Format**: Uses native JavaScript arrays instead of pandas DataFrames
4. **Method Names**: camelCase instead of snake_case
5. **Error Handling**: Typed error classes with better error messages

## Performance Optimization

### Caching

```typescript
// Enable caching for repeated queries
const result = await model.predict(query, { useCache: true });

// Clear cache when needed
model.clearCache();
```

### Batch Processing

```typescript
// Process multiple queries efficiently
const results = await model.batchPredict(queries, {
  concurrency: 5, // Process 5 queries in parallel
  useCache: true, // Cache individual results
});
```

### Large Datasets

For large datasets, consider:

- Chunking data into smaller batches
- Using streaming where available
- Implementing pagination for results
- Utilizing worker threads in Node.js

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Building from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/kumo-rfm-sdk.git
cd kumo-rfm-sdk

# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test

# Generate documentation
npm run docs
```

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- 📚 [Documentation](https://github.com/yourusername/kumo-rfm-sdk/docs)
- 🐛 [Issue Tracker](https://github.com/yourusername/kumo-rfm-sdk/issues)
- 💬 [Discussions](https://github.com/yourusername/kumo-rfm-sdk/discussions)
- 📧 [Email Support](mailto:support@kumorfm.ai)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Original Python SDK by Kumo.ai team
- Built with TypeScript, Zod, and modern JavaScript tooling
- Inspired by best practices in SDK design

## Supabase Edge Functions & Client

## 📋 Table of Contents

## Shopify App Guide

Build an embedded Shopify Admin app (Remix + Polaris + App Bridge) that uses the KumoRFM SDK to provide predictive insights.

Architecture

- Shopify Data Ingestion: Fetch Products, Customers, and Orders via Shopify Admin GraphQL, handle pagination and rate limits, and shape to users/items/orders.
- KumoRFM Integration Layer: Build a LocalGraph using @kumo-ai/rfm-sdk and execute PQL queries via server-side Remix loaders/actions.
- Admin Frontend: Embedded React app renders churn probability and top product recommendations.

Phase 1: Project Scaffolding and Data Ingestion

- Create app:
  npm init @shopify/app@latest -- --template https://github.com/Shopify/shopify-app-template-remix
- Access scopes in shopify.app.toml:
  - read_products
  - read_customers
  - read_orders
- Implement data fetching at app/lib/shopify-data.server.ts:
  - Handle pageInfo.hasNextPage and endCursor for full pagination.
  - Observe extensions.cost to avoid rate limits.
  - Shape arrays:
    - users: { id, firstName, lastName, email, createdAt }
    - items: { id, title, handle, productType, vendor, createdAt }
    - orders: { id, customer_id, item_id, price, date } one row per line item.

Reference scaffold: shopify-app/app/lib/shopify-data.server.ts

Phase 2: KumoRFM Integration and API Endpoints

- Install the SDK: npm install @kumo-ai/rfm-sdk
- Environment: Add KUMO_API_KEY to your .env and expose it to the Remix server.
- Implement app/lib/kumorfm.server.ts with LocalTable -> LocalGraph linking and return new KumoRFM(graph, { apiKey: process.env.KUMO_API_KEY! }).
- Create resource route app/routes/api.kumorfm.tsx (loader only):
  - Authenticate admin, fetch data, build rfm, read PQL_QUERY_TYPE and CUSTOMER_ID from URL.
  - product_recommendations:
    PREDICT LIST_DISTINCT(orders.item_id, 0, 30, days) RANK TOP 5 FOR users.id='gid://shopify/Customer/CUSTOMER_ID'
  - churn_prediction:
    PREDICT COUNT(orders.\*, 0, 90, days)=0 FOR users.id='gid://shopify/Customer/CUSTOMER_ID'

Reference scaffolds:

- shopify-app/app/lib/kumorfm.server.ts
- shopify-app/app/routes/api.kumorfm.tsx

Phase 3: Shopify Admin Frontend (Remix + Polaris)

- Customer page app/routes/app.customer.$id.tsx:
  - Loader fetches Shopify customer.
  - useEffect calls /api/kumorfm for churn_prediction and product_recommendations via App Bridge fetch.
  - UI: Badge risk levels and ResourceList of top 5 recommendations with scores.
- Dashboard app/routes/app.\_index.tsx:
  - Button "Sync Data with KumoRFM" triggers an action to run fetchShopifyData asynchronously and optionally cache results.

Verification and Checkpoints

- Checkpoint 1: After Phase 1, print the { users, items, orders } shapes for review.
- Checkpoint 2: After Phase 2, test /api/kumorfm with curl:
  curl "https://your-app/api/kumorfm?PQL_QUERY_TYPE=churn_prediction&CUSTOMER_ID=gid://shopify/Customer/123"
- Checkpoint 3: Before finishing, run npm run dev. Sync data, open a customer page, verify churn probability and recommendations.

See full scaffold in shopify-app/.

## Legacy and Migration Notes

Legacy monolithic files are superseded by the organized src/ SDK and supabase/functions structure. They have been archived under legacy/ for reference and are excluded from builds and packaging.

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup & Installation](#setup--installation)
- [API Reference](#api-reference)
- [Client SDKs](#client-sdks)
- [Security](#security)
- [Performance](#performance)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

This implementation exposes the KumoRFM TypeScript SDK as secure, typed HTTP endpoints via Supabase Edge Functions. All functions run on Deno runtime with:

- 🔐 JWT-based authentication via Supabase Auth
- 🚀 Type-safe request/response with Zod validation
- ⚡ Streaming support for long-running predictions
- 📊 Rate limiting and caching capabilities
- 🌐 CORS support for browser clients

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│ Edge Function│────▶│  KumoRFM    │
│ (Browser/   │◀────│   (Deno)     │◀────│    API      │
│  Node.js)   │     └──────────────┘     └─────────────┘
└─────────────┘            │
                           │
                    ┌──────▼──────┐
                    │  Supabase   │
                    │   Database  │
                    └─────────────┘
```

## Setup & Installation

### Prerequisites

- Supabase project with Edge Functions enabled
- KumoRFM API key
- Node.js 16+ (for local development)
- Deno CLI (optional, for local testing)

### 1. Initialize Supabase Project

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init

# Link to your Supabase project
supabase link --project-ref your-project-ref
```

### 2. Create Edge Functions

```bash
# Create all required functions
supabase functions new rfm-init
supabase functions new rfm-graph-validate
supabase functions new rfm-graph-build
supabase functions new rfm-predict
supabase functions new rfm-pql-build
supabase functions new rfm-predict-stream
supabase functions new rfm-health
```

### 3. Set Environment Variables

```bash
# Set secrets
supabase secrets set \
  KUMO_API_KEY="sk_kumo_your_api_key" \
  KUMO_BASE_URL="https://api.kumorfm.ai" \
  CORS_ORIGINS="https://app.example.com,http://localhost:3000"
```

### 4. Deploy Functions

```bash
# Deploy all functions
supabase functions deploy rfm-init
supabase functions deploy rfm-graph-validate
supabase functions deploy rfm-graph-build
supabase functions deploy rfm-predict
supabase functions deploy rfm-pql-build
supabase functions deploy rfm-predict-stream
supabase functions deploy rfm-health
```

## API Reference

### Authentication

All endpoints except `/rfm-health` require a valid Supabase JWT token:

```http
Authorization: Bearer <jwt-token>
```

### Endpoints

#### POST /rfm-init

Initialize or refresh the RFM client configuration.

**Request:**

```json
{
  "config": {
    "baseUrl": "https://api.kumorfm.ai",
    "timeout": 60000,
    "maxRetries": 3
  }
}
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "initialized": true
  }
}
```

#### POST /rfm-graph-validate

Validate a graph structure before predictions.

**Request:**

```json
{
  "graph": {
    "tables": [
      {
        "name": "users",
        "data": [...],
        "metadata": {...}
      }
    ],
    "links": [
      {
        "srcTable": "orders",
        "fkey": "user_id",
        "dstTable": "users"
      }
    ]
  }
}
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": []
  }
}
```

#### POST /rfm-graph-build

Build a graph from inline data or Supabase tables.

**Request (inline data):**

```json
{
  "data": {
    "users": [
      { "user_id": 1, "name": "Alice" },
      { "user_id": 2, "name": "Bob" }
    ],
    "orders": [{ "order_id": 1, "user_id": 1, "amount": 99.99 }]
  },
  "inferMetadata": true,
  "inferLinks": true
}
```

**Request (from database):**

```json
{
  "sources": {
    "tables": ["users", "orders", "items"],
    "schema": "public"
  },
  "inferMetadata": true,
  "inferLinks": true
}
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "graph": {...},
    "metadata": [
      {
        "name": "users",
        "rowCount": 2,
        "schema": {...}
      }
    ]
  }
}
```

#### POST /rfm-predict

Execute a prediction query.

**Request:**

```json
{
  "query": "PREDICT COUNT(orders.order_id) FOR user_id",
  "graph": {...},
  "options": {
    "useCache": true,
    "timeout": 30000
  }
}
```

**Request (with builder):**

```json
{
  "builder": {
    "predict": "SUM(orders.amount)",
    "for": ["user_id"],
    "where": ["orders.created_at > '2024-01-01'"],
    "groupBy": ["category"],
    "orderBy": ["total DESC"],
    "limit": 10
  },
  "graph": {...}
}
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "query": "...",
    "predictions": [
      { "user_id": 1, "prediction": 2.5 },
      { "user_id": 2, "prediction": 1.8 }
    ],
    "metadata": {
      "executionTime": 1234,
      "rowCount": 2,
      "modelVersion": "1.0.0"
    }
  }
}
```

#### POST /rfm-pql-build

Build a PQL query from a typed specification.

**Request:**

```json
{
  "predict": "COUNT(orders.order_id)",
  "for": ["user_id"],
  "where": ["status = 'active'"],
  "groupBy": ["category"],
  "orderBy": ["count DESC"],
  "limit": 10
}
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "query": "PREDICT COUNT(orders.order_id) FOR user_id WHERE status = 'active' GROUP BY category ORDER BY count DESC LIMIT 10"
  }
}
```

#### GET /rfm-predict-stream

Stream prediction progress via Server-Sent Events.

**Request:**

```http
GET /rfm-predict-stream?query=PREDICT...&graph={...}
Accept: text/event-stream
Authorization: Bearer <jwt>
```

**Response (SSE stream):**

```
event: message
data: {"status": "starting"}

event: progress
data: {"pct": 25}

event: progress
data: {"pct": 50}

event: result
data: {"predictions": [...]}

event: done
data: {"stats": {"rowCount": 100, "executionTime": 1234}}
```

#### GET /rfm-health

Health check endpoint (no authentication required).

**Response:**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "time": "2024-01-01T00:00:00Z",
  "environment": {
    "hasKumoApiKey": true,
    "hasSupabaseUrl": true,
    "hasSupabaseKey": true
  }
}
```

## Client SDKs

### JavaScript/TypeScript Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authenticate
await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Make prediction
const { data, error } = await supabase.functions.invoke('rfm-predict', {
  body: {
    query: 'PREDICT COUNT(orders.order_id) FOR user_id',
    graph: myGraph,
  },
});
```

### React Hook

```tsx
import { useKumoRFM } from './hooks/useKumoRFM';

function MyComponent() {
  const { predict, buildGraph, loading, error } = useKumoRFM({
    supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
    supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
  });

  const handlePredict = async () => {
    const result = await predict({
      query: 'PREDICT ...',
      graph: myGraph,
    });
    console.log(result);
  };

  return (
    <button onClick={handlePredict} disabled={loading}>
      {loading ? 'Predicting...' : 'Predict'}
    </button>
  );
}
```

### cURL

```bash
# Authenticate and get JWT
JWT=$(curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  "$SUPABASE_URL/auth/v1/token" | jq -r .access_token)

# Make prediction
curl -X POST \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "PREDICT COUNT(orders.order_id) FOR user_id",
    "graph": {...}
  }' \
  "$SUPABASE_URL/functions/v1/rfm-predict"
```

## Security

### Authentication

- All endpoints (except health) require valid Supabase JWT
- User context is extracted from JWT for RLS
- Service role key is never exposed to clients

### Rate Limiting

Built-in rate limiting using Deno KV:

- Default: 100 requests per minute per user
- Configurable via environment variables
- Returns 429 status when exceeded

### CORS

Configurable CORS origins via `CORS_ORIGINS` environment variable:

- Supports multiple origins (comma-separated)
- Wildcard `*` support for development
- Proper preflight handling

### Input Validation

All inputs validated with Zod schemas:

- Type checking at runtime
- Clear error messages
- Protection against injection attacks

## Performance

### Caching

- Graph metadata cached in Deno KV
- Prediction results cacheable per query
- Cache invalidation on graph changes

### Optimization Tips

1. **Batch Predictions**: Use the predict endpoint with multiple queries
2. **Graph Reuse**: Cache serialized graphs client-side
3. **Streaming**: Use SSE endpoint for long-running predictions
4. **Connection Pooling**: Reuse Supabase client instances

### Benchmarks

| Operation   | Average Time | Max Throughput |
| ----------- | ------------ | -------------- |
| Graph Build | ~500ms       | 200 req/s      |
| Validation  | ~50ms        | 2000 req/s     |
| Prediction  | ~2000ms      | 50 req/s       |
| PQL Build   | ~10ms        | 10000 req/s    |

## Deployment

### Production Checklist

- [ ] Set production API keys
- [ ] Configure CORS for production domains
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerting
- [ ] Configure auto-scaling
- [ ] Enable caching
- [ ] Set up backup strategy

### Monitoring

Monitor your functions via Supabase Dashboard:

- Function invocations
- Error rates
- Response times
- Resource usage

### Scaling

Edge Functions automatically scale based on load:

- Concurrent execution: Up to 1000
- Memory: 256MB per function
- Timeout: 60 seconds max
- Consider batching for high-volume scenarios

## Testing

### Local Development

```bash
# Run functions locally
supabase functions serve rfm-predict --no-verify-jwt

# Test with curl
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"...","graph":{...}}' \
  http://localhost:54321/functions/v1/rfm-predict
```

### Unit Tests

```bash
# Run Deno tests
deno test --allow-net --allow-env tests/

# With coverage
deno test --coverage=coverage/ tests/
```

### Integration Tests

```typescript
// tests/integration.test.ts
Deno.test('End-to-end prediction flow', async () => {
  // 1. Build graph
  const graph = await buildGraph(testData);

  // 2. Validate
  const validation = await validateGraph(graph);
  assert(validation.valid);

  // 3. Predict
  const result = await predict({
    query: 'PREDICT ...',
    graph,
  });

  assert(result.predictions.length > 0);
});
```

## Troubleshooting

### Common Issues

#### 401 Unauthorized

- Check JWT token is valid
- Ensure user is authenticated
- Verify Supabase URL and anon key

#### 400 Bad Request

- Validate request payload matches schema
- Check graph structure is valid
- Ensure PQL syntax is correct

#### 500 Internal Error

- Check KUMO_API_KEY is set
- Verify network connectivity
- Check function logs for details

#### 429 Rate Limited

- Implement exponential backoff
- Consider batching requests
- Increase rate limits if needed

### Debug Mode

Enable debug logging:

```typescript
// In function code
if (Deno.env.get('DEBUG') === 'true') {
  console.log('Request:', body);
  console.log('Graph:', graph);
}
```

## License

MIT License - See LICENSE file for details

---

Made with ❤️ by the UniversalAI x 5-Dee Studios community
