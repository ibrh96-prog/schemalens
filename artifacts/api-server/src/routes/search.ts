import { Router } from 'express';
import { z } from 'zod';
import {
  getTableAnnotations,
  getColumnAnnotations,
} from '../services/metadata.js';
import type { SchemaIntrospection } from '../services/introspect.js';

const router = Router();

// In-memory schema cache (per process, not shared across serverless instances)
const schemaCache = new Map<number, SchemaIntrospection>();

export function cacheSchema(connectionId: number, schema: SchemaIntrospection) {
  schemaCache.set(connectionId, schema);
}

router.get('/connections/:id/search', async (req, res, next) => {
  try {
    const id = Number(req.params['id']);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const queryParsed = z.object({ q: z.string().min(1) }).safeParse(req.query);
    if (!queryParsed.success) return res.status(400).json({ error: 'q is required' });

    const q = queryParsed.data.q.toLowerCase();
    const schema = schemaCache.get(id);

    const [tableAnns, columnAnns] = await Promise.all([
      getTableAnnotations(id),
      getColumnAnnotations(id),
    ]);

    const results: Array<{
      type: 'table' | 'column' | 'annotation';
      schemaName: string;
      tableName: string;
      columnName?: string;
      snippet: string;
    }> = [];

    if (schema) {
      for (const t of schema.tables) {
        if (
          t.tableName.toLowerCase().includes(q) ||
          t.schemaName.toLowerCase().includes(q)
        ) {
          results.push({
            type: 'table',
            schemaName: t.schemaName,
            tableName: t.tableName,
            snippet: `${t.schemaName}.${t.tableName}`,
          });
        }
        for (const c of t.columns) {
          if (c.columnName.toLowerCase().includes(q) || c.dataType.toLowerCase().includes(q)) {
            results.push({
              type: 'column',
              schemaName: t.schemaName,
              tableName: t.tableName,
              columnName: c.columnName,
              snippet: `${t.schemaName}.${t.tableName}.${c.columnName} (${c.dataType})`,
            });
          }
        }
      }
    }

    for (const ann of tableAnns) {
      if (ann.note.toLowerCase().includes(q)) {
        results.push({
          type: 'annotation',
          schemaName: ann.schemaName,
          tableName: ann.tableName,
          snippet: ann.note.slice(0, 120),
        });
      }
    }

    for (const ann of columnAnns) {
      if (ann.note.toLowerCase().includes(q)) {
        results.push({
          type: 'annotation',
          schemaName: ann.schemaName,
          tableName: ann.tableName,
          columnName: ann.columnName,
          snippet: ann.note.slice(0, 120),
        });
      }
    }

    res.json(results.slice(0, 50));
  } catch (err) {
    next(err);
  }
});

export { router as searchRouter };
