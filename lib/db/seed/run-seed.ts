import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(databaseUrl);
const seedPath = join(__dir, 'demo_shop.sql');
const seedSql = readFileSync(seedPath, 'utf-8');

console.log('Running demo_shop seed…');
await sql(seedSql);
console.log('Done.');
