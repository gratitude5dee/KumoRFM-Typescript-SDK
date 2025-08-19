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
  dataType?: string;
}

export interface TableMetadata {
  primaryKey?: string;
  timeColumn?: string;
  semanticTypes: Record<string, SemanticType>;
  columns?: ColumnMetadata[];
}

export interface TableLink {
  srcTable: string;
  fkey: string;
  dstTable: string;
  validated?: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnMetadata[];
  relationships: TableLink[];
  rowCount: number;
  metadata: TableMetadata;
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

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
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
