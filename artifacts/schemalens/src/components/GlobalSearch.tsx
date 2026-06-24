import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Table2, Columns, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import type { SearchResult } from '../lib/types';
import { cn } from '../lib/utils';

interface GlobalSearchProps {
  connectionId: number;
}

const typeIcon = {
  table: Table2,
  column: Columns,
  annotation: FileText,
};

const typeLabel = {
  table: 'Table',
  column: 'Column',
  annotation: 'Note',
};

export function GlobalSearch({ connectionId }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery('');
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const tid = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.search(connectionId, query);
        setResults(r);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(tid);
  }, [query, connectionId]);

  const go = useCallback((r: SearchResult) => {
    setOpen(false);
    const base = `/connections/${connectionId}`;
    if (r.type === 'table' || r.type === 'annotation') {
      navigate(`${base}/schema/${r.schemaName}/table/${r.tableName}`);
    } else {
      navigate(`${base}/schema/${r.schemaName}/table/${r.tableName}`);
    }
  }, [connectionId, navigate]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1));
    if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
    if (e.key === 'Enter' && results[active]) go(results[active]!);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors cursor-pointer"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search…</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 text-[10px] font-medium">
          <span>⌘K</span>
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Search tables, columns, notes…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
              </div>
              {results.length > 0 && (
                <ul className="max-h-80 overflow-y-auto py-2">
                  {results.map((r, i) => {
                    const Icon = typeIcon[r.type];
                    return (
                      <li key={i}>
                        <button
                          onClick={() => go(r)}
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors cursor-pointer',
                            i === active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                          )}
                          onMouseEnter={() => setActive(i)}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {r.schemaName}.{r.tableName}
                              {r.columnName ? `.${r.columnName}` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{r.snippet}</p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">{typeLabel[r.type]}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {query && !loading && results.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No results for "{query}"</p>
              )}
              {!query && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Search tables, columns, and annotation notes
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
