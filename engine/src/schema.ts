export const schemaVersion = 1 as const;

export type GraveKind = 'file' | 'export' | 'dependency';

export interface Grave {
  /** sha1(kind + '\0' + path + '\0' + (name ?? '')).slice(0, 10) */
  id: string;
  kind: GraveKind;
  /** repo-relative, forward slashes */
  path: string;
  /** export or dependency name */
  name?: string;
  /** exports only, 1-based */
  line?: number;
  /** ISO UTC — first commit that added `path` */
  born: string;
  /** ISO UTC — last commit touching `path` */
  lastTouched: string;
  /** floor(HEAD commit date − lastTouched in days), always >= 0 */
  ageDays: number;
  author: string;
  /** first line only, max 120 chars */
  lastMessage: string;
  epitaph: string;
}

export interface Cobweb {
  id: string;
  path: string;
  line: number;
  tag: 'TODO' | 'FIXME' | 'HACK';
  /** trimmed, max 140 chars */
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
  /** top-level dir; '.' for root files */
  dir: string;
  /** tracked JS/TS files in dir */
  files: number;
  /** distinct paths with a grave */
  deadFiles: number;
  /** deadFiles / files, 0..1, 2 decimals */
  fog: number;
}

export interface Graveyard {
  schemaVersion: 1;
  repo: string;
  headSha: string;
  headDate: string;
  scannedAt: string;
  /** sorted by path, kind, name */
  graves: Grave[];
  /** sorted by path, line */
  cobwebs: Cobweb[];
  /** sorted by commits90d desc, path asc */
  haunted: HauntedHouse[];
  /** sorted by dir */
  plots: Plot[];
}

// ---------------------------------------------------------------------------
// Validation (Task 2.2)
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
  if (typeof g !== 'object' || g === null) {
    return [`graves[${idx}]: not an object`];
  }
  const o = g as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id.length === 0) errs.push(`graves[${idx}].id missing`);
  if (!['file', 'export', 'dependency'].includes(o.kind as string))
    errs.push(`graves[${idx}].kind invalid: ${String(o.kind)}`);
  if (typeof o.path !== 'string' || o.path.length === 0) errs.push(`graves[${idx}].path missing`);
  if (!isIso(o.born)) errs.push(`graves[${idx}].born not ISO: ${String(o.born)}`);
  if (!isIso(o.lastTouched)) errs.push(`graves[${idx}].lastTouched not ISO`);
  if (typeof o.ageDays !== 'number' || o.ageDays < 0) errs.push(`graves[${idx}].ageDays invalid`);
  if (typeof o.author !== 'string') errs.push(`graves[${idx}].author missing`);
  if (typeof o.lastMessage !== 'string') errs.push(`graves[${idx}].lastMessage missing`);
  if (typeof o.epitaph !== 'string') errs.push(`graves[${idx}].epitaph missing`);
  return errs;
}

export function validateGraveyard(json: unknown): ValidationResult {
  const errs: string[] = [];

  if (typeof json !== 'object' || json === null) {
    return { ok: false, errors: ['root is not an object'] };
  }
  const obj = json as Record<string, unknown>;

  if (obj.schemaVersion !== 1) {
    errs.push(`schemaVersion must be 1, got ${String(obj.schemaVersion)}`);
  }
  if (typeof obj.repo !== 'string' || obj.repo.length === 0) errs.push('repo missing');
  if (typeof obj.headSha !== 'string' || obj.headSha.length === 0) errs.push('headSha missing');
  if (!isIso(obj.headDate)) errs.push(`headDate not ISO: ${String(obj.headDate)}`);
  if (!isIso(obj.scannedAt)) errs.push(`scannedAt not ISO`);

  if (!Array.isArray(obj.graves)) {
    errs.push('graves must be an array');
  } else {
    for (let i = 0; i < obj.graves.length; i++) {
      errs.push(...checkGrave(obj.graves[i], i));
    }
  }

  if (!Array.isArray(obj.cobwebs)) errs.push('cobwebs must be an array');
  if (!Array.isArray(obj.haunted)) errs.push('haunted must be an array');
  if (!Array.isArray(obj.plots)) errs.push('plots must be an array');

  return { ok: errs.length === 0, errors: errs };
}
