import type { ScanResult } from './types';

// Module-level cache keyed by connectionId.
// Populated whenever a scan result is loaded (SchemaPage, ConnectPage).
// Allows TablePage to recover the scan result when navigated to without
// route state — e.g. from the ER diagram's onClick which passes no state.
const cache = new Map<number, ScanResult>();

export function cacheScanResult(id: number, result: ScanResult): void {
  cache.set(id, result);
}

export function getCachedScanResult(id: number): ScanResult | null {
  return cache.get(id) ?? null;
}
