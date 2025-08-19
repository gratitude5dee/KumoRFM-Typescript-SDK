export class DataFrameUtils {
  static inferColumnType(v: unknown): string {
    if (typeof v === 'string') return 'string';
    if (typeof v === 'number') return 'number';
    if (typeof v === 'boolean') return 'boolean';
    return 'unknown';
  }

  static groupBy<T extends Record<string, any>>(rows: T[], key: keyof T): Map<any, T[]> {
    const m = new Map<any, T[]>();
    for (const r of rows) {
      const k = r[key];
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return m;
  }

  static aggregate<T>(rows: T[], agg: (acc: any, row: T) => any, init: any): any {
    return rows.reduce(agg, init);
  }
}
