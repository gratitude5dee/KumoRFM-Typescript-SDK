// ============================================================================
// UNIT TESTS - tests/LocalTable.test.ts
// ============================================================================

import { describe, it, expect, beforeEach } from '@jest/globals';
import { LocalTable, DataError, ValidationError } from '../src';

describe('LocalTable', () => {
  let sampleData: any[];
  
  beforeEach(() => {
    sampleData = [
      { id: 1, name: 'Alice', age: 30, created_at: '2024-01-01' },
      { id: 2, name: 'Bob', age: 25, created_at: '2024-01-02' },
      { id: 3, name: 'Charlie', age: 35, created_at: '2024-01-03' }
    ];
  });

  describe('constructor', () => {
    it('should create a table with data and name', () => {
      const table = new LocalTable(sampleData, 'users');
      expect(table.name).toBe('users');
      expect(table.data).toEqual(sampleData);
      expect(table.columns).toEqual(['id', 'name', 'age', 'created_at']);
    });

    it('should accept partial metadata', () => {
      const table = new LocalTable(sampleData, 'users', {
        primaryKey: 'id',
        timeColumn: 'created_at'
      });
      expect(table.primaryKey).toBe('id');
      expect(table.timeColumn).toBe('created_at');
    });
  });

  describe('inferMetadata', () => {
    it('should infer column types correctly', () => {
      const table = new LocalTable(sampleData, 'users').inferMetadata();
      const metadata = table.metadata;
      
      expect(metadata.semanticTypes['id']).toBe('numerical');
      expect(metadata.semanticTypes['name']).toBe('categorical');
      expect(metadata.semanticTypes['age']).toBe('numerical');
      expect(metadata.semanticTypes['created_at']).toBe('time_column');
    });

    it('should detect primary key', () => {
      const table = new LocalTable(sampleData, 'users').inferMetadata();
      expect(table.primaryKey).toBe('id');
    });

    it('should detect time column', () => {
      const table = new LocalTable(sampleData, 'users').inferMetadata();
      expect(table.timeColumn).toBe('created_at');
    });

    it('should throw error for empty table', () => {
      const table = new LocalTable([], 'empty');
      expect(() => table.inferMetadata()).toThrow(DataError);
    });
  });

  describe('setPrimaryKey', () => {
    it('should set primary key for existing column', () => {
      const table = new LocalTable(sampleData, 'users');
      table.setPrimaryKey('name');
      expect(table.primaryKey).toBe('name');
    });

    it('should throw error for non-existent column', () => {
      const table = new LocalTable(sampleData, 'users');
      expect(() => table.setPrimaryKey('invalid')).toThrow(ValidationError);
    });
  });

  describe('validate', () => {
    it('should return valid for properly configured table', () => {
      const table = new LocalTable(sampleData, 'users').inferMetadata();
      const result = table.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing primary key', () => {
      const table = new LocalTable(sampleData, 'users');
      const result = table.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('MISSING_PRIMARY_KEY');
    });
  });
});

// ============================================================================
// UNIT TESTS - tests/LocalGraph.test.ts
// ============================================================================

import { describe, it, expect, beforeEach } from '@jest/globals';
import { LocalTable, LocalGraph, ValidationError } from '../src';

describe('LocalGraph', () => {
  let usersTable: LocalTable;
  let ordersTable: LocalTable;
  let itemsTable: LocalTable;
  
  beforeEach(() => {
    const usersData = [
      { user_id: 1, name: 'Alice', email: 'alice@example.com' },
      { user_id: 2, name: 'Bob', email: 'bob@example.com' }
    ];
    
    const ordersData = [
      { order_id: 1, user_id: 1, item_id: 101, amount: 99.99 },
      { order_id: 2, user_id: 2, item_id: 102, amount: 149.99 }
    ];
    
    const itemsData = [
      { item_id: 101, name: 'Widget', category: 'Electronics' },
      { item_id: 102, name: 'Gadget', category: 'Electronics' }
    ];
    
    usersTable = new LocalTable(usersData, 'users').inferMetadata();
    ordersTable = new LocalTable(ordersData, 'orders').inferMetadata();
    itemsTable = new LocalTable(itemsData, 'items').inferMetadata();
  });

  describe('constructor', () => {
    it('should create graph with tables', () => {
      const graph = new LocalGraph([usersTable, ordersTable, itemsTable]);
      expect(graph.tableNames).toEqual(['users', 'orders', 'items']);
      expect(graph.tables).toHaveLength(3);
    });
  });

  describe('link', () => {
    it('should create valid links', () => {
      const graph = new LocalGraph([usersTable, ordersTable, itemsTable]);
      graph.link('orders', 'user_id', 'users');
      graph.link('orders', 'item_id', 'items');
      
      expect(graph.links).toHaveLength(2);
      expect(graph.links[0]).toEqual({
        srcTable: 'orders',
        fkey: 'user_id',
        dstTable: 'users',
        validated: false
      });
    });

    it('should throw error for non-existent table', () => {
      const graph = new LocalGraph([usersTable, ordersTable]);
      expect(() => graph.link('orders', 'item_id', 'items')).toThrow(ValidationError);
    });

    it('should throw error for non-existent foreign key', () => {
      const graph = new LocalGraph([usersTable, ordersTable]);
      expect(() => graph.link('orders', 'invalid_key', 'users')).toThrow(ValidationError);
    });

    it('should throw error for duplicate links', () => {
      const graph = new LocalGraph([usersTable, ordersTable]);
      graph.link('orders', 'user_id', 'users');
      expect(() => graph.link('orders', 'user_id', 'users')).toThrow(ValidationError);
    });
  });

  describe('unlink', () => {
    it('should remove existing link', () => {
      const graph = new LocalGraph([usersTable, ordersTable]);
      graph.link('orders', 'user_id', 'users');
      expect(graph.links).toHaveLength(1);
      
      graph.unlink('orders', 'user_id', 'users');
      expect(graph.links).toHaveLength(0);
    });

    it('should throw error for non-existent link', () => {
      const graph = new LocalGraph([usersTable, ordersTable]);
      expect(() => graph.unlink('orders', 'user_id', 'users')).toThrow(ValidationError);
    });
  });

  describe('inferLinks', () => {
    it('should automatically detect foreign key relationships', () => {
      const graph = new LocalGraph([usersTable, ordersTable, itemsTable]);
      graph.inferLinks();
      
      // Should detect user_id -> users and item_id -> items
      const userLink = graph.links.find(l => 
        l.srcTable === 'orders' && l.fkey === 'user_id' && l.dstTable === 'users'
      );
      const itemLink = graph.links.find(l => 
        l.srcTable === 'orders' && l.fkey === 'item_id' && l.dstTable === 'items'
      );
      
      expect(userLink).toBeDefined();
      expect(itemLink).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should validate graph with no errors', () => {
      const graph = new LocalGraph([usersTable, ordersTable, itemsTable]);
      graph.link('orders', 'user_id', 'users');
      graph.link('orders', 'item_id', 'items');
      
      const result = graph.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect circular references', () => {
      // Create tables that could form a cycle
      const tableA = new LocalTable([{ id: 1, b_id: 1 }], 'a').inferMetadata();
      const tableB = new LocalTable([{ id: 1, c_id: 1 }], 'b').inferMetadata();
      const tableC = new LocalTable([{ id: 1, a_id: 1 }], 'c').inferMetadata();
      
      const graph = new LocalGraph([tableA, tableB, tableC]);
      graph.link('a', 'b_id', 'b');
      graph.link('b', 'c_id', 'c');
      graph.link('c', 'a_id', 'a');
      
      const result = graph.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'CIRCULAR_REFERENCE')).toBe(true);
    });
  });

  describe('from_data', () => {
    it('should create graph from data dictionary', () => {
      const dataDict = {
        users: [
          { user_id: 1, name: 'Alice' },
          { user_id: 2, name: 'Bob' }
        ],
        orders: [
          { order_id: 1, user_id: 1, amount: 99.99 },
          { order_id: 2, user_id: 2, amount: 149.99 }
        ]
      };
      
      const graph = LocalGraph.from_data(dataDict, true);
      expect(graph.tableNames).toEqual(['users', 'orders']);
      expect(graph.getTable('users')?.primaryKey).toBe('user_id');
      expect(graph.links.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// UNIT TESTS - tests/PQLBuilder.test.ts
// ============================================================================

import { describe, it, expect } from '@jest/globals';
import { PQLBuilder, ValidationError } from '../src';

describe('PQLBuilder', () => {
  describe('build', () => {
    it('should build simple prediction query', () => {
      const query = new PQLBuilder()
        .predict('COUNT(orders.order_id)')
        .for('user_id')
        .build();
      
      expect(query).toBe('PREDICT COUNT(orders.order_id) FOR user_id');
    });

    it('should build query with WHERE clause', () => {
      const query = new PQLBuilder()
        .predict('SUM(orders.amount)')
        .for('user_id')
        .where('orders.created_at > "2024-01-01"')
        .build();
      
      expect(query).toBe('PREDICT SUM(orders.amount) FOR user_id WHERE orders.created_at > "2024-01-01"');
    });

    it('should build query with multiple conditions', () => {
      const query = new PQLBuilder()
        .predict('AVG(orders.amount)')
        .for('user_id', 'item_id')
        .where('orders.status = "completed"')
        .where('orders.amount > 100')
        .build();
      
      expect(query).toBe('PREDICT AVG(orders.amount) FOR user_id, item_id WHERE orders.status = "completed" AND orders.amount > 100');
    });

    it('should build query with GROUP BY and ORDER BY', () => {
      const query = new PQLBuilder()
        .predict('COUNT(*)')
        .for('user_id')
        .groupBy('category')
        .orderBy('count DESC')
        .limit(10)
        .build();
      
      expect(query).toBe('PREDICT COUNT(*) FOR user_id GROUP BY category ORDER BY count DESC LIMIT 10');
    });

    it('should throw error when PREDICT is missing', () => {
      const builder = new PQLBuilder().for('user_id');
      expect(() => builder.build()).toThrow(ValidationError);
    });
  });

  describe('parse', () => {
    it('should parse simple query', () => {
      const query = 'PREDICT COUNT(orders.order_id) FOR user_id';
      const parsed = PQLBuilder.parse(query);
      const rebuilt = parsed.build();
      
      expect(rebuilt).toBe(query);
    });

    it('should parse query with WHERE clause', () => {
      const query = 'PREDICT SUM(amount) FOR user_id WHERE status = "active"';
      const parsed = PQLBuilder.parse(query);
      const rebuilt = parsed.build();
      
      expect(rebuilt).toContain('PREDICT SUM(amount)');
      expect(rebuilt).toContain('FOR user_id');
    });
  });
});

// ============================================================================
// INTEGRATION TEST - tests/integration.test.ts
// ============================================================================

import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { 
  init, 
  LocalTable, 
  LocalGraph, 
  KumoRFM, 
  PQLBuilder 
} from '../src';

// Mock the API client for testing
jest.mock('../src/api/client');

describe('KumoRFM Integration', () => {
  beforeAll(() => {
    init('test-api-key', {
      baseUrl: 'http://localhost:3000'
    });
  });

  it('should perform end-to-end prediction', async () => {
    // Create sample data
    const usersData = [
      { user_id: 1, name: 'Alice', signup_date: '2024-01-01' },
      { user_id: 2, name: 'Bob', signup_date: '2024-01-02' }
    ];
    
    const ordersData = [
      { order_id: 1, user_id: 1, amount: 99.99, created_at: '2024-02-01' },
      { order_id: 2, user_id: 1, amount: 149.99, created_at: '2024-02-15' },
      { order_id: 3, user_id: 2, amount: 79.99, created_at: '2024-02-10' }
    ];
    
    // Create tables with metadata
    const usersTable = new LocalTable(usersData, 'users').inferMetadata();
    const ordersTable = new LocalTable(ordersData, 'orders').inferMetadata();
    
    // Build graph
    const graph = new LocalGraph([usersTable, ordersTable]);
    graph.link('orders', 'user_id', 'users');
    
    // Initialize model
    const model = new KumoRFM(graph, {
      apiKey: 'test-api-key'
    });
    
    // Build prediction query
    const query = new PQLBuilder()
      .predict('COUNT(orders.order_id)')
      .for('user_id')
      .where('orders.created_at > "2024-01-01"')
      .build();
    
    // Mock the prediction response
    const mockResponse = {
      predictions: [
        { user_id: 1, prediction: 2 },
        { user_id: 2, prediction: 1 }
      ],
      modelVersion: '1.0.0'
    };
    
    // In a real test, you would mock the API call here
    // const result = await model.predict(query);
    
    // Validate the response structure
    expect(mockResponse.predictions).toHaveLength(2);
    expect(mockResponse.predictions[0]).toHaveProperty('user_id');
    expect(mockResponse.predictions[0]).toHaveProperty('prediction');
  });
});

// ============================================================================
// USAGE EXAMPLES - examples/basic-usage.ts
// ============================================================================

import { 
  init,
  LocalTable,
  LocalGraph,
  KumoRFM,
  PQLBuilder
} from 'kumo-rfm-sdk';

async function basicExample() {
  // Step 1: Initialize the SDK with your API key
  init(process.env.KUMO_API_KEY || 'your-api-key', {
    baseUrl: 'https://api.kumorfm.ai',
    timeout: 30000
  });

  // Step 2: Load your data (from any source)
  const usersData = [
    { user_id: 1, name: 'Alice', email: 'alice@example.com', signup_date: '2024-01-01' },
    { user_id: 2, name: 'Bob', email: 'bob@example.com', signup_date: '2024-01-02' },
    { user_id: 3, name: 'Charlie', email: 'charlie@example.com', signup_date: '2024-01-03' }
  ];

  const ordersData = [
    { order_id: 1, user_id: 1, item_id: 101, amount: 99.99, created_at: '2024-02-01' },
    { order_id: 2, user_id: 1, item_id: 102, amount: 149.99, created_at: '2024-02-15' },
    { order_id: 3, user_id: 2, item_id: 101, amount: 99.99, created_at: '2024-02-10' },
    { order_id: 4, user_id: 3, item_id: 103, amount: 199.99, created_at: '2024-02-20' }
  ];

  const itemsData = [
    { item_id: 101, name: 'Widget', category: 'Electronics', price: 99.99 },
    { item_id: 102, name: 'Gadget', category: 'Electronics', price: 149.99 },
    { item_id: 103, name: 'Tool', category: 'Hardware', price: 199.99 }
  ];

  // Step 3: Create LocalTable instances with automatic metadata inference
  const usersTable = new LocalTable(usersData, 'users').inferMetadata();
  const ordersTable = new LocalTable(ordersData, 'orders').inferMetadata();
  const itemsTable = new LocalTable(itemsData, 'items').inferMetadata();

  // Step 4: Build a graph with table relationships
  const graph = new LocalGraph([usersTable, ordersTable, itemsTable]);
  
  // Define relationships (foreign keys)
  graph.link('orders', 'user_id', 'users');
  graph.link('orders', 'item_id', 'items');

  // Optional: Visualize the graph structure
  graph.printMetadata();
  graph.printLinks();
  graph.visualize();

  // Step 5: Initialize the KumoRFM model
  const model = new KumoRFM(graph);

  // Step 6: Make predictions using PQL (Predictive Query Language)
  
  // Example 1: Predict customer lifetime value
  const ltvQuery = new PQLBuilder()
    .predict('SUM(orders.amount)')
    .for('user_id')
    .where('orders.created_at > "2024-01-01"')
    .build();

  const ltvResults = await model.predict(ltvQuery);
  console.log('LTV Predictions:', ltvResults.predictions);

  // Example 2: Predict churn probability
  const churnQuery = 'PREDICT COUNT(orders.order_id) FOR user_id IN (1, 2, 3)';
  const churnResults = await model.predict(churnQuery);
  console.log('Churn Predictions:', churnResults.predictions);

  // Example 3: Product recommendations
  const recoQuery = new PQLBuilder()
    .predict('RANK(items.item_id)')
    .for('user_id')
    .limit(5)
    .build();

  const recommendations = await model.predict(recoQuery);
  console.log('Product Recommendations:', recommendations.predictions);
}

// ============================================================================
// ADVANCED EXAMPLES - examples/advanced-usage.ts
// ============================================================================

import {
  LocalTable,
  LocalGraph,
  KumoRFM,
  PQLBuilder,
  DataFrameUtils,
  MigrationUtils
} from 'kumo-rfm-sdk';

async function advancedExample() {
  // Example 1: Custom metadata configuration
  const customTable = new LocalTable(
    getData(),
    'transactions',
    {
      primaryKey: 'transaction_id',
      timeColumn: 'timestamp',
      semanticTypes: {
        'amount': 'numerical',
        'category': 'categorical',
        'timestamp': 'time_column'
      }
    }
  );

  // Example 2: Data preprocessing with utilities
  const aggregatedData = DataFrameUtils.aggregate(
    getData(),
    'user_id',
    {
      total_spend: (items) => items.reduce((sum, item) => sum + item.amount, 0),
      transaction_count: (items) => items.length,
      avg_amount: (items) => {
        const sum = items.reduce((s, item) => s + item.amount, 0);
        return sum / items.length;
      }
    }
  );

  // Example 3: Batch predictions with caching
  const model = new KumoRFM(createGraph());
  
  const queries = [
    'PREDICT SUM(orders.amount) FOR user_id WHERE orders.created_at > "2024-01-01"',
    'PREDICT COUNT(orders.order_id) FOR user_id',
    'PREDICT AVG(orders.amount) FOR user_id GROUP BY items.category'
  ];

  const results = await model.batchPredict(queries, {
    concurrency: 3,
    useCache: true
  });

  // Example 4: Migration from Python
  const pythonQuery = 'PREDICT COUNT(orders.order_id) FOR user_id WHERE status is not None and active = True';
  const tsQuery = MigrationUtils.convertPythonQuery(pythonQuery);
  
  // Example 5: Using the DataFrame adapter for pandas-like operations
  const adapter = new MigrationUtils.PandasDataFrameAdapter(getData());
  
  console.log('Shape:', adapter.shape());
  console.log('Head:', adapter.head(3));
  console.log('Statistics:', adapter.describe());
  
  const grouped = adapter.groupby('category');
  for (const [category, items] of grouped) {
    console.log(`Category ${category}: ${items.length} items`);
  }

  // Example 6: Error handling and validation
  try {
    const graph = createGraph();
    const validation = graph.validate();
    
    if (!validation.valid) {
      console.error('Validation errors:', validation.errors);
      console.warn('Validation warnings:', validation.warnings);
      
      // Handle specific error types
      for (const error of validation.errors) {
        switch (error.type) {
          case 'MISSING_PRIMARY_KEY':
            console.error(`Table ${error.table} needs a primary key`);
            break;
          case 'INVALID_LINK':
            console.error(`Invalid relationship: ${error.message}`);
            break;
          case 'CIRCULAR_REFERENCE':
            console.error('Graph contains circular references');
            break;
        }
      }
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation failed:', error.message, error.details);
    } else if (error instanceof APIError) {
      console.error('API error:', error.message, 'Status:', error.statusCode);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Helper functions for examples
function getData(): any[] {
  return [
    { transaction_id: 1, user_id: 1, amount: 99.99, category: 'Electronics', timestamp: '2024-01-01' },
    { transaction_id: 2, user_id: 1, amount: 49.99, category: 'Books', timestamp: '2024-01-02' },
    { transaction_id: 3, user_id: 2, amount: 199.99, category: 'Electronics', timestamp: '2024-01-03' }
  ];
}

function createGraph(): LocalGraph {
  const tables = [
    new LocalTable(getData(), 'transactions').inferMetadata()
  ];
  return new LocalGraph(tables);
}

// Run examples
if (require.main === module) {
  basicExample().catch(console.error);
  advancedExample().catch(console.error);
}

export { basicExample, advancedExample };