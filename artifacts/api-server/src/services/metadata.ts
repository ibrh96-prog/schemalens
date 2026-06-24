import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import {
  connections,
  tableAnnotations,
  columnAnnotations,
  tags,
  type NewConnection,
} from '../../../../lib/db/schema.js';

function getDb() {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL is not set');
  return drizzle(neon(url), {
    schema: { connections, tableAnnotations, columnAnnotations, tags },
  });
}

// -- Demo annotation seeding --
export async function seedDemoAnnotations(connectionId: number): Promise<void> {
  const sql = neon(process.env['DATABASE_URL'] ?? '');

  // Check if already seeded (any annotation exists for this connection)
  const existing = await sql(
    'SELECT id FROM table_annotations WHERE connection_id = $1 LIMIT 1',
    [connectionId]
  );
  if (existing.length > 0) return; // already seeded

  // Table annotations
  const tableAnns = [
    {
      schema: 'demo_shop', table: 'orders',
      note: 'Central fact table for order lifecycle.\n\nThe `status` column follows this state machine:\n  pending → confirmed → shipped → delivered\n  pending → cancelled\n  delivered → refunded\n\nNever delete rows; mark as cancelled or refunded instead.',
    },
    {
      schema: 'demo_shop', table: 'customers',
      note: 'PII table — contains personal data (name, email, phone, date_of_birth). Access should be audited. Do not expose in analytics queries without anonymisation.',
    },
    {
      schema: 'demo_shop', table: 'inventory_movements',
      note: 'Append-only ledger of stock changes. Never UPDATE or DELETE rows — always INSERT a compensating entry. `quantity_after` is a running balance for fast lookup.',
    },
  ];
  for (const a of tableAnns) {
    await sql(
      `INSERT INTO table_annotations (connection_id, schema_name, table_name, note, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (connection_id, schema_name, table_name) DO NOTHING`,
      [connectionId, a.schema, a.table, a.note]
    );
  }

  // Column annotations
  const colAnns = [
    {
      schema: 'demo_shop', table: 'orders', column: 'status',
      note: "Allowed values: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'. Transition rules enforced at the application layer, not via a DB constraint.",
    },
    {
      schema: 'demo_shop', table: 'products', column: 'compare_at_price',
      note: "Original price shown crossed-out in the UI. NULL means no sale. Always ensure compare_at_price > price when set.",
    },
    {
      schema: 'demo_shop', table: 'customers', column: 'email',
      note: "Used as the primary login identifier. Unique constraint enforced. Lowercase-normalised before insert.",
    },
  ];
  for (const a of colAnns) {
    await sql(
      `INSERT INTO column_annotations (connection_id, schema_name, table_name, column_name, note, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (connection_id, schema_name, table_name, column_name) DO NOTHING`,
      [connectionId, a.schema, a.table, a.column, a.note]
    );
  }

  // Tags
  const tagData = [
    { schema: 'demo_shop', table: 'customers',  tag: 'PII',  color: 'red'    },
    { schema: 'demo_shop', table: 'addresses',  tag: 'PII',  color: 'red'    },
    { schema: 'demo_shop', table: 'orders',     tag: 'core', color: 'blue'   },
    { schema: 'demo_shop', table: 'products',   tag: 'core', color: 'blue'   },
    { schema: 'demo_shop', table: 'inventory_movements', tag: 'append-only', color: 'orange' },
  ];
  for (const t of tagData) {
    // Only insert if no tags exist for this table
    const existing = await sql(
      'SELECT id FROM tags WHERE connection_id = $1 AND schema_name = $2 AND table_name = $3',
      [connectionId, t.schema, t.table]
    );
    if (existing.length === 0) {
      await sql(
        'INSERT INTO tags (connection_id, schema_name, table_name, tag, color) VALUES ($1,$2,$3,$4,$5)',
        [connectionId, t.schema, t.table, t.tag, t.color]
      );
    }
  }
}

// -- Ensure metadata tables exist (idempotent DDL) --
// Neon HTTP driver requires one statement per call — no multi-statement blocks.
export async function ensureSchema(): Promise<void> {
  const sql = neon(process.env['DATABASE_URL'] ?? '');

  await sql(`
    CREATE TABLE IF NOT EXISTS connections (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      database_name TEXT NOT NULL,
      username TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS table_annotations (
      id SERIAL PRIMARY KEY,
      connection_id INTEGER NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
      schema_name TEXT NOT NULL,
      table_name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (connection_id, schema_name, table_name)
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS column_annotations (
      id SERIAL PRIMARY KEY,
      connection_id INTEGER NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
      schema_name TEXT NOT NULL,
      table_name TEXT NOT NULL,
      column_name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (connection_id, schema_name, table_name, column_name)
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      connection_id INTEGER NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
      schema_name TEXT NOT NULL,
      table_name TEXT NOT NULL,
      tag TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'blue'
    )
  `);
}

// -- Connections --
export async function listConnections() {
  const db = getDb();
  return db.select().from(connections).orderBy(connections.id);
}

export async function createConnection(data: NewConnection) {
  const db = getDb();
  const [row] = await db.insert(connections).values(data).returning();
  return row;
}

export async function getConnection(id: number) {
  const db = getDb();
  const [row] = await db.select().from(connections).where(eq(connections.id, id));
  return row ?? null;
}

export async function findOrCreateDemoConnection() {
  const db = getDb();
  const existing = await db
    .select()
    .from(connections)
    .where(and(eq(connections.name, '__demo__'), eq(connections.host, '__internal__')));
  if (existing.length > 0) return existing[0]!;
  const [row] = await db
    .insert(connections)
    .values({ name: '__demo__', host: '__internal__', databaseName: 'demo_shop', username: 'internal' })
    .returning();
  return row!;
}

// -- Table annotations --
export async function getTableAnnotations(connectionId: number) {
  const db = getDb();
  return db.select().from(tableAnnotations).where(eq(tableAnnotations.connectionId, connectionId));
}

export async function upsertTableAnnotation(
  connectionId: number,
  schemaName: string,
  tableName: string,
  note: string
) {
  const db = getDb();
  const sql = neon(process.env['DATABASE_URL'] ?? '');
  await sql(`
    INSERT INTO table_annotations (connection_id, schema_name, table_name, note, updated_at)
    VALUES ($1, $2, $3, $4, now())
    ON CONFLICT (connection_id, schema_name, table_name)
    DO UPDATE SET note = EXCLUDED.note, updated_at = now()
  `, [connectionId, schemaName, tableName, note]);
  const [row] = await db
    .select()
    .from(tableAnnotations)
    .where(
      and(
        eq(tableAnnotations.connectionId, connectionId),
        eq(tableAnnotations.schemaName, schemaName),
        eq(tableAnnotations.tableName, tableName)
      )
    );
  return row ?? null;
}

// -- Column annotations --
export async function getColumnAnnotations(connectionId: number) {
  const db = getDb();
  return db.select().from(columnAnnotations).where(eq(columnAnnotations.connectionId, connectionId));
}

export async function upsertColumnAnnotation(
  connectionId: number,
  schemaName: string,
  tableName: string,
  columnName: string,
  note: string
) {
  const sql = neon(process.env['DATABASE_URL'] ?? '');
  await sql(`
    INSERT INTO column_annotations (connection_id, schema_name, table_name, column_name, note, updated_at)
    VALUES ($1, $2, $3, $4, $5, now())
    ON CONFLICT (connection_id, schema_name, table_name, column_name)
    DO UPDATE SET note = EXCLUDED.note, updated_at = now()
  `, [connectionId, schemaName, tableName, columnName, note]);
  const db = getDb();
  const [row] = await db
    .select()
    .from(columnAnnotations)
    .where(
      and(
        eq(columnAnnotations.connectionId, connectionId),
        eq(columnAnnotations.schemaName, schemaName),
        eq(columnAnnotations.tableName, tableName),
        eq(columnAnnotations.columnName, columnName)
      )
    );
  return row ?? null;
}

// -- Tags --
export async function getTagsForConnection(connectionId: number) {
  const db = getDb();
  return db.select().from(tags).where(eq(tags.connectionId, connectionId));
}

export async function setTableTags(
  connectionId: number,
  schemaName: string,
  tableName: string,
  newTags: Array<{ tag: string; color: string }>
) {
  const sql = neon(process.env['DATABASE_URL'] ?? '');
  // Delete existing tags for this table then insert new ones
  await sql(`
    DELETE FROM tags WHERE connection_id = $1 AND schema_name = $2 AND table_name = $3
  `, [connectionId, schemaName, tableName]);
  if (newTags.length > 0) {
    for (const t of newTags) {
      await sql(`
        INSERT INTO tags (connection_id, schema_name, table_name, tag, color)
        VALUES ($1, $2, $3, $4, $5)
      `, [connectionId, schemaName, tableName, t.tag, t.color]);
    }
  }
  const db = getDb();
  return db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.connectionId, connectionId),
        eq(tags.schemaName, schemaName),
        eq(tags.tableName, tableName)
      )
    );
}
