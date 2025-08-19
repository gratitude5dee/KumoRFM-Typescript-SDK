export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'unknown';

export interface ColumnMetadata {
  name: string;
  type: ColumnType;
  isPrimary?: boolean;
  references?: { table: string; column: string };
}

export interface TableMetadata {
  name: string;
  primaryKey?: string;
  columns: ColumnMetadata[];
}

export interface TableLink {
  fromTable: string;
  fromColumn: string;
  toTable: string;
}

export interface PredictionResult<T = unknown> {
  query: string;
  result: T;
  cached?: boolean;
}

export interface RFMConfig {
  apiKey?: string;
}
