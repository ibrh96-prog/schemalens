import express from 'express';
import cors from 'cors';
import { ensureSchema } from './services/metadata.js';
import { connectionsRouter } from './routes/connections.js';
import { scanRouter } from './routes/scan.js';
import { annotationsRouter } from './routes/annotations.js';
import { tagsRouter } from './routes/tags.js';
import { searchRouter } from './routes/search.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use('/api', connectionsRouter);
app.use('/api', scanRouter);
app.use('/api', annotationsRouter);
app.use('/api', tagsRouter);
app.use('/api', searchRouter);

// Error handler
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: msg });
  }
);

const PORT = Number(process.env['PORT'] ?? 8080);

// Only listen when run directly (not when bundled as Vercel function)
if (process.env['VERCEL'] !== '1') {
  ensureSchema()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`SchemaLens API → http://localhost:${PORT}/api`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialise schema:', err);
      process.exit(1);
    });
}

export default app;
