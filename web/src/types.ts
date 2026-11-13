// Re-export engine schema types for the web package.
// We copy-paste the interfaces rather than depend on the engine package
// to keep the web build fully standalone.

export const schemaVersion = 1 as const;

export type GraveKind = 'file' | 'export' | 'dependency';

export interface Grave {
  id: string;
  kind: GraveKind;
  path: string;
  name?: string;
  line?: number;
  born: string;
  lastTouched: string;
  ageDays: number;
  author: string;
  lastMessage: string;
  epitaph: string;
}

export interface Cobweb {
  id: string;
  path: string;
  line: number;
  tag: 'TODO' | 'FIXME' | 'HACK';
  text: string;
  author: string;
  ageDays: number;
}

export interface HauntedHouse {
  path: string;
  commits90d: number;
  authors: number;
}

export interface Plot {
  dir: string;
  files: number;
  deadFiles: number;
  fog: number;
}

export interface Graveyard {
  schemaVersion: 1;
  repo: string;
  headSha: string;
  headDate: string;
  scannedAt: string;
  graves: Grave[];
  cobwebs: Cobweb[];
  haunted: HauntedHouse[];
  plots: Plot[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function isIso(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s);
}

function checkGrave(g: unknown, idx: number): string[] {
  const errs: string[] = [];
  if (typeof g !== 'object' || g === null) return [`graves[${idx}]: not an object`];
  const o = g as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) errs.push(`graves[${idx}].id missing`);
  if (!['file', 'export', 'dependency'].includes(o.kind as string))
    errs.push(`graves[${idx}].kind invalid`);
  if (typeof o.path !== 'string' || !o.path) errs.push(`graves[${idx}].path missing`);
  if (!isIso(o.born)) errs.push(`graves[${idx}].born not ISO`);
  if (!isIso(o.lastTouched)) errs.push(`graves[${idx}].lastTouched not ISO`);
  if (typeof o.ageDays !== 'number' || o.ageDays < 0) errs.push(`graves[${idx}].ageDays invalid`);
  if (typeof o.author !== 'string') errs.push(`graves[${idx}].author missing`);
  if (typeof o.lastMessage !== 'string') errs.push(`graves[${idx}].lastMessage missing`);
  if (typeof o.epitaph !== 'string') errs.push(`graves[${idx}].epitaph missing`);
  return errs;
}

export function validateGraveyard(json: unknown): ValidationResult {
  const errs: string[] = [];
  if (typeof json !== 'object' || json === null)
    return { ok: false, errors: ['root is not an object'] };
  const obj = json as Record<string, unknown>;
  if (obj.schemaVersion !== 1) errs.push(`schemaVersion must be 1, got ${String(obj.schemaVersion)}`);
  if (typeof obj.repo !== 'string' || !obj.repo) errs.push('repo missing');
  if (!isIso(obj.headDate)) errs.push('headDate not ISO');
  if (!isIso(obj.scannedAt)) errs.push('scannedAt not ISO');
  if (!Array.isArray(obj.graves)) errs.push('graves must be array');
  else obj.graves.forEach((g, i) => errs.push(...checkGrave(g, i)));
  if (!Array.isArray(obj.cobwebs)) errs.push('cobwebs must be array');
  if (!Array.isArray(obj.haunted)) errs.push('haunted must be array');
  if (!Array.isArray(obj.plots)) errs.push('plots must be array');
  return { ok: errs.length === 0, errors: errs };
}
