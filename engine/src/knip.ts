import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const execFile = promisify(_execFile);

// ---------------------------------------------------------------------------
// Knip JSON output types (what knip emits with --reporter json)
// Two shapes exist: "legacy" (flat top-level arrays) and "issues" (per-file array)
// ---------------------------------------------------------------------------

// Legacy shape (knip < 5.x)
interface KnipLegacyExportResult {
  file: string;
  identifier: string;
  line?: number;
}

interface KnipLegacyDepResult {
  name: string;
}

interface KnipLegacyOutput {
  files?: Array<{ file: string } | string>;
  exports?: KnipLegacyExportResult[];
  types?: KnipLegacyExportResult[];
  dependencies?: KnipLegacyDepResult[];
  devDependencies?: KnipLegacyDepResult[];
  unlisted?: KnipLegacyDepResult[];
}

// Issues shape (knip 5.x+)
interface KnipIssueEntry {
  name: string;
  line?: number;
  col?: number;
  pos?: number;
}

interface KnipIssueFile {
  file: string;
  exports?: KnipIssueEntry[];
  types?: KnipIssueEntry[];
  dependencies?: KnipIssueEntry[];
  devDependencies?: KnipIssueEntry[];
  optionalPeerDependencies?: KnipIssueEntry[];
  unlisted?: KnipIssueEntry[];
}

interface KnipIssuesOutput {
  /** flat string array in the issues shape */
  files?: string[];
  issues?: KnipIssueFile[];
}

// ---------------------------------------------------------------------------
// Partial grave (before git facts are merged in)
// ---------------------------------------------------------------------------

export interface PartialGrave {
  kind: 'file' | 'export' | 'dependency';
  path: string;
  name?: string;
  line?: number;
}

// ---------------------------------------------------------------------------
// Adapt knip JSON → PartialGrave[]
// ---------------------------------------------------------------------------

export function adaptKnip(raw: unknown): PartialGrave[] {
  if (typeof raw !== 'object' || raw === null) return [];
  const obj = raw as Record<string, unknown>;
  const results: PartialGrave[] = [];

  // Detect shape: issues-based (knip 5.x+) vs legacy flat arrays
  const isIssuesShape = Array.isArray(obj.issues);

  if (isIssuesShape) {
    // --- Issues shape ---
    const o = obj as KnipIssuesOutput;

    // files: flat string array
    for (const f of o.files ?? []) {
      if (typeof f === 'string' && f.length > 0) {
        results.push({ kind: 'file', path: normPath(f) });
      }
    }

    // per-file issues
    for (const issue of o.issues ?? []) {
      const filePath = normPath(issue.file);

      for (const e of [...(issue.exports ?? []), ...(issue.types ?? [])]) {
        if (typeof e.name === 'string' && e.name.length > 0) {
          results.push({
            kind: 'export',
            path: filePath,
            name: e.name,
            line: typeof e.line === 'number' ? e.line : undefined,
          });
        }
      }

      for (const d of [
        ...(issue.dependencies ?? []),
        ...(issue.devDependencies ?? []),
        ...(issue.optionalPeerDependencies ?? []),
        ...(issue.unlisted ?? []),
      ]) {
        if (typeof d.name === 'string' && d.name.length > 0) {
          results.push({ kind: 'dependency', path: 'package.json', name: d.name });
        }
      }
    }
  } else {
    // --- Legacy flat shape ---
    const knip = obj as KnipLegacyOutput;

    for (const f of knip.files ?? []) {
      const p = typeof f === 'string' ? f : f.file;
      if (typeof p === 'string' && p.length > 0) {
        results.push({ kind: 'file', path: normPath(p) });
      }
    }

    for (const e of [...(knip.exports ?? []), ...(knip.types ?? [])]) {
      if (typeof e.file === 'string' && typeof e.identifier === 'string') {
        results.push({
          kind: 'export',
          path: normPath(e.file),
          name: e.identifier,
          line: typeof e.line === 'number' ? e.line : undefined,
        });
      }
    }

    for (const d of [
      ...(knip.dependencies ?? []),
      ...(knip.devDependencies ?? []),
      ...(knip.unlisted ?? []),
    ]) {
      if (typeof d.name === 'string' && d.name.length > 0) {
        results.push({ kind: 'dependency', path: 'package.json', name: d.name });
      }
    }
  }

  // Deduplicate by kind+path+name
  const seen = new Set<string>();
  return results.filter((g) => {
    const key = `${g.kind}|${g.path}|${g.name ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Run knip in a repo
// ---------------------------------------------------------------------------

export interface KnipRunError extends Error {
  stderr: string;
}

export async function runKnip(repoPath: string): Promise<PartialGrave[]> {
  // Resolve the knip binary from this package's node_modules
  const require = createRequire(import.meta.url);
  let knipBin: string;
  try {
    // Look for knip binary relative to this module
    const knipPkg = require.resolve('knip/package.json');
    const knipDir = path.dirname(knipPkg);
    const knipMeta = JSON.parse(
      await import('node:fs').then((fs) =>
        fs.promises.readFile(path.join(knipDir, 'package.json'), 'utf8'),
      ),
    ) as { bin?: Record<string, string> | string };
    const binEntry =
      typeof knipMeta.bin === 'object'
        ? knipMeta.bin['knip']
        : knipMeta.bin;
    knipBin = path.resolve(knipDir, binEntry ?? 'bin/knip.js');
  } catch {
    // Fall back to system knip
    knipBin = 'knip';
  }

  let stdout = '';
  let stderr = '';

  try {
    const result = await execFile(
      process.execPath,
      [knipBin, '--reporter', 'json', '--no-exit-code'],
      {
        cwd: repoPath,
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, NO_COLOR: '1' },
      },
    );
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    // knip exits non-zero when it finds issues; that's normal
    stdout = e.stdout ?? '';
    stderr = e.stderr ?? '';

    if (!stdout.trim()) {
      const error = new Error(
        `knip failed: ${stderr.trim() || String(err)}`,
      ) as KnipRunError;
      (error as KnipRunError).stderr = stderr;
      throw error;
    }
  }

  let json: unknown;
  try {
    json = JSON.parse(stdout);
  } catch {
    const error = new Error(`knip produced non-JSON output: ${stdout.slice(0, 200)}`) as KnipRunError;
    (error as KnipRunError).stderr = stderr;
    throw error;
  }

  return adaptKnip(json);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}
