import type { ColumnMetadata, ColumnType, TableMetadata } from './types.js';

export class LocalTable<T extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  rows: T[];
  metadata: TableMetadata;

  constructor(rows: T[], name: string, metadata?: TableMetadata) {
    this.name = name;
    this.rows = rows ?? [];
    this.metadata =
      metadata ??
      ({
        name,
        columns: [],
      } as TableMetadata);
  }

  inferMetadata(): LocalTable<T> {
    if (!this.rows.length) {
      this.metadata.columns = [];
      return this;
    }
    const sample = this.rows[0];
    const columns: ColumnMetadata[] = Object.keys(sample).map((k) => ({
      name: k,
      type: this.inferColumnType((sample as any)[k]),
      isPrimary: k === 'id',
    }));
    this.metadata.columns = columns;
    this.metadata.primaryKey = columns.find((c) => c.isPrimary)?.name;
    return this;
  }

  validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (!this.name) issues.push('Table name is required');
    if (!this.metadata.columns?.length) issues.push('No columns defined');
    return { valid: issues.length === 0, issues };
  }

  private inferColumnType(v: unknown): ColumnType {
    if (typeof v === 'string') {
      if (!Number.isNaN(Date.parse(v))) return 'date';
      return 'string';
    }
    if (typeof v === 'number') return 'number';
    if (typeof v === 'boolean') return 'boolean';
    return 'unknown';
  }
}
