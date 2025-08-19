import { ValidationError } from '../api/errors.js';

export class PQLBuilder {
  private predictTarget?: string;
  private forEntities: string[] = [];
  private whereClauses: string[] = [];
  private groupByFields: string[] = [];
  private orderByFields: string[] = [];
  private limitCount?: number;

  predict(target: string): this {
    this.predictTarget = target;
    return this;
  }

  for(...entities: string[]): this {
    this.forEntities.push(...entities);
    return this;
  }

  where(condition: string): this {
    this.whereClauses.push(condition);
    return this;
  }

  groupBy(...fields: string[]): this {
    this.groupByFields.push(...fields);
    return this;
  }

  orderBy(...fields: string[]): this {
    this.orderByFields.push(...fields);
    return this;
  }

  limit(n: number): this {
    this.limitCount = n;
    return this;
  }

  build(): string {
    if (!this.predictTarget) {
      throw new ValidationError('PREDICT target is required');
    }
    let query = `PREDICT ${this.predictTarget}`;
    if (this.forEntities.length) {
      query += ` FOR ${this.forEntities.join(', ')}`;
    }
    if (this.whereClauses.length) {
      query += ` WHERE ${this.whereClauses.join(' AND ')}`;
    }
    if (this.groupByFields.length) {
      query += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }
    if (this.orderByFields.length) {
      query += ` ORDER BY ${this.orderByFields.join(', ')}`;
    }
    if (this.limitCount != null) {
      query += ` LIMIT ${this.limitCount}`;
    }
    return query;
  }

  static parse(query: string): PQLBuilder {
    const builder = new PQLBuilder();
    const upper = query.toUpperCase();
    const predictIdx = upper.indexOf('PREDICT ');
    if (predictIdx > -1) {
      const afterPredict = query.slice(predictIdx + 8).trim();
      const forIdx = afterPredict.toUpperCase().indexOf(' FOR ');
      const target = forIdx >= 0 ? afterPredict.slice(0, forIdx).trim() : afterPredict.trim();
      builder.predict(target);
    }
    return builder;
  }
}
