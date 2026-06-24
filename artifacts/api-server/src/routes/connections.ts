import { Router } from 'express';
import { z } from 'zod';
import {
  listConnections,
  createConnection,
  getConnection,
} from '../services/metadata.js';

const router = Router();

router.get('/connections', async (_req, res, next) => {
  try {
    const rows = await listConnections();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/connections/:id', async (req, res, next) => {
  try {
    const id = Number(req.params['id']);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const row = await getConnection(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

const CreateBody = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  databaseName: z.string().min(1),
  username: z.string().optional(),
});

router.post('/connections', async (req, res, next) => {
  try {
    const parsed = CreateBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const row = await createConnection(parsed.data);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

export { router as connectionsRouter };
