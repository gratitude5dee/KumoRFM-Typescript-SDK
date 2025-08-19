import type { TableLink } from './types.js';
import { LocalTable } from './LocalTable.js';

export class LocalGraph {
  tables: Map<string, LocalTable<any>>;
  links: TableLink[];

  constructor(tables: LocalTable<any>[]) {
    this.tables = new Map(tables.map((t) => [t.name, t]));
    this.links = [];
  }

  link(fromTable: string, fromColumn: string, toTable: string) {
    this.links.push({ fromTable, fromColumn, toTable });
  }

  inferLinks() {
    for (const [name, table] of this.tables.entries()) {
      const pk = table.metadata.primaryKey ?? 'id';
      for (const col of table.metadata.columns) {
        if (col.name.endsWith('_id')) {
          const guessTable = col.name.replace(/_id$/, '') + 's';
          if (this.tables.has(guessTable)) {
            this.link(name, col.name, guessTable);
          }
        }
        if (col.name === pk) continue;
      }
    }
  }

  validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const [name, table] of this.tables.entries()) {
      const res = table.validate();
      if (!res.valid) issues.push(`${name}: ${res.issues.join(', ')}`);
    }
    return { valid: issues.length === 0, issues };
  }
}
