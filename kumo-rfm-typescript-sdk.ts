// ============================================================================
// CORE TYPE DEFINITIONS - src/core/types.ts
// ============================================================================

export type DataType = 'numerical' | 'categorical' | 'time_column' | 'text';
export type SemanticType = 'numerical' | 'categorical' | 'time_column';

export interface ColumnMetadata {
  name: string;
  type: DataType;
  nullable: boolean;
  primaryKey: boolean;
  foreignKeys: string[];
  uniqueValues?: number;
  nullCount?: number;
  dataType?: string; // Original data type from source
}

export interface TableMetadata {
  primaryKey?: string;
  timeColumn?: string;
  semanticTypes: Record<string, SemanticType>;
  columns?: ColumnMetadata[];
}

export interface TableSchema {
  name: string;
  columns: ColumnMetadata[];
  relationships: TableLink[];
  rowCount: number;
  metadata: TableMetadata;
}

export interface TableLink {
  srcTable: string;
  fkey: string;
  dstTable: string;
  validated?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'MISSING_PRIMARY_KEY' | 'INVALID_LINK' | 'TYPE_MISMATCH' | 'DUPLICATE_LINK' | 'CIRCULAR_REFERENCE';
  message: string;
  field?: string;
  table?: string;
  details?: Record<string, any>;
}

export interface ValidationWarning {
  type: 'NULLABLE_FOREIGN_KEY' | 'LOW_CARDINALITY' | 'HIGH_NULL_RATE';
  message: string;
  field?: string;
  table?: string;
}

export interface PredictionResult {
  query: string;
  predictions: Record<string, any>[];
  metadata: {
    executionTime: number;
    rowCount: number;
    modelVersion?: string;
  };
}

export interface AuthResult {
  token: string;
  expiresAt: number;
  refreshToken?: string;
}

export interface RFMConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
}

// ============================================================================
// ERROR HANDLING - src/core/errors.ts
// ============================================================================

export class RFMError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'RFMError';
  }
}

export class ValidationError extends RFMError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class APIError extends RFMError {
  constructor(
    message: string,
    public statusCode?: number,
    details?: Record<string, any>
  ) {
    super(message, 'API_ERROR', details);
    this.name = 'APIError';
  }
}

export class DataError extends RFMError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'DATA_ERROR', details);
    this.name = 'DataError';
  }
}

// ============================================================================
// DATA UTILITIES - src/utils/data.ts
// ============================================================================

export class DataFrameUtils {
  static inferColumnType(values: any[]): DataType {
    const nonNullValues = values.filter(v => v != null);
    if (nonNullValues.length === 0) return 'text';

    // Check if all values are dates
    if (nonNullValues.every(v => v instanceof Date || !isNaN(Date.parse(v)))) {
      return 'time_column';
    }

    // Check if all values are numbers
    if (nonNullValues.every(v => typeof v === 'number' || !isNaN(Number(v)))) {
      return 'numerical';
    }

    // Check cardinality for categorical
    const uniqueValues = new Set(nonNullValues);
    if (uniqueValues.size / nonNullValues.length < 0.5) {
      return 'categorical';
    }

    return 'text';
  }

  static analyzeColumn(data: any[], columnName: string): ColumnMetadata {
    const nonNullValues = data.filter(v => v != null);
    const uniqueValues = new Set(nonNullValues);

    return {
      name: columnName,
      type: this.inferColumnType(data),
      nullable: data.length !== nonNullValues.length,
      primaryKey: false,
      foreignKeys: [],
      uniqueValues: uniqueValues.size,
      nullCount: data.length - nonNullValues.length,
    };
  }

  static groupBy<T>(data: T[], key: keyof T): Map<any, T[]> {
    const grouped = new Map<any, T[]>();
    for (const item of data) {
      const groupKey = item[key];
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(item);
    }
    return grouped;
  }

  static aggregate<T>(
    data: T[],
    groupBy: keyof T,
    aggregations: Record<string, (items: T[]) => any>
  ): Record<string, any>[] {
    const grouped = this.groupBy(data, groupBy);
    const results: Record<string, any>[] = [];

    for (const [key, items] of grouped) {
      const row: Record<string, any> = { [groupBy]: key };
      for (const [aggName, aggFn] of Object.entries(aggregations)) {
        row[aggName] = aggFn(items);
      }
      results.push(row);
    }

    return results;
  }
}

// ============================================================================
// LOCAL TABLE - src/core/LocalTable.ts
// ============================================================================

export class LocalTable<T = Record<string, any>> {
  private _data: T[];
  private _name: string;
  private _metadata: TableMetadata;
  private _schema?: TableSchema;

  constructor(data: T[], name: string, metadata?: Partial<TableMetadata>) {
    this._data = data;
    this._name = name;
    this._metadata = {
      semanticTypes: {},
      ...metadata
    };
  }

  get data(): T[] {
    return this._data;
  }

  get name(): string {
    return this._name;
  }

  get metadata(): TableMetadata {
    return this._metadata;
  }

  get schema(): TableSchema | undefined {
    return this._schema;
  }

  get primaryKey(): string | undefined {
    return this._metadata.primaryKey;
  }

  get timeColumn(): string | undefined {
    return this._metadata.timeColumn;
  }

  get columns(): string[] {
    if (this._data.length === 0) return [];
    return Object.keys(this._data[0]);
  }

  inferMetadata(): LocalTable<T> {
    if (this._data.length === 0) {
      throw new DataError('Cannot infer metadata from empty table');
    }

    const columns: ColumnMetadata[] = [];
    const semanticTypes: Record<string, SemanticType> = {};

    // Analyze each column
    for (const columnName of this.columns) {
      const columnData = this._data.map(row => row[columnName as keyof T]);
      const columnMeta = DataFrameUtils.analyzeColumn(columnData, columnName);
      columns.push(columnMeta);

      // Map to semantic types
      if (columnMeta.type === 'time_column') {
        semanticTypes[columnName] = 'time_column';
        if (!this._metadata.timeColumn) {
          this._metadata.timeColumn = columnName;
        }
      } else if (columnMeta.type === 'numerical') {
        semanticTypes[columnName] = 'numerical';
      } else if (columnMeta.type === 'categorical') {
        semanticTypes[columnName] = 'categorical';
      }

      // Detect primary key (high cardinality, unique values)
      if (columnMeta.uniqueValues === this._data.length && !columnMeta.nullable) {
        columnMeta.primaryKey = true;
        if (!this._metadata.primaryKey) {
          this._metadata.primaryKey = columnName;
        }
      }
    }

    this._metadata.semanticTypes = semanticTypes;
    this._metadata.columns = columns;

    this._schema = {
      name: this._name,
      columns,
      relationships: [],
      rowCount: this._data.length,
      metadata: this._metadata
    };

    return this;
  }

  setMetadata(metadata: Partial<TableMetadata>): LocalTable<T> {
    this._metadata = { ...this._metadata, ...metadata };
    return this;
  }

  setPrimaryKey(columnName: string): LocalTable<T> {
    if (!this.columns.includes(columnName)) {
      throw new ValidationError(`Column ${columnName} does not exist in table ${this._name}`);
    }
    this._metadata.primaryKey = columnName;
    return this;
  }

  setTimeColumn(columnName: string): LocalTable<T> {
    if (!this.columns.includes(columnName)) {
      throw new ValidationError(`Column ${columnName} does not exist in table ${this._name}`);
    }
    this._metadata.timeColumn = columnName;
    this._metadata.semanticTypes[columnName] = 'time_column';
    return this;
  }

  validate(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!this._metadata.primaryKey) {
      errors.push({
        type: 'MISSING_PRIMARY_KEY',
        message: `Table ${this._name} is missing a primary key`,
        table: this._name
      });
    }

    // Check for high null rates
    if (this._metadata.columns) {
      for (const col of this._metadata.columns) {
        const nullRate = (col.nullCount || 0) / this._data.length;
        if (nullRate > 0.5) {
          warnings.push({
            type: 'HIGH_NULL_RATE',
            message: `Column ${col.name} has ${(nullRate * 100).toFixed(1)}% null values`,
            field: col.name,
            table: this._name
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  toJSON(): any {
    return {
      name: this._name,
      data: this._data,
      metadata: this._metadata,
      schema: this._schema
    };
  }
}

// ============================================================================
// LOCAL GRAPH - src/core/LocalGraph.ts
// ============================================================================

export class LocalGraph {
  private _tables: Map<string, LocalTable>;
  private _links: TableLink[];
  private _validated: boolean;

  constructor(tables: LocalTable[]) {
    this._tables = new Map();
    for (const table of tables) {
      this._tables.set(table.name, table);
    }
    this._links = [];
    this._validated = false;
  }

  get tables(): LocalTable[] {
    return Array.from(this._tables.values());
  }

  get links(): TableLink[] {
    return this._links;
  }

  get tableNames(): string[] {
    return Array.from(this._tables.keys());
  }

  getTable(name: string): LocalTable | undefined {
    return this._tables.get(name);
  }

  link(srcTable: string, fkey: string, dstTable: string): void {
    // Validate tables exist
    if (!this._tables.has(srcTable)) {
      throw new ValidationError(`Source table ${srcTable} not found in graph`);
    }
    if (!this._tables.has(dstTable)) {
      throw new ValidationError(`Destination table ${dstTable} not found in graph`);
    }

    // Validate foreign key exists in source table
    const srcTableObj = this._tables.get(srcTable)!;
    if (!srcTableObj.columns.includes(fkey)) {
      throw new ValidationError(`Foreign key ${fkey} not found in table ${srcTable}`);
    }

    // Check for duplicate links
    const existingLink = this._links.find(
      l => l.srcTable === srcTable && l.fkey === fkey && l.dstTable === dstTable
    );
    if (existingLink) {
      throw new ValidationError(`Link already exists: ${srcTable}.${fkey} -> ${dstTable}`);
    }

    this._links.push({ srcTable, fkey, dstTable, validated: false });
    this._validated = false;
  }

  unlink(srcTable: string, fkey: string, dstTable: string): void {
    const index = this._links.findIndex(
      l => l.srcTable === srcTable && l.fkey === fkey && l.dstTable === dstTable
    );
    if (index === -1) {
      throw new ValidationError(`Link not found: ${srcTable}.${fkey} -> ${dstTable}`);
    }
    this._links.splice(index, 1);
    this._validated = false;
  }

  inferLinks(): void {
    const tableNames = Array.from(this._tables.keys());

    for (const srcTableName of tableNames) {
      const srcTable = this._tables.get(srcTableName)!;
      
      for (const columnName of srcTable.columns) {
        // Look for columns that might be foreign keys (e.g., user_id, item_id)
        if (columnName.endsWith('_id') || columnName.endsWith('Id')) {
          const possibleTableName = columnName.replace(/_id$|Id$/, '');
          
          // Check if a table with a similar name exists
          for (const dstTableName of tableNames) {
            if (dstTableName === srcTableName) continue;
            
            // Check various naming conventions
            const tableBaseName = dstTableName.toLowerCase();
            const columnBaseName = possibleTableName.toLowerCase();
            
            if (tableBaseName === columnBaseName || 
                tableBaseName === columnBaseName + 's' ||
                tableBaseName + 's' === columnBaseName) {
              
              // Check if destination table has a primary key
              const dstTable = this._tables.get(dstTableName)!;
              if (dstTable.primaryKey) {
                try {
                  this.link(srcTableName, columnName, dstTableName);
                } catch (e) {
                  // Ignore if link already exists
                }
              }
            }
          }
        }
      }
    }
  }

  validate(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate each table
    for (const table of this._tables.values()) {
      const tableValidation = table.validate();
      errors.push(...tableValidation.errors);
      warnings.push(...tableValidation.warnings);
    }

    // Validate links
    for (const link of this._links) {
      const srcTable = this._tables.get(link.srcTable)!;
      const dstTable = this._tables.get(link.dstTable)!;

      // Check if destination has primary key
      if (!dstTable.primaryKey) {
        errors.push({
          type: 'INVALID_LINK',
          message: `Destination table ${link.dstTable} has no primary key`,
          table: link.dstTable
        });
      }

      // Check for nullable foreign keys
      if (srcTable.schema?.columns) {
        const fkColumn = srcTable.schema.columns.find(c => c.name === link.fkey);
        if (fkColumn?.nullable) {
          warnings.push({
            type: 'NULLABLE_FOREIGN_KEY',
            message: `Foreign key ${link.fkey} in table ${link.srcTable} is nullable`,
            field: link.fkey,
            table: link.srcTable
          });
        }
      }
    }

    // Check for circular references
    if (this.hasCircularReference()) {
      errors.push({
        type: 'CIRCULAR_REFERENCE',
        message: 'Graph contains circular references'
      });
    }

    this._validated = errors.length === 0;
    return { valid: this._validated, errors, warnings };
  }

  private hasCircularReference(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (table: string): boolean => {
      visited.add(table);
      recursionStack.add(table);

      const outgoingLinks = this._links.filter(l => l.srcTable === table);
      for (const link of outgoingLinks) {
        if (!visited.has(link.dstTable)) {
          if (dfs(link.dstTable)) return true;
        } else if (recursionStack.has(link.dstTable)) {
          return true;
        }
      }

      recursionStack.delete(table);
      return false;
    };

    for (const tableName of this._tables.keys()) {
      if (!visited.has(tableName)) {
        if (dfs(tableName)) return true;
      }
    }

    return false;
  }

  printMetadata(): void {
    console.log('\n=== Graph Metadata ===');
    for (const table of this._tables.values()) {
      console.log(`\nTable: ${table.name}`);
      console.log(`  Primary Key: ${table.primaryKey || 'None'}`);
      console.log(`  Time Column: ${table.timeColumn || 'None'}`);
      console.log(`  Row Count: ${table.data.length}`);
      console.log(`  Columns: ${table.columns.join(', ')}`);
    }
  }

  printLinks(): void {
    console.log('\n=== Graph Links ===');
    if (this._links.length === 0) {
      console.log('No links defined');
    } else {
      for (const link of this._links) {
        console.log(`${link.srcTable}.${link.fkey} -> ${link.dstTable}`);
      }
    }
  }

  visualize(): string {
    // Generate a simple ASCII visualization
    let viz = '\n=== Graph Visualization ===\n\n';
    
    for (const table of this._tables.values()) {
      viz += `[${table.name}]\n`;
      const outgoing = this._links.filter(l => l.srcTable === table.name);
      for (const link of outgoing) {
        viz += `  └─(${link.fkey})──> [${link.dstTable}]\n`;
      }
      viz += '\n';
    }
    
    console.log(viz);
    return viz;
  }

  toJSON(): any {
    return {
      tables: Array.from(this._tables.values()).map(t => t.toJSON()),
      links: this._links
    };
  }

  static from_data(
    dataDict: Record<string, any[]>,
    inferMetadata: boolean = true
  ): LocalGraph {
    const tables: LocalTable[] = [];

    for (const [name, data] of Object.entries(dataDict)) {
      const table = new LocalTable(data, name);
      if (inferMetadata) {
        table.inferMetadata();
      }
      tables.push(table);
    }

    const graph = new LocalGraph(tables);
    if (inferMetadata) {
      graph.inferLinks();
    }

    return graph;
  }
}

// ============================================================================
// API CLIENT - src/api/client.ts
// ============================================================================

export class RFMApiClient {
  private config: RFMConfig;
  private authToken?: string;
  private tokenExpiry?: number;

  constructor(config: RFMConfig) {
    this.config = {
      baseUrl: 'https://api.kumorfm.ai',
      timeout: 30000,
      maxRetries: 3,
      ...config
    };
  }

  async authenticate(): Promise<AuthResult> {
    const response = await this.request('/auth/token', {
      method: 'POST',
      body: JSON.stringify({ apiKey: this.config.apiKey })
    });

    const result = response as AuthResult;
    this.authToken = result.token;
    this.tokenExpiry = result.expiresAt;

    return result;
  }

  async executeQuery(query: string, graph: any): Promise<any> {
    await this.ensureAuthenticated();

    return this.request('/predict', {
      method: 'POST',
      body: JSON.stringify({ query, graph })
    });
  }

  async validateGraph(graph: any): Promise<ValidationResult> {
    await this.ensureAuthenticated();

    return this.request('/validate', {
      method: 'POST',
      body: JSON.stringify({ graph })
    });
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.authToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
      ...this.config.headers,
      ...options.headers
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < (this.config.maxRetries || 3); attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new APIError(
            `API request failed: ${response.statusText}`,
            response.status,
            { endpoint, status: response.status }
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if (error instanceof APIError && error.statusCode && error.statusCode < 500) {
          throw error;
        }

        // Exponential backoff
        if (attempt < (this.config.maxRetries || 3) - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new APIError('Request failed after retries');
  }
}

// ============================================================================
// PQL QUERY BUILDER - src/query/builder.ts
// ============================================================================

export class PQLBuilder {
  private parts: {
    predict?: string;
    for?: string[];
    where?: string[];
    groupBy?: string[];
    orderBy?: string[];
    limit?: number;
  } = {};

  predict(target: string): PQLBuilder {
    this.parts.predict = target;
    return this;
  }

  for(...entities: string[]): PQLBuilder {
    this.parts.for = entities;
    return this;
  }

  where(condition: string): PQLBuilder {
    if (!this.parts.where) {
      this.parts.where = [];
    }
    this.parts.where.push(condition);
    return this;
  }

  groupBy(...columns: string[]): PQLBuilder {
    this.parts.groupBy = columns;
    return this;
  }

  orderBy(...columns: string[]): PQLBuilder {
    this.parts.orderBy = columns;
    return this;
  }

  limit(n: number): PQLBuilder {
    this.parts.limit = n;
    return this;
  }

  build(): string {
    if (!this.parts.predict) {
      throw new ValidationError('PREDICT clause is required');
    }

    let query = `PREDICT ${this.parts.predict}`;

    if (this.parts.for && this.parts.for.length > 0) {
      query += ` FOR ${this.parts.for.join(', ')}`;
    }

    if (this.parts.where && this.parts.where.length > 0) {
      query += ` WHERE ${this.parts.where.join(' AND ')}`;
    }

    if (this.parts.groupBy && this.parts.groupBy.length > 0) {
      query += ` GROUP BY ${this.parts.groupBy.join(', ')}`;
    }

    if (this.parts.orderBy && this.parts.orderBy.length > 0) {
      query += ` ORDER BY ${this.parts.orderBy.join(', ')}`;
    }

    if (this.parts.limit) {
      query += ` LIMIT ${this.parts.limit}`;
    }

    return query;
  }

  static parse(query: string): PQLBuilder {
    const builder = new PQLBuilder();
    
    // Simple regex-based parser (can be enhanced)
    const predictMatch = query.match(/PREDICT\s+([^FOR]+)/i);
    if (predictMatch) {
      builder.predict(predictMatch[1].trim());
    }

    const forMatch = query.match(/FOR\s+([^WHERE|GROUP|ORDER|LIMIT]+)/i);
    if (forMatch) {
      builder.for(...forMatch[1].split(',').map(s => s.trim()));
    }

    const whereMatch = query.match(/WHERE\s+([^GROUP|ORDER|LIMIT]+)/i);
    if (whereMatch) {
      builder.where(whereMatch[1].trim());
    }

    return builder;
  }
}

// ============================================================================
// KUMO RFM MAIN CLASS - src/core/KumoRFM.ts
// ============================================================================

export class KumoRFM {
  private graph: LocalGraph;
  private apiClient: RFMApiClient;
  private config: RFMConfig;
  private cache: Map<string, PredictionResult>;

  constructor(graph: LocalGraph, config?: RFMConfig) {
    this.graph = graph;
    this.config = config || { apiKey: process.env.KUMO_API_KEY || '' };
    this.apiClient = new RFMApiClient(this.config);
    this.cache = new Map();
  }

  async predict(query: string, options?: {
    useCache?: boolean;
    timeout?: number;
  }): Promise<PredictionResult> {
    // Check cache
    if (options?.useCache && this.cache.has(query)) {
      return this.cache.get(query)!;
    }

    // Validate graph
    const validation = this.graph.validate();
    if (!validation.valid) {
      throw new ValidationError(
        'Graph validation failed',
        { errors: validation.errors }
      );
    }

    const startTime = Date.now();

    try {
      // Execute prediction via API
      const response = await this.apiClient.executeQuery(
        query,
        this.graph.toJSON()
      );

      const result: PredictionResult = {
        query,
        predictions: response.predictions || [],
        metadata: {
          executionTime: Date.now() - startTime,
          rowCount: response.predictions?.length || 0,
          modelVersion: response.modelVersion
        }
      };

      // Update cache
      if (options?.useCache) {
        this.cache.set(query, result);
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new APIError(
          `Prediction failed: ${error.message}`,
          undefined,
          { query, error: error.message }
        );
      }
      throw error;
    }
  }

  async batchPredict(
    queries: string[],
    options?: {
      concurrency?: number;
      useCache?: boolean;
    }
  ): Promise<PredictionResult[]> {
    const concurrency = options?.concurrency || 5;
    const results: PredictionResult[] = [];
    
    // Process in batches
    for (let i = 0; i < queries.length; i += concurrency) {
      const batch = queries.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(query => this.predict(query, options))
      );
      results.push(...batchResults);
    }

    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getGraph(): LocalGraph {
    return this.graph;
  }

  updateGraph(graph: LocalGraph): void {
    this.graph = graph;
    this.clearCache();
  }
}

// ============================================================================
// MODULE FUNCTIONS - src/index.ts
// ============================================================================

let globalConfig: RFMConfig | null = null;
let globalClient: RFMApiClient | null = null;

export function init(apiKey: string, config?: Partial<RFMConfig>): void {
  globalConfig = {
    apiKey,
    ...config
  };
  globalClient = new RFMApiClient(globalConfig);
}

export async function authenticate(): Promise<AuthResult> {
  if (!globalClient) {
    throw new RFMError('Client not initialized. Call init() first.', 'NOT_INITIALIZED');
  }
  return globalClient.authenticate();
}

export async function query(pqlQuery: string): Promise<any> {
  if (!globalClient) {
    throw new RFMError('Client not initialized. Call init() first.', 'NOT_INITIALIZED');
  }
  
  // For standalone queries without a graph context
  return globalClient.executeQuery(pqlQuery, {});
}

// ============================================================================
// MIGRATION UTILITIES - src/utils/migration.ts
// ============================================================================

export namespace MigrationUtils {
  export function convertPythonQuery(pythonPQL: string): string {
    // Handle Python-specific syntax conversions
    let tsQuery = pythonPQL;
    
    // Convert Python boolean operators
    tsQuery = tsQuery.replace(/\band\b/gi, 'AND');
    tsQuery = tsQuery.replace(/\bor\b/gi, 'OR');
    tsQuery = tsQuery.replace(/\bnot\b/gi, 'NOT');
    
    // Convert Python None to NULL
    tsQuery = tsQuery.replace(/\bNone\b/g, 'NULL');
    
    return tsQuery;
  }

  export function adaptTableMetadata(pythonMeta: any): TableMetadata {
    return {
      primaryKey: pythonMeta.primary_key || pythonMeta.primaryKey,
      timeColumn: pythonMeta.time_column || pythonMeta.timeColumn,
      semanticTypes: pythonMeta.semantic_types || pythonMeta.semanticTypes || {}
    };
  }

  export function validateMigration(original: any, converted: any): boolean {
    // Basic validation to ensure data integrity after migration
    if (Array.isArray(original) && Array.isArray(converted)) {
      return original.length === converted.length;
    }
    
    if (typeof original === 'object' && typeof converted === 'object') {
      const originalKeys = Object.keys(original);
      const convertedKeys = Object.keys(converted);
      return originalKeys.length === convertedKeys.length &&
             originalKeys.every(key => key in converted);
    }
    
    return original === converted;
  }

  export class PandasDataFrameAdapter {
    private data: any[];
    private columns: string[];

    constructor(data: any[]) {
      this.data = data;
      this.columns = data.length > 0 ? Object.keys(data[0]) : [];
    }

    // Pandas-like methods
    head(n: number = 5): any[] {
      return this.data.slice(0, n);
    }

    tail(n: number = 5): any[] {
      return this.data.slice(-n);
    }

    shape(): [number, number] {
      return [this.data.length, this.columns.length];
    }

    describe(): Record<string, any> {
      const stats: Record<string, any> = {};
      
      for (const col of this.columns) {
        const values = this.data.map(row => row[col]).filter(v => typeof v === 'number');
        
        if (values.length > 0) {
          stats[col] = {
            count: values.length,
            mean: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values)
          };
        }
      }
      
      return stats;
    }

    groupby(column: string): Map<any, any[]> {
      return DataFrameUtils.groupBy(this.data, column as any);
    }

    toArray(): any[] {
      return this.data;
    }
  }
}

// ============================================================================
// EXPORT ALL PUBLIC API
// ============================================================================

export {
  // Core classes
  LocalTable,
  LocalGraph,
  KumoRFM,
  
  // API
  RFMApiClient,
  
  // Query builder
  PQLBuilder,
  
  // Errors
  RFMError,
  ValidationError,
  APIError,
  DataError,
  
  // Utilities
  DataFrameUtils,
  
  // Types
  type DataType,
  type SemanticType,
  type ColumnMetadata,
  type TableMetadata,
  type TableSchema,
  type TableLink,
  type ValidationResult,
  type PredictionResult,
  type AuthResult,
  type RFMConfig
};