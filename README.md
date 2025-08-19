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
  { user_id: 2, name: 'Bob', signup_date: '2024-01-02' }
];

const ordersData = [
  { order_id: 1, user_id: 1, amount: 99.99, created_at: '2024-02-01' },
  { order_id: 2, user_id: 2, amount: 149.99, created_at: '2024-02-15' }
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
  timeout: 30000
});

// Single prediction
const result = await model.predict(query);

// Batch predictions
const results = await model.batchPredict(queries, {
  concurrency: 5,
  useCache: true
});
```

### PQL Query Builder

Type-safe query construction for predictions.

```typescript
const query = new PQLBuilder()
  .predict('COUNT(orders.order_id)')      // Prediction target
  .for('user_id')                         // Entity to predict for
  .where('orders.status = "completed"')   // Conditions
  .groupBy('category')                    // Grouping
  .orderBy('count DESC')                   // Sorting
  .limit(10)                              // Limit results
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
const aggregated = DataFrameUtils.aggregate(
  data,
  'user_id',
  {
    total_spend: items => items.reduce((sum, item) => sum + item.amount, 0),
    order_count: items => items.length,
    avg_order_value: items => {
      const sum = items.reduce((s, item) => s + item.amount, 0);
      return sum / items.length;
    }
  }
);

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
    'X-Custom-Header': 'value'
  }
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
  concurrency: 5,  // Process 5 queries in parallel
  useCache: true    // Cache individual results
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

---

Made with ❤️ by the UniversalAI x 5-Dee Studios community
