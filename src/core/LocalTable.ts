import { DataFrameUtils } from '../utils/data.js';
import { DataError, ValidationError } from '../api/errors.js';
import {
  ColumnMetadata,
  SemanticType,
  TableMetadata,
  TableSchema,
  ValidationResult,
  ValidationWarning,
} from './types.js';

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
      ...metadata,
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
    return Object.keys(this._data[0] as any);
  }

  inferMetadata(): LocalTable<T> {
    if (this._data.length === 0) {
      throw new DataError('Cannot infer metadata from empty table');
    }

    const columns: ColumnMetadata[] = [];
    const semanticTypes: Record<string, SemanticType> = {};

    for (const columnName of this.columns) {
      const columnData = this._data.map((row) => (row as any)[columnName]);
      const columnMeta = DataFrameUtils.analyzeColumn(columnData, columnName);
      columns.push(columnMeta);

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
      metadata: this._metadata,
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
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationWarning[] = [];

    if (!this._metadata.primaryKey) {
      errors.push({
        type: 'MISSING_PRIMARY_KEY',
        message: `Table ${this._name} is missing a primary key`,
        table: this._name,
      });
    }

    if (this._metadata.columns) {
      for (const col of this._metadata.columns) {
        const nullRate = (col.nullCount || 0) / this._data.length;
        if (nullRate > 0.5) {
          warnings.push({
            type: 'HIGH_NULL_RATE',
            message: `Column ${col.name} has ${(nullRate * 100).toFixed(1)}% null values`,
            field: col.name,
            table: this._name,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  toJSON(): any {
    return {
      name: this._name,
      data: this._data,
      metadata: this._metadata,
      schema: this._schema,
    };
  }
}
