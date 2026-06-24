import { Router } from 'express';
import { z } from 'zod';
import { introspectDatabase } from '../services/introspect.js';
import { cacheSchema } from './search.js';
import {
  createConnection,
  findOrCreateDemoConnection,
  getTableAnnotations,
  getColumnAnnotations,
  getTagsForConnection,
  seedDemoAnnotations,
} from '../services/metadata.js';

const router = Router();

const ScanBody = z.object({
  connectionString: z.string().min(1),
  name: z.string().optional(),
  connectionId: z.number().optional(),
});

function parseConnectionString(cs: string): {
  host: string;
  databaseName: string;
  username: string | undefined;
} {
  try {
    // Handle postgres:// and postgresql://
    const url = new URL(cs);
    return {
      host: url.hostname + (url.port ? `:${url.port}` : ''),
      databaseName: url.pathname.slice(1),
      username: url.username || undefined,
    };
  } catch {
    return { host: 'unknown', databaseName: 'unknown', username: undefined };
  }
}

router.post('/scan', async (req, res, next) => {
  try {
    const parsed = ScanBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { connectionString, name } = parsed.data;
    let { connectionId } = parsed.data;

    let schema;
    try {
      schema = await introspectDatabase(connectionString);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Sanitise: remove password from error messages
      const safe = msg.replace(/:[^@]*@/, ':***@');
      return res.status(422).json({ error: 'Connection failed', detail: safe });
    }

    // Create a connection record if we don't have one
    if (!connectionId) {
      const meta = parseConnectionString(connectionString);
      const conn = await createConnection({
        name: name ?? `${meta.databaseName} @ ${meta.host}`,
        host: meta.host,
        databaseName: meta.databaseName,
        username: meta.username,
      });
      connectionId = conn.id;
    }

    cacheSchema(connectionId, schema);

    const [tableAnns, columnAnns, tagRows] = await Promise.all([
      getTableAnnotations(connectionId),
      getColumnAnnotations(connectionId),
      getTagsForConnection(connectionId),
    ]);

    res.json({ connectionId, schema, tableAnnotations: tableAnns, columnAnnotations: columnAnns, tags: tagRows });
  } catch (err) {
    next(err);
  }
});

// Demo scan — uses this app's own DATABASE_URL, restricted to demo_shop schema
router.post('/demo/scan', async (_req, res, next) => {
  try {
    const url = process.env['DATABASE_URL'];
    if (!url) return res.status(500).json({ error: 'DATABASE_URL not configured' });

    let schema;
    try {
      schema = await introspectDatabase(url, 'demo_shop');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(422).json({ error: 'Demo scan failed', detail: msg });
    }

    const demoConn = await findOrCreateDemoConnection();
    const connectionId = demoConn.id;

    // Seed example annotations on first access
    await seedDemoAnnotations(connectionId);
    cacheSchema(connectionId, schema);

    const [tableAnns, columnAnns, tagRows] = await Promise.all([
      getTableAnnotations(connectionId),
      getColumnAnnotations(connectionId),
      getTagsForConnection(connectionId),
    ]);

    res.json({ connectionId, schema, tableAnnotations: tableAnns, columnAnnotations: columnAnns, tags: tagRows });
  } catch (err) {
    next(err);
  }
});

// Re-scan an existing connection
router.post('/connections/:id/rescan', async (req, res, next) => {
  try {
    const connectionId = Number(req.params['id']);
    if (isNaN(connectionId)) return res.status(400).json({ error: 'Invalid id' });

    const body = z.object({ connectionString: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.flatten() });

    let schema;
    try {
      schema = await introspectDatabase(body.data.connectionString);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const safe = msg.replace(/:[^@]*@/, ':***@');
      return res.status(422).json({ error: 'Connection failed', detail: safe });
    }

    cacheSchema(connectionId, schema);

    const [tableAnns, columnAnns, tagRows] = await Promise.all([
      getTableAnnotations(connectionId),
      getColumnAnnotations(connectionId),
      getTagsForConnection(connectionId),
    ]);

    res.json({ connectionId, schema, tableAnnotations: tableAnns, columnAnnotations: columnAnns, tags: tagRows });
  } catch (err) {
    next(err);
  }
});

export { router as scanRouter };
