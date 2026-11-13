#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { headInfo, lsFiles, buildHistoryMap, fileHistory, commitsSince, authorsForPath } from './git.js';
import { runKnip } from './knip.js';
import { findCobwebs } from './cobwebs.js';
import { buildGraveyard } from './build.js';
import { exorcise, ExorciseError } from './exorcise.js';
import { validateGraveyard } from './schema.js';
import type { Graveyard } from './schema.js';

const EXIT_OK = 0;
const EXIT_UNEXPECTED = 1;
const EXIT_NOT_GIT = 2;

async function cmdScan(argv: string[]): Promise<void> {
  // graveyard scan [path] [-o output]
  let repoPath = '.';
  let outputFile = 'graveyard.json';

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-o' || argv[i] === '--output') {
      outputFile = argv[++i] ?? 'graveyard.json';
    } else if (!argv[i].startsWith('-')) {
      repoPath = argv[i];
    }
  }

  repoPath = path.resolve(repoPath);

  // Check it's a git repo
  try {
    await fs.access(path.join(repoPath, '.git'));
  } catch {
    console.error(`not a git repository: ${repoPath}`);
    process.exit(EXIT_NOT_GIT);
  }

  console.error(`[graveyard] scanning ${repoPath}…`);

  const head = await headInfo(repoPath);
  const repo = path.basename(repoPath);

  // Build history map in a single pass
  console.error('[graveyard] collecting git history…');
  const historyMap = await buildHistoryMap(repoPath);

  // JS/TS tracked files
  const jsExts = ['*.js', '*.jsx', '*.ts', '*.tsx', '*.mjs', '*.cjs'];
  const trackedFiles = await lsFiles(repoPath, jsExts);

  // Ensure all tracked files have history entries (use --follow as fallback)
  for (const f of trackedFiles) {
    if (!historyMap.has(f)) {
      const h = await fileHistory(f, repoPath).catch(() => null);
      if (h) historyMap.set(f, h);
    }
  }

  // Knip
  console.error('[graveyard] running knip…');
  const partialGraves = await runKnip(repoPath);

  // Also fetch history for grave paths not yet in map
  for (const pg of partialGraves) {
    if (!historyMap.has(pg.path)) {
      const h = await fileHistory(pg.path, repoPath).catch(() => null);
      if (h) historyMap.set(pg.path, h);
    }
  }

  // Cobwebs
  console.error('[graveyard] finding cobwebs…');
  const cobwebs = await findCobwebs(repoPath, head.date);

  // Haunted houses: commits in last 90 days
  const ninetyDaysAgo = new Date(new Date(head.date).getTime() - 90 * 86_400_000).toISOString();
  console.error('[graveyard] computing churn…');
  const commitCounts = await commitsSince(ninetyDaysAgo, repoPath);

  // Collect authors per path (for haunted top 10 only, to keep it fast)
  const authorsByPath = new Map<string, Set<string>>();
  // Sort by count descending, only fetch authors for top 20 candidates
  const topPaths = [...commitCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([p]) => p);
  for (const p of topPaths) {
    const authors = await authorsForPath(p, ninetyDaysAgo, repoPath);
    authorsByPath.set(p, authors);
  }

  const graveyard = buildGraveyard({
    repo,
    headSha: head.sha,
    headDate: head.date,
    partialGraves,
    historyMap,
    cobwebs,
    commitCounts,
    authorsByPath,
    trackedFiles,
  });

  // Atomic write (temp file + rename)
  const absOut = path.resolve(outputFile);
  const tmp = absOut + '.tmp.' + process.pid;
  await fs.writeFile(tmp, JSON.stringify(graveyard, null, 2), 'utf8');
  await fs.rename(tmp, absOut);

  const { graves, cobwebs: cw, haunted } = graveyard;
  console.error(
    `[graveyard] done. ${graves.length} graves, ${cw.length} cobwebs, ${haunted.length} haunted houses → ${absOut}`,
  );
}

async function cmdExorcise(argv: string[]): Promise<void> {
  // graveyard exorcise <id> [path]
  const id = argv[0];
  if (!id) {
    console.error('usage: graveyard exorcise <id> [path]');
    process.exit(EXIT_UNEXPECTED);
  }

  let repoPath = argv[1] ?? '.';
  repoPath = path.resolve(repoPath);

  // Find graveyard.json
  let graveyardJson: Graveyard;
  try {
    const raw = await fs.readFile(path.join(repoPath, 'graveyard.json'), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const result = validateGraveyard(parsed);
    if (!result.ok) {
      console.error('graveyard.json is invalid:\n' + result.errors.join('\n'));
      process.exit(EXIT_UNEXPECTED);
    }
    graveyardJson = parsed as Graveyard;
  } catch (err) {
    console.error(`could not read graveyard.json in ${repoPath}: ${String(err)}`);
    process.exit(EXIT_UNEXPECTED);
  }

  try {
    await exorcise(graveyardJson, id, repoPath);
    console.log(`[graveyard] exorcised ${id}`);
  } catch (err) {
    if (err instanceof ExorciseError) {
      console.error(`[graveyard] error: ${err.message}`);
      process.exit(err.exitCode);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;

  try {
    if (cmd === 'scan') {
      await cmdScan(rest);
    } else if (cmd === 'exorcise') {
      await cmdExorcise(rest);
    } else {
      console.error(`usage: graveyard <scan|exorcise> [options]`);
      process.exit(EXIT_UNEXPECTED);
    }
  } catch (err: unknown) {
    console.error(`[graveyard] unexpected error: ${String(err)}`);
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(EXIT_UNEXPECTED);
  }
}

main();
