import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

export const connections = pgTable('connections', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  host: text('host').notNull(),
  databaseName: text('database_name').notNull(),
  username: text('username'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tableAnnotations = pgTable(
  'table_annotations',
  {
    id: serial('id').primaryKey(),
    connectionId: integer('connection_id').notNull().references(() => connections.id, { onDelete: 'cascade' }),
    schemaName: text('schema_name').notNull(),
    tableName: text('table_name').notNull(),
    note: text('note').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    unq: unique().on(t.connectionId, t.schemaName, t.tableName),
  })
);

export const columnAnnotations = pgTable(
  'column_annotations',
  {
    id: serial('id').primaryKey(),
    connectionId: integer('connection_id').notNull().references(() => connections.id, { onDelete: 'cascade' }),
    schemaName: text('schema_name').notNull(),
    tableName: text('table_name').notNull(),
    columnName: text('column_name').notNull(),
    note: text('note').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    unq: unique().on(t.connectionId, t.schemaName, t.tableName, t.columnName),
  })
);

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  connectionId: integer('connection_id').notNull().references(() => connections.id, { onDelete: 'cascade' }),
  schemaName: text('schema_name').notNull(),
  tableName: text('table_name').notNull(),
  tag: text('tag').notNull(),
  color: text('color').notNull().default('blue'),
});

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
export type TableAnnotation = typeof tableAnnotations.$inferSelect;
export type ColumnAnnotation = typeof columnAnnotations.$inferSelect;
export type Tag = typeof tags.$inferSelect;
