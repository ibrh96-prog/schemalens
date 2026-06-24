// Vercel serverless entry point (ESM, api/package.json has "type":"module").
// The Express app is pre-bundled to _bundle.cjs by the root build script.
// createRequire lets ESM load the CJS bundle without ERR_REQUIRE_ESM.
import { createRequire } from 'node:module';
import type { IncomingMessage, ServerResponse } from 'node:http';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bundle = require('./_bundle.cjs') as any;
const app: (req: IncomingMessage, res: ServerResponse) => void =
  bundle.default ?? bundle;

// Tell the bundle it is running inside Vercel so it skips listen().
process.env['VERCEL'] = '1';

export default app;
