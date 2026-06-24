import { useState, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Key,
  Link as LinkIcon,
  ArrowLeft,
  ArrowRight,
  Tag as TagIcon,
  FileText,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { ScanResult, ColumnInfo, Tag } from '../lib/types';
import { Layout } from '../components/Layout';
import { AnnotationEditor } from '../components/AnnotationEditor';
import { TagEditor } from '../components/TagEditor';
import { TagBadge } from '../components/TagBadge';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Button } from '../components/ui/button';
import { humanDataType, formatRowCount } from '../lib/utils';
import { cn } from '../lib/utils';

export function TablePage() {
  const { id, schemaName, tableName } = useParams<{
    id: string;
    schemaName: string;
    tableName: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const connectionId = Number(id);

  const scanResult = (location.state as ScanResult | null) ?? null;

  const table = useMemo(
    () =>
      scanResult?.schema.tables.find(
        (t) => t.schemaName === schemaName && t.tableName === tableName
      ) ?? null,
    [scanResult, schemaName, tableName]
  );

  // Annotations local state (start from scan result, update on save)
  const [tableNote, setTableNote] = useState<string>(() => {
    const ann = scanResult?.tableAnnotations.find(
      (a) => a.schemaName === schemaName && a.tableName === tableName
    );
    return ann?.note ?? '';
  });

  const [columnNotes, setColumnNotes] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const a of scanResult?.columnAnnotations ?? []) {
      if (a.schemaName === schemaName && a.tableName === tableName) {
        m.set(a.columnName, a.note);
      }
    }
    return m;
  });

  const [tableTags, setTableTags] = useState<Tag[]>(() =>
    (scanResult?.tags ?? []).filter(
      (t) => t.schemaName === schemaName && t.tableName === tableName
    )
  );

  const saveTableNote = useCallback(
    async (note: string) => {
      if (!schemaName || !tableName) return;
      try {
        await api.upsertTableAnnotation(connectionId, schemaName, tableName, note);
        setTableNote(note);
        toast.success('Note saved');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed');
        throw err;
      }
    },
    [connectionId, schemaName, tableName]
  );

  const saveColumnNote = useCallback(
    async (columnName: string, note: string) => {
      if (!schemaName || !tableName) return;
      try {
        await api.upsertColumnAnnotation(connectionId, schemaName, tableName, columnName, note);
        setColumnNotes((prev) => new Map(prev).set(columnName, note));
        toast.success('Note saved');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed');
        throw err;
      }
    },
    [connectionId, schemaName, tableName]
  );

  const saveTableTags = useCallback(
    async (tags: Array<{ tag: string; color: string }>) => {
      if (!schemaName || !tableName) return;
      try {
        const saved = await api.setTableTags(connectionId, schemaName, tableName, tags);
        setTableTags(saved);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed');
        throw err;
      }
    },
    [connectionId, schemaName, tableName]
  );

  if (!scanResult || !table) {
    return (
      <Layout>
        <div className="flex flex-col items-center py-32 gap-4 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Table not found. Go back and re-scan.</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </Layout>
    );
  }

  const backHref = `/connections/${connectionId}`;

  return (
    <Layout
      breadcrumbs={[
        { label: schemaName!, href: backHref },
        { label: tableName! },
      ]}
      showSearch
    >
      {/* Back + title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backHref, { state: scanResult })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground font-mono">{schemaName}</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight font-mono">{tableName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 pl-11 sm:pl-0">
          <Badge variant="secondary">
            {table.columnCount} columns
          </Badge>
          <Badge variant="outline" className="font-mono">
            {formatRowCount(table.rowEstimate)} rows (est.)
          </Badge>
          {tableTags.map((t) => (
            <TagBadge key={t.id} tag={t.tag} color={t.color} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: columns + annotations */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* Table note + tags */}
          <Section title="Table description" icon={FileText}>
            <AnnotationEditor
              note={tableNote}
              placeholder="Describe this table's purpose, domain, and usage…"
              onSave={saveTableNote}
            />
            <Separator className="my-4" />
            <div className="flex items-center gap-2 mb-2">
              <TagIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tags</span>
            </div>
            <TagEditor
              tags={tableTags.map((t) => ({ tag: t.tag, color: t.color }))}
              onSave={saveTableTags}
            />
          </Section>

          {/* Columns */}
          <Section title="Columns" icon={Key}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    {['Column', 'Type', 'Flags', 'Default', 'Note'].map((h) => (
                      <th
                        key={h}
                        className="pb-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {table.columns.map((col) => (
                    <ColumnRow
                      key={col.columnName}
                      col={col}
                      note={columnNotes.get(col.columnName) ?? ''}
                      onSaveNote={(note) => saveColumnNote(col.columnName, note)}
                      connectionId={connectionId}
                      schemaName={schemaName!}
                      tableName={tableName!}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        {/* Right: FK map + indexes */}
        <div className="flex flex-col gap-6">
          {/* FK relationships */}
          {table.foreignKeys.length > 0 && (
            <Section title="References (out)" icon={ArrowRight}>
              <ul className="space-y-2">
                {table.foreignKeys.map((fk) => (
                  <li key={fk.constraintName} className="text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs mb-0.5">
                      <span className="text-foreground">{fk.fromColumn}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs font-mono text-primary hover:underline"
                        onClick={() =>
                          navigate(
                            `/connections/${connectionId}/schema/${fk.toSchema}/table/${fk.toTable}`,
                            { state: scanResult }
                          )
                        }
                      >
                        {fk.toSchema}.{fk.toTable}.{fk.toColumn}
                        <ExternalLink className="h-3 w-3 ml-0.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fk.constraintName}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Incoming FK */}
          {table.incomingForeignKeys.length > 0 && (
            <Section title="Referenced by (in)" icon={ArrowLeft}>
              <ul className="space-y-2">
                {table.incomingForeignKeys.map((fk, i) => (
                  <li key={`${fk.constraintName}-${i}`} className="text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs mb-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs font-mono text-primary hover:underline"
                        onClick={() =>
                          navigate(
                            `/connections/${connectionId}/schema/${fk.fromSchema}/table/${fk.fromTable}`,
                            { state: scanResult }
                          )
                        }
                      >
                        {fk.fromSchema}.{fk.fromTable}.{fk.fromColumn}
                        <ExternalLink className="h-3 w-3 ml-0.5" />
                      </Button>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="text-foreground">{tableName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{fk.constraintName}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Indexes */}
          {table.indexes.length > 0 && (
            <Section title="Indexes" icon={LinkIcon}>
              <ul className="space-y-3">
                {table.indexes.map((idx) => (
                  <li key={idx.indexName}>
                    <p className="text-xs font-mono font-semibold text-foreground mb-0.5">
                      {idx.indexName}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono break-all">
                      {idx.indexDef}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ColumnRow({
  col,
  note,
  onSaveNote,
}: {
  col: ColumnInfo;
  note: string;
  onSaveNote: (note: string) => Promise<void>;
  connectionId: number;
  schemaName: string;
  tableName: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={cn(
          'cursor-pointer hover:bg-muted/40 transition-colors',
          expanded && 'bg-accent/30'
        )}
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Column name */}
        <td className="py-2.5 pr-4 whitespace-nowrap">
          <span className="font-mono text-sm font-medium">{col.columnName}</span>
        </td>
        {/* Type */}
        <td className="py-2.5 pr-4 whitespace-nowrap">
          <span className="text-xs font-mono text-muted-foreground">
            {humanDataType(col.dataType, col.udtName)}
            {col.characterMaximumLength ? `(${col.characterMaximumLength})` : ''}
          </span>
        </td>
        {/* Flags */}
        <td className="py-2.5 pr-4">
          <div className="flex items-center gap-1 flex-wrap">
            {col.isPrimaryKey && <Badge variant="pk">PK</Badge>}
            {col.isForeignKey && <Badge variant="fk">FK</Badge>}
            {!col.isNullable && !col.isPrimaryKey && (
              <Badge variant="nullable">NN</Badge>
            )}
          </div>
        </td>
        {/* Default */}
        <td className="py-2.5 pr-4">
          {col.columnDefault && (
            <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[120px] block">
              {col.columnDefault}
            </span>
          )}
        </td>
        {/* Note indicator */}
        <td className="py-2.5">
          {note ? (
            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">
              {note}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/50 italic">Add note…</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="pb-3 pt-1 px-2">
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              {col.isForeignKey && col.foreignKeyTarget && (
                <p className="text-xs text-muted-foreground mb-2 font-mono">
                  FK → {col.foreignKeyTarget.schema}.{col.foreignKeyTarget.table}.
                  {col.foreignKeyTarget.column}
                </p>
              )}
              <AnnotationEditor
                note={note}
                placeholder={`Describe ${col.columnName}…`}
                onSave={onSaveNote}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
