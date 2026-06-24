import type {
  Connection,
  ScanResult,
  TableAnnotation,
  ColumnAnnotation,
  Tag,
  SearchResult,
} from './types';

const BASE = '/api';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error ?? data?.detail ?? `HTTP ${res.status}`;
    const detail = data?.detail ? `\n${data.detail}` : '';
    throw new Error(`${msg}${detail}`);
  }
  return data as T;
}

// -- Connections --
export const api = {
  listConnections: () => req<Connection[]>('/connections'),
  getConnection: (id: number) => req<Connection>(`/connections/${id}`),

  // -- Scan --
  scan: (connectionString: string, name?: string, connectionId?: number): Promise<ScanResult> =>
    req<ScanResult>('/scan', {
      method: 'POST',
      body: JSON.stringify({ connectionString, name, connectionId }),
    }),

  demoScan: (): Promise<ScanResult> =>
    req<ScanResult>('/demo/scan', { method: 'POST', body: JSON.stringify({}) }),

  rescan: (connectionId: number, connectionString: string): Promise<ScanResult> =>
    req<ScanResult>(`/connections/${connectionId}/rescan`, {
      method: 'POST',
      body: JSON.stringify({ connectionString }),
    }),

  // -- Annotations --
  getAnnotations: (connectionId: number) =>
    req<{ tableAnnotations: TableAnnotation[]; columnAnnotations: ColumnAnnotation[] }>(
      `/connections/${connectionId}/annotations`
    ),

  upsertTableAnnotation: (
    connectionId: number,
    schemaName: string,
    tableName: string,
    note: string
  ): Promise<TableAnnotation> =>
    req<TableAnnotation>('/annotations/table', {
      method: 'PUT',
      body: JSON.stringify({ connectionId, schemaName, tableName, note }),
    }),

  upsertColumnAnnotation: (
    connectionId: number,
    schemaName: string,
    tableName: string,
    columnName: string,
    note: string
  ): Promise<ColumnAnnotation> =>
    req<ColumnAnnotation>('/annotations/column', {
      method: 'PUT',
      body: JSON.stringify({ connectionId, schemaName, tableName, columnName, note }),
    }),

  // -- Tags --
  getTags: (connectionId: number) => req<Tag[]>(`/connections/${connectionId}/tags`),

  setTableTags: (
    connectionId: number,
    schemaName: string,
    tableName: string,
    tags: Array<{ tag: string; color: string }>
  ): Promise<Tag[]> =>
    req<Tag[]>('/tags', {
      method: 'PUT',
      body: JSON.stringify({ connectionId, schemaName, tableName, tags }),
    }),

  // -- Search --
  search: (connectionId: number, q: string): Promise<SearchResult[]> =>
    req<SearchResult[]>(`/connections/${connectionId}/search?q=${encodeURIComponent(q)}`),
};
