import { Router } from 'express';
import { z } from 'zod';
import {
  getTableAnnotations,
  getColumnAnnotations,
  upsertTableAnnotation,
  upsertColumnAnnotation,
} from '../services/metadata.js';

const router = Router();

router.get('/connections/:id/annotations', async (req, res, next) => {
  try {
    const id = Number(req.params['id']);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const [tableAnns, columnAnns] = await Promise.all([
      getTableAnnotations(id),
      getColumnAnnotations(id),
    ]);
    res.json({ tableAnnotations: tableAnns, columnAnnotations: columnAnns });
  } catch (err) {
    next(err);
  }
});

const TableAnnotationBody = z.object({
  connectionId: z.number().int(),
  schemaName: z.string().min(1),
  tableName: z.string().min(1),
  note: z.string(),
});

router.put('/annotations/table', async (req, res, next) => {
  try {
    const parsed = TableAnnotationBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { connectionId, schemaName, tableName, note } = parsed.data;
    const row = await upsertTableAnnotation(connectionId, schemaName, tableName, note);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

const ColumnAnnotationBody = z.object({
  connectionId: z.number().int(),
  schemaName: z.string().min(1),
  tableName: z.string().min(1),
  columnName: z.string().min(1),
  note: z.string(),
});

router.put('/annotations/column', async (req, res, next) => {
  try {
    const parsed = ColumnAnnotationBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { connectionId, schemaName, tableName, columnName, note } = parsed.data;
    const row = await upsertColumnAnnotation(connectionId, schemaName, tableName, columnName, note);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

export { router as annotationsRouter };
