import { Router } from 'express';
import { z } from 'zod';
import { getTagsForConnection, setTableTags } from '../services/metadata.js';

const router = Router();

router.get('/connections/:id/tags', async (req, res, next) => {
  try {
    const id = Number(req.params['id']);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const rows = await getTagsForConnection(id);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

const SetTagsBody = z.object({
  connectionId: z.number().int(),
  schemaName: z.string().min(1),
  tableName: z.string().min(1),
  tags: z.array(
    z.object({
      tag: z.string().min(1),
      color: z.string().min(1),
    })
  ),
});

router.put('/tags', async (req, res, next) => {
  try {
    const parsed = SetTagsBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { connectionId, schemaName, tableName, tags } = parsed.data;
    const rows = await setTableTags(connectionId, schemaName, tableName, tags);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export { router as tagsRouter };
