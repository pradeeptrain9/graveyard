import { createHash } from 'node:crypto';
import type {
  Grave,
  GraveKind,
  Graveyard,
  Plot,
  Cobweb,
} from './schema.js';
import { schemaVersion } from './schema.js';
import { templateEpitaph } from './epitaph.js';
import { rankHaunted } from './haunted.js';
import type { PartialGrave } from './knip.js';
import type { FileHistoryEntry } from './git.js';

// ---------------------------------------------------------------------------
// ID derivation
// ---------------------------------------------------------------------------

export function graveId(kind: GraveKind, filePath: string, name?: string): string {
  return createHash('sha1')
    .update(`${kind}\0${filePath}\0${name ?? ''}`)
    .digest('hex')
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// Facts bundle passed to buildGraveyard
// ---------------------------------------------------------------------------

export interface GraveyardFacts {
  repo: string;
  headSha: string;
  headDate: string;
  partialGraves: PartialGrave[];
  historyMap: Map<string, FileHistoryEntry>;
  cobwebs: Cobweb[];
  commitCounts: Map<string, number>;
  authorsByPath: Map<string, Set<string>>;
  /** All tracked JS/TS file paths (for plots) */
  trackedFiles: string[];
}

// ---------------------------------------------------------------------------
// Pure build function
// ---------------------------------------------------------------------------

export function buildGraveyard(facts: GraveyardFacts): Graveyard {
  const headMs = new Date(facts.headDate).getTime();

  // 1. Build graves
  const graves: Grave[] = [];
  for (const pg of facts.partialGraves) {
    const hist = facts.historyMap.get(pg.path);
    if (!hist) continue; // skip if no git history (shouldn't happen in practice)

    const ageDays = Math.max(
      0,
      Math.floor((headMs - new Date(hist.last).getTime()) / 86_400_000),
    );

    const grave: Grave = {
      id: graveId(pg.kind, pg.path, pg.name),
      kind: pg.kind,
      path: pg.path,
      ...(pg.name !== undefined ? { name: pg.name } : {}),
      ...(pg.line !== undefined ? { line: pg.line } : {}),
      born: hist.born,
      lastTouched: hist.last,
      ageDays,
      author: hist.author,
      lastMessage: hist.message,
      epitaph: '', // filled below
    };
    grave.epitaph = templateEpitaph(grave);
    graves.push(grave);
  }

  // Sort by path, kind, name
  graves.sort((a, b) => {
    const c = a.path.localeCompare(b.path);
    if (c !== 0) return c;
    const k = a.kind.localeCompare(b.kind);
    if (k !== 0) return k;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });

  // 2. Haunted houses (top 10 by churn)
  const haunted = rankHaunted(facts.commitCounts, facts.authorsByPath);

  // 3. Plots
  const plots = buildPlots(facts.trackedFiles, graves);

  return {
    schemaVersion,
    repo: facts.repo,
    headSha: facts.headSha,
    headDate: facts.headDate,
    scannedAt: new Date().toISOString(),
    graves,
    cobwebs: facts.cobwebs, // already sorted by cobwebs.ts
    haunted,
    plots,
  };
}

// ---------------------------------------------------------------------------
// Plots
// ---------------------------------------------------------------------------

function buildPlots(trackedFiles: string[], graves: Grave[]): Plot[] {
  // Map dir → tracked file count
  const dirFiles = new Map<string, number>();
  for (const f of trackedFiles) {
    const dir = topLevelDir(f);
    dirFiles.set(dir, (dirFiles.get(dir) ?? 0) + 1);
  }

  // Map dir → distinct dead paths
  const dirDead = new Map<string, Set<string>>();
  for (const g of graves) {
    if (g.kind === 'dependency') continue; // deps don't map to a dir
    const dir = topLevelDir(g.path);
    if (!dirDead.has(dir)) dirDead.set(dir, new Set());
    dirDead.get(dir)!.add(g.path);
  }

  const plots: Plot[] = [];
  for (const [dir, files] of dirFiles) {
    const dead = dirDead.get(dir)?.size ?? 0;
    plots.push({
      dir,
      files,
      deadFiles: dead,
      fog: files > 0 ? Math.round((dead / files) * 100) / 100 : 0,
    });
  }

  plots.sort((a, b) => a.dir.localeCompare(b.dir));
  return plots;
}

function topLevelDir(filePath: string): string {
  const slash = filePath.indexOf('/');
  return slash === -1 ? '.' : filePath.slice(0, slash);
}
