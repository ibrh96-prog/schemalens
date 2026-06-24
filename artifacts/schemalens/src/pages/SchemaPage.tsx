import { useState, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutGrid,
  Network,
  RefreshCw,
  Table2,
  Search,
  X,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { ScanResult, Tag } from '../lib/types';
import { cacheScanResult } from '../lib/schemaCache';
import { Layout } from '../components/Layout';
import { ERDiagram } from '../components/ERDiagram';
import { TagBadge } from '../components/TagBadge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { formatRowCount } from '../lib/utils';
import { cn } from '../lib/utils';

type Tab = 'tables' | 'diagram';

export function SchemaPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const connectionId = Number(id);

  const initialResult = (location.state as ScanResult | null) ?? null;
  if (initialResult) cacheScanResult(connectionId, initialResult);
  const [scanResult, setScanResult] = useState<ScanResult | null>(initialResult);
  const [tab, setTab] = useState<Tab>('diagram');
  const [filter, setFilter] = useState('');
  const [rescanOpen, setRescanOpen] = useState(false);
  const [rescanStr, setRescanStr] = useState('');
  const [rescanning, setRescanning] = useState(false);

  // If navigated here without state, send user back to connect
  if (!scanResult) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No schema loaded.</p>
          <Button onClick={() => navigate('/')}>Go to connect</Button>
        </div>
      </Layout>
    );
  }

  const { schema, tableAnnotations, columnAnnotations, tags } = scanResult;

  const tagsByTable = useMemo(() => {
    const m = new Map<string, Tag[]>();
    for (const t of tags) {
      const k = `${t.schemaName}.${t.tableName}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return m;
  }, [tags]);

  const tableAnnotationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of tableAnnotations) {
      m.set(`${a.schemaName}.${a.tableName}`, a.note);
    }
    return m;
  }, [tableAnnotations]);

  // Group tables by schema
  const schemaGroups = useMemo(() => {
    const q = filter.toLowerCase();
    const filtered = q
      ? schema.tables.filter(
          (t) =>
            t.tableName.toLowerCase().includes(q) ||
            t.schemaName.toLowerCase().includes(q)
        )
      : schema.tables;

    const groups = new Map<string, typeof filtered>();
    for (const t of filtered) {
      if (!groups.has(t.schemaName)) groups.set(t.schemaName, []);
      groups.get(t.schemaName)!.push(t);
    }
    return groups;
  }, [schema.tables, filter]);

  const handleRescan = useCallback(async () => {
    if (!rescanStr.trim()) return;
    setRescanning(true);
    try {
      const result = await api.rescan(connectionId, rescanStr.trim());
      cacheScanResult(connectionId, result);
      setScanResult(result);
      setRescanOpen(false);
      setRescanStr('');
      toast.success('Schema refreshed');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Re-scan failed');
    } finally {
      setRescanning(false);
    }
  }, [connectionId, rescanStr]);

  const totalAnnotations = tableAnnotations.filter((a) => a.note).length +
    columnAnnotations.filter((a) => a.note).length;

  return (
    <Layout
      breadcrumbs={[{ label: scanResult.schema.tables[0]?.schemaName === 'demo_shop' ? 'Demo Shop' : `Connection ${connectionId}` }]}
      showSearch
    >
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schema Browser</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {schema.tables.length} tables · {totalAnnotations} annotations ·
            scanned {new Date(schema.scannedAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRescanOpen(true)}>
            <RefreshCw className="h-4 w-4" />
            Re-scan
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b mb-6">
        {([
          { key: 'diagram', label: 'ER Diagram', icon: Network },
          { key: 'tables',  label: 'Tables',     icon: Table2  },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ER Diagram tab */}
      {tab === 'diagram' && (
        <motion.div
          key="diagram"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border bg-card overflow-hidden"
          style={{ height: 'calc(100vh - 260px)', minHeight: 500 }}
        >
          <ERDiagram
            tables={schema.tables}
            tags={tags}
            connectionId={connectionId}
          />
        </motion.div>
      )}

      {/* Tables list tab */}
      {tab === 'tables' && (
        <motion.div
          key="tables"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="mb-4 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter tables…"
              className="pl-9 h-9"
            />
            {filter && (
              <button
                onClick={() => setFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {schemaGroups.size === 0 && (
            <div className="flex flex-col items-center py-16 text-muted-foreground gap-2">
              <Search className="h-8 w-8" />
              <p>No tables match "{filter}"</p>
            </div>
          )}

          {Array.from(schemaGroups.entries()).map(([schemaName, tables]) => (
            <div key={schemaName} className="mb-8">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="font-mono">{schemaName}</span>
                <span className="h-px flex-1 bg-border" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {tables.map((t) => {
                  const tableKey = `${t.schemaName}.${t.tableName}`;
                  const tableTags = tagsByTable.get(tableKey) ?? [];
                  const note = tableAnnotationMap.get(tableKey);
                  return (
                    <Link
                      key={tableKey}
                      to={`/connections/${connectionId}/schema/${t.schemaName}/table/${t.tableName}`}
                      state={scanResult}
                    >
                      <motion.div
                        whileHover={{ y: -1 }}
                        className="group flex flex-col gap-2 rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Table2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-semibold text-sm truncate">{t.tableName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {t.columnCount} col{t.columnCount !== 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-mono">
                              {formatRowCount(t.rowEstimate)}
                            </Badge>
                          </div>
                        </div>
                        {tableTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tableTags.map((tag) => (
                              <TagBadge key={tag.id} tag={tag.tag} color={tag.color} />
                            ))}
                          </div>
                        )}
                        {note && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{note}</p>
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Re-scan modal */}
      {rescanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setRescanOpen(false)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-2xl p-6 flex flex-col gap-4"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Re-scan database
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your connection string again to refresh the schema. Your annotations are preserved.
            </p>
            <Input
              type="password"
              value={rescanStr}
              onChange={(e) => setRescanStr(e.target.value)}
              placeholder="postgresql://user:pass@host/dbname"
              className="font-mono text-xs"
              autoComplete="off"
              onKeyDown={(e) => e.key === 'Enter' && handleRescan()}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRescanOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRescan} loading={rescanning}>
                <RefreshCw className="h-4 w-4" />
                Re-scan
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}
