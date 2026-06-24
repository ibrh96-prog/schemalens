import postgres from 'postgres';

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

type Row = Record<string, unknown>;

function str(val: unknown): string {
  return val == null ? '' : String(val);
}
function num(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}
function bool(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  return str(val).toUpperCase() === 'YES';
}

export async function introspectDatabase(
  connectionString: string,
  targetSchema?: string
): Promise<SchemaIntrospection> {
  const sql = postgres(connectionString, {
    prepare: false,
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
  });

  try {
    const schemaFilter = targetSchema
      ? `= '${targetSchema.replace(/'/g, "''")}'`
      : `NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1')`;

    // reltuples = -1 means ANALYZE has never run on the table.
    // Fall back to pg_stat_user_tables.n_live_tup which is maintained by
    // the heap access method even without an explicit ANALYZE.
    const tables = (await sql.unsafe(`
      SELECT
        t.table_schema,
        t.table_name,
        t.table_type,
        CASE
          WHEN pc.reltuples >= 0 THEN pc.reltuples::bigint
          ELSE GREATEST(psu.n_live_tup::bigint, 0)
        END AS row_estimate
      FROM information_schema.tables t
      LEFT JOIN pg_catalog.pg_class pc ON pc.relname = t.table_name
      LEFT JOIN pg_catalog.pg_namespace pn
        ON pn.oid = pc.relnamespace AND pn.nspname = t.table_schema
      LEFT JOIN pg_stat_user_tables psu
        ON psu.schemaname = t.table_schema AND psu.relname = t.table_name
      WHERE t.table_schema ${schemaFilter}
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_schema, t.table_name
    `)) as Row[];

    const columns = (await sql.unsafe(`
      SELECT
        c.table_schema,
        c.table_name,
        c.column_name,
        c.ordinal_position,
        c.column_default,
        c.is_nullable,
        c.data_type,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.udt_name
      FROM information_schema.columns c
      WHERE c.table_schema ${schemaFilter}
      ORDER BY c.table_schema, c.table_name, c.ordinal_position
    `)) as Row[];

    const primaryKeys = (await sql.unsafe(`
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema ${schemaFilter}
    `)) as Row[];

    const foreignKeys = (await sql.unsafe(`
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name   AS foreign_table_name,
        ccu.column_name  AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema ${schemaFilter}
    `)) as Row[];

    const indexes = (await sql.unsafe(`
      SELECT
        schemaname AS table_schema,
        tablename  AS table_name,
        indexname,
        indexdef
      FROM pg_catalog.pg_indexes
      WHERE schemaname ${schemaFilter}
      ORDER BY schemaname, tablename, indexname
    `)) as Row[];

    const pkSet = new Set(
      primaryKeys.map(
        (pk) => `${str(pk['table_schema'])}.${str(pk['table_name'])}.${str(pk['column_name'])}`
      )
    );

    const fkMap = new Map<string, ForeignKey>();
    for (const fk of foreignKeys) {
      const key = `${str(fk['table_schema'])}.${str(fk['table_name'])}.${str(fk['column_name'])}`;
      fkMap.set(key, {
        constraintName: str(fk['constraint_name']),
        fromColumn: str(fk['column_name']),
        toSchema: str(fk['foreign_table_schema']),
        toTable: str(fk['foreign_table_name']),
        toColumn: str(fk['foreign_column_name']),
      });
    }

    const incomingFkMap = new Map<string, Array<{ fromSchema: string; fromTable: string; fromColumn: string; constraintName: string }>>();
    for (const fk of foreignKeys) {
      const targetKey = `${str(fk['foreign_table_schema'])}.${str(fk['foreign_table_name'])}`;
      if (!incomingFkMap.has(targetKey)) incomingFkMap.set(targetKey, []);
      incomingFkMap.get(targetKey)!.push({
        fromSchema: str(fk['table_schema']),
        fromTable: str(fk['table_name']),
        fromColumn: str(fk['column_name']),
        constraintName: str(fk['constraint_name']),
      });
    }

    const columnsByTable = new Map<string, Row[]>();
    for (const col of columns) {
      const k = `${str(col['table_schema'])}.${str(col['table_name'])}`;
      if (!columnsByTable.has(k)) columnsByTable.set(k, []);
      columnsByTable.get(k)!.push(col);
    }

    const indexesByTable = new Map<string, IndexInfo[]>();
    for (const idx of indexes) {
      const k = `${str(idx['table_schema'])}.${str(idx['table_name'])}`;
      if (!indexesByTable.has(k)) indexesByTable.set(k, []);
      indexesByTable.get(k)!.push({
        indexName: str(idx['indexname']),
        indexDef: str(idx['indexdef']),
      });
    }

    const result: TableInfo[] = tables.map((t) => {
      const schema = str(t['table_schema']);
      const table = str(t['table_name']);
      const tableKey = `${schema}.${table}`;
      const cols = columnsByTable.get(tableKey) ?? [];

      const tablePKs = primaryKeys
        .filter((pk) => str(pk['table_schema']) === schema && str(pk['table_name']) === table)
        .map((pk) => str(pk['column_name']));

      const tableFKs = foreignKeys
        .filter((fk) => str(fk['table_schema']) === schema && str(fk['table_name']) === table)
        .map((fk) => ({
          constraintName: str(fk['constraint_name']),
          fromColumn: str(fk['column_name']),
          toSchema: str(fk['foreign_table_schema']),
          toTable: str(fk['foreign_table_name']),
          toColumn: str(fk['foreign_column_name']),
        }));

      const colInfos: ColumnInfo[] = cols.map((c) => {
        const colKey = `${schema}.${table}.${str(c['column_name'])}`;
        const fkEntry = fkMap.get(colKey);
        return {
          columnName: str(c['column_name']),
          ordinalPosition: num(c['ordinal_position']),
          dataType: str(c['data_type']),
          udtName: str(c['udt_name']),
          isNullable: bool(c['is_nullable']),
          columnDefault: c['column_default'] != null ? str(c['column_default']) : null,
          characterMaximumLength: c['character_maximum_length'] != null ? num(c['character_maximum_length']) : null,
          numericPrecision: c['numeric_precision'] != null ? num(c['numeric_precision']) : null,
          numericScale: c['numeric_scale'] != null ? num(c['numeric_scale']) : null,
          isPrimaryKey: pkSet.has(colKey),
          isForeignKey: !!fkEntry,
          foreignKeyTarget: fkEntry
            ? { schema: fkEntry.toSchema, table: fkEntry.toTable, column: fkEntry.toColumn }
            : null,
        };
      });

      return {
        schemaName: schema,
        tableName: table,
        tableType: str(t['table_type']),
        rowEstimate: num(t['row_estimate']),
        columnCount: cols.length,
        columns: colInfos,
        primaryKeys: tablePKs,
        foreignKeys: tableFKs,
        incomingForeignKeys: incomingFkMap.get(tableKey) ?? [],
        indexes: indexesByTable.get(tableKey) ?? [],
      };
    });

    return { tables: result, scannedAt: new Date().toISOString() };
  } finally {
    await sql.end();
  }
}
