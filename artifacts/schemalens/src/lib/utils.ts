import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRowCount(n: number): string {
  if (n < 0) return '—';
  if (n === 0) return '0';
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `~${(n / 1_000).toFixed(1)}k`;
  return `~${n}`;
}

export function humanDataType(dataType: string, udtName: string): string {
  const d = dataType.toLowerCase();
  if (d === 'character varying') return `varchar`;
  if (d === 'character') return 'char';
  if (d === 'user-defined') return udtName;
  if (d === 'array') return `${udtName.replace(/^_/, '')}[]`;
  if (d === 'timestamp without time zone') return 'timestamp';
  if (d === 'timestamp with time zone') return 'timestamptz';
  if (d === 'time without time zone') return 'time';
  if (d === 'time with time zone') return 'timetz';
  if (d === 'double precision') return 'float8';
  if (d === 'boolean') return 'bool';
  if (d === 'integer') return 'int4';
  if (d === 'bigint') return 'int8';
  if (d === 'smallint') return 'int2';
  return d;
}
