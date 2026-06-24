export interface ColumnInfo {
  columnName: string;
  ordinalPosition: number;
  dataType: string;
  udtName: string;
  isNullable: boolean;
  columnDefault: string | null;
  characterMaximumLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTarget: { schema: string; table: string; column: string } | null;
}

export interface ForeignKey {
  constraintName: string;
  fromColumn: string;
  toSchema: string;
  toTable: string;
  toColumn: string;
}

export interface IndexInfo {
  indexName: string;
  indexDef: string;
}

export interface TableInfo {
  schemaName: string;
  tableName: string;
  tableType: string;
  rowEstimate: number;
  columnCount: number;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKey[];
  incomingForeignKeys: Array<{
    fromSchema: string;
    fromTable: string;
    fromColumn: string;
    constraintName: string;
  }>;
  indexes: IndexInfo[];
}

export interface SchemaIntrospection {
  tables: TableInfo[];
  scannedAt: string;
}

export interface TableAnnotation {
  id: number;
  connectionId: number;
  schemaName: string;
  tableName: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnAnnotation {
  id: number;
  connectionId: number;
  schemaName: string;
  tableName: string;
  columnName: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: number;
  connectionId: number;
  schemaName: string;
  tableName: string;
  tag: string;
  color: string;
}

export interface Connection {
  id: number;
  name: string;
  host: string;
  databaseName: string;
  username: string | null;
  createdAt: string;
}

export interface ScanResult {
  connectionId: number;
  schema: SchemaIntrospection;
  tableAnnotations: TableAnnotation[];
  columnAnnotations: ColumnAnnotation[];
  tags: Tag[];
}

export interface SearchResult {
  type: 'table' | 'column' | 'annotation';
  schemaName: string;
  tableName: string;
  columnName?: string;
  snippet: string;
}

export const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-700 dark:text-blue-300',   border: 'border-blue-200 dark:border-blue-800' },
  green:  { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  red:    { bg: 'bg-red-100 dark:bg-red-900/40',     text: 'text-red-700 dark:text-red-300',     border: 'border-red-200 dark:border-red-800' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  purple: { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
  gray:   { bg: 'bg-gray-100 dark:bg-gray-800',      text: 'text-gray-600 dark:text-gray-300',   border: 'border-gray-200 dark:border-gray-700' },
};
