import { ColumnMetadata, DataType } from '../core/types.js';

export class DataFrameUtils {
  static inferColumnType(values: any[]): DataType {
    const nonNullValues = values.filter((v) => v != null);
    if (nonNullValues.length === 0) return 'text';
    if (nonNullValues.every((v) => v instanceof Date || !isNaN(Date.parse(v)))) {
      return 'time_column';
    }
    if (nonNullValues.every((v) => typeof v === 'number' || !isNaN(Number(v)))) {
      return 'numerical';
    }
    const uniqueValues = new Set(nonNullValues);
    if (uniqueValues.size / nonNullValues.length < 0.5) {
      return 'categorical';
    }
    return 'text';
  }

  static analyzeColumn(data: any[], columnName: string): ColumnMetadata {
    const nonNullValues = data.filter((v) => v != null);
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
    aggregations: Record<string, (items: T[]) => any>,
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
