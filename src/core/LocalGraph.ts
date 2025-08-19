import { ValidationError } from '../api/errors.js';
import { LocalTable } from './LocalTable.js';
import { TableLink, ValidationResult, ValidationWarning, ColumnMetadata } from './types.js';

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
    if (!this._tables.has(srcTable)) {
      throw new ValidationError(`Source table ${srcTable} not found in graph`);
    }
    if (!this._tables.has(dstTable)) {
      throw new ValidationError(`Destination table ${dstTable} not found in graph`);
    }

    const srcTableObj = this._tables.get(srcTable)!;
    if (!srcTableObj.columns.includes(fkey)) {
      throw new ValidationError(`Foreign key ${fkey} not found in table ${srcTable}`);
    }

    const existingLink = this._links.find(
      (l) => l.srcTable === srcTable && l.fkey === fkey && l.dstTable === dstTable,
    );
    if (existingLink) {
      throw new ValidationError(`Link already exists: ${srcTable}.${fkey} -> ${dstTable}`);
    }

    this._links.push({ srcTable, fkey, dstTable, validated: false });
    this._validated = false;
  }

  unlink(srcTable: string, fkey: string, dstTable: string): void {
    const index = this._links.findIndex(
      (l) => l.srcTable === srcTable && l.fkey === fkey && l.dstTable === dstTable,
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
        if (columnName.endsWith('_id') || columnName.endsWith('Id')) {
          const possibleTableName = columnName.replace(/_id$|Id$/, '');
          for (const dstTableName of tableNames) {
            if (dstTableName === srcTableName) continue;
            const tableBaseName = dstTableName.toLowerCase();
            const columnBaseName = possibleTableName.toLowerCase();
            if (
              tableBaseName === columnBaseName ||
              tableBaseName === columnBaseName + 's' ||
              tableBaseName + 's' === columnBaseName
            ) {
              const dstTable = this._tables.get(dstTableName)!;
              if (dstTable.primaryKey) {
                try {
                  this.link(srcTableName, columnName, dstTableName);
                } catch {}
              }
            }
          }
        }
      }
    }
  }

  validate(): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationWarning[] = [];

    for (const table of this._tables.values()) {
      const tableValidation = table.validate();
      errors.push(...tableValidation.errors);
      warnings.push(...tableValidation.warnings);
    }

    for (const link of this._links) {
      const srcTable = this._tables.get(link.srcTable)!;
      const dstTable = this._tables.get(link.dstTable)!;

      if (!dstTable.primaryKey) {
        errors.push({
          type: 'INVALID_LINK',
          message: `Destination table ${link.dstTable} has no primary key`,
          table: link.dstTable,
        });
      }

      if (srcTable.schema?.columns) {
        const fkColumn = srcTable.schema.columns.find((c: ColumnMetadata) => c.name === link.fkey);
        if (fkColumn?.nullable) {
          warnings.push({
            type: 'NULLABLE_FOREIGN_KEY',
            message: `Foreign key ${link.fkey} in table ${link.srcTable} is nullable`,
            field: link.fkey,
            table: link.srcTable,
          });
        }
      }
    }

    if (this.hasCircularReference()) {
      errors.push({
        type: 'CIRCULAR_REFERENCE',
        message: 'Graph contains circular references',
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
      const outgoingLinks = this._links.filter((l) => l.srcTable === table);
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
    let viz = '\n=== Graph Visualization ===\n\n';
    for (const table of this._tables.values()) {
      viz += `[${table.name}]\n`;
      const outgoing = this._links.filter((l) => l.srcTable === table.name);
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
      tables: Array.from(this._tables.values()).map((t) => t.toJSON()),
      links: this._links,
    };
  }

  static from_data(dataDict: Record<string, any[]>, inferMetadata: boolean = true): LocalGraph {
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
