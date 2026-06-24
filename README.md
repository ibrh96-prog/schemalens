# SchemaLens

**Self-hosted PostgreSQL documentation that learns from your team.**

Paste a connection string, browse your schema with an interactive ER diagram, and attach permanent human-written notes to every table and column. Annotations survive re-scans and are stored in SchemaLens's own database — never in the database you're documenting.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · Vite · TypeScript · Tailwind CSS v4 · shadcn/ui · Framer Motion |
| ER Diagram | @xyflow/react (React Flow) with dagre auto-layout |
| API | Node.js · Express 5 · TypeScript |
| Metadata DB | Drizzle ORM · @neondatabase/serverless (neon-http) |
| Target introspection | postgres.js (read-only, `prepare:false`, `max:1`) |
| Validation | Zod · drizzle-zod |
| API contract | OpenAPI 3.1 |
| Package manager | pnpm workspaces |
| Deploy | Vercel (single project) |

---

## Features

- **Connect screen** — paste a PostgreSQL connection string and hit Scan
- **Schema overview** — all tables grouped by schema, with row-count estimates, column counts, and tags. Searchable/filterable.
- **ER diagram** — tables as nodes, foreign keys as edges. Pannable, zoomable, auto-layout via dagre. Click any node to open the table detail page.
- **Table detail** — full column list (type, nullable, default, PK/FK badges), indexes, FK in and out.
- **Annotation layer** — inline editable note on every table and every column. Notes are keyed by connection + schema + table + column and survive re-scans.
- **Tags** — attach coloured labels to tables (PII, core, legacy, etc.)
- **Re-scan** — refresh the introspection at any time; annotations re-attach automatically.
- **Global search** — ⌘K palette searches table names, column names, and annotation text.
- **Dark / light mode** — persisted in localStorage.
- **Demo schema** — click "Try the demo schema" to explore a realistic e-commerce schema with pre-seeded annotations (no database required).

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| pnpm | ≥ 9 (via Corepack) |
| PostgreSQL | Any version (for your metadata DB) |

> **Recommended metadata DB**: [Neon](https://neon.tech) free tier — SchemaLens was designed for Neon's serverless driver.

---

## Project structure

```
schemalens/
├── artifacts/
│   ├── api-server/          # Express 5 API — port 8080
│   │   └── src/
│   │       ├── index.ts
│   │       ├── routes/      # connections · scan · annotations · tags · search
│   │       └── services/    # introspect.ts (postgres.js) · metadata.ts (Drizzle)
│   └── schemalens/          # React + Vite frontend — port 3000
│       └── src/
│           ├── pages/        # ConnectPage · SchemaPage · TablePage
│           ├── components/   # Layout · ERDiagram · AnnotationEditor · TagEditor …
│           ├── lib/          # api.ts · types.ts · utils.ts
│           └── hooks/        # useTheme
├── lib/
│   ├── db/                  # Drizzle schema + client (metadata DB)
│   │   └── seed/            # demo_shop.sql + run-seed.ts
│   └── api-spec/            # openapi.yaml
├── api/
│   ├── index.ts             # Vercel serverless entry point
│   └── package.json         # {"type":"module"}
├── vercel.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## Local setup

```bash
# 1. Clone
git clone https://github.com/you/schemalens.git
cd schemalens

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your Neon (or any Postgres) connection string

# 4. Load the demo schema (optional but recommended for the demo button)
psql $DATABASE_URL -f lib/db/seed/demo_shop.sql

# 5. Start both servers
pnpm dev
```

Frontend → http://localhost:3000  
API → http://localhost:8080/api

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string for SchemaLens's **own** metadata database. |
| `PORT` | No | `8080` | Port the API server listens on (local dev only). |

> Connection strings for **target databases** are passed per-request in the request body and are never persisted.

---

## Seed data (demo_shop)

The `lib/db/seed/demo_shop.sql` file creates a realistic e-commerce schema (`demo_shop` PostgreSQL schema) in your metadata database, complete with:

- 9 tables: `categories`, `products`, `customers`, `addresses`, `orders`, `order_items`, `payments`, `reviews`, `inventory_movements`
- Rich foreign-key graph (ideal for the ER diagram)
- ~15–40 rows per table (so row-count estimates are non-zero)

Load it once before clicking **Try the demo schema**:

```bash
# Using psql
psql $DATABASE_URL -f lib/db/seed/demo_shop.sql

# Or using the npm script
pnpm db:seed
```

The first time the demo button is clicked, SchemaLens also seeds example annotations and tags (PII on `customers` and `addresses`, state-machine docs on `orders.status`, etc.) into the metadata DB automatically.

---

## Available scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start both servers concurrently |
| `pnpm build` | Build frontend + API bundle |
| `pnpm build:api` | Bundle API to `api/_bundle.cjs` with esbuild |
| `pnpm db:generate` | Generate Drizzle migration files |
| `pnpm db:migrate` | Run Drizzle migrations |
| `pnpm db:seed` | Load the demo_shop seed SQL |

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/connections` | List saved connections |
| POST | `/api/connections` | Create a connection record |
| GET | `/api/connections/:id` | Get a connection |
| POST | `/api/scan` | Introspect a target database |
| POST | `/api/demo/scan` | Introspect the built-in demo_shop schema |
| POST | `/api/connections/:id/rescan` | Re-introspect an existing connection |
| GET | `/api/connections/:id/annotations` | Get all annotations |
| PUT | `/api/annotations/table` | Upsert a table annotation |
| PUT | `/api/annotations/column` | Upsert a column annotation |
| GET | `/api/connections/:id/tags` | Get tags |
| PUT | `/api/tags` | Replace all tags for a table |
| GET | `/api/connections/:id/search?q=` | Search tables, columns, annotations |

Full OpenAPI 3.1 spec: [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml)

---

## Metadata DB schema

| Table | Purpose |
|---|---|
| `connections` | Saved connection labels (host, db name, username — no passwords) |
| `table_annotations` | Human notes keyed by `(connection_id, schema, table)` |
| `column_annotations` | Human notes keyed by `(connection_id, schema, table, column)` |
| `tags` | Coloured labels keyed by `(connection_id, schema, table)` |

SchemaLens creates these tables automatically via `ensureSchema()` on first startup — no manual migration step required for local dev.

---

## How to extend

**Schema diff / version history** (planned): Store the `SchemaIntrospection` JSON snapshot in a new `schema_snapshots` table keyed by `(connection_id, created_at)`. Compare two snapshots to produce an added/removed/changed diff. This is the most-requested future feature.

**MySQL / SQL Server support**: The introspection service in `artifacts/api-server/src/services/introspect.ts` is the only database-specific layer. Replace the `information_schema` and `pg_catalog` queries with their MySQL or SQL Server equivalents and add a `driver` field to the connection record. The annotation and tag layers are database-agnostic.

---

## Production deploy (single Vercel project)

```bash
# 1. Push to GitHub
git push origin main

# 2. Import the repository in Vercel
#    vercel.json already wires:
#      /       → artifacts/schemalens/dist (built frontend)
#      /api/*  → api/index.ts (serverless function)

# 3. Set environment variable in the Vercel dashboard
#    DATABASE_URL = <your Neon connection string>

# 4. Trigger a deploy — Vercel runs `pnpm run build` automatically
```

Or deploy from the CLI:

```bash
vercel deploy --prod
```

The build command (`pnpm run build`) builds the frontend then bundles the API to `api/_bundle.cjs`. The `api/index.ts` serverless handler imports the bundle via `createRequire` to avoid ESM compatibility issues.

---

## License

MIT — see [LICENSE](LICENSE).
