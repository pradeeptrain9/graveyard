import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(_execFile);

export class GitError extends Error {
  constructor(
    public readonly cmd: string,
    public readonly stderr: string,
    public readonly exitCode: number | null,
  ) {
    super(`git ${cmd} failed (exit ${exitCode ?? '?'}): ${stderr.trim()}`);
    this.name = 'GitError';
  }
}

/** Run git with the given args in cwd. Returns stdout. */
export async function run(args: string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFile('git', args, { cwd, maxBuffer: 64 * 1024 * 1024 });
    return stdout;
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { stderr?: string; code?: number | string };
    throw new GitError(
      args.join(' '),
      (e.stderr as string | undefined) ?? '',
      typeof e.code === 'number' ? e.code : null,
    );
  }
}

export interface HeadInfo {
  sha: string;
  /** ISO 8601 UTC */
  date: string;
}

/** Returns SHA and author date of HEAD. */
export async function headInfo(cwd: string): Promise<HeadInfo> {
  const out = await run(['log', '-1', '--format=%H%x00%aI', 'HEAD'], cwd);
  const [sha, date] = out.trim().split('\0');
  if (!sha || !date) throw new GitError('log -1', 'unexpected format', null);
  return { sha: sha.trim(), date: toUtcIso(date.trim()) };
}

/** List tracked files matching pathspecs. */
export async function lsFiles(cwd: string, pathspecs: string[] = []): Promise<string[]> {
  const out = await run(['ls-files', '--', ...pathspecs], cwd);
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Returns true if working tree and index are clean. */
export async function isClean(cwd: string): Promise<boolean> {
  const out = await run(['status', '--porcelain'], cwd);
  return out.trim().length === 0;
}

export interface FileHistoryEntry {
  born: string;
  last: string;
  author: string;
  message: string;
}

/**
 * Build a map of path → history from a single git log pass.
 * Uses --name-only over the full history to avoid one log call per file.
 */
export async function buildHistoryMap(cwd: string): Promise<Map<string, FileHistoryEntry>> {
  // Format: NUL-separated: sha, aI, author, subject — then blank line, then paths
  const out = await run(
    ['log', '--format=%H%x00%aI%x00%an%x00%s%x00', '--name-only', '--diff-filter=ACMRD'],
    cwd,
  );

  const map = new Map<string, FileHistoryEntry>();
  const commits: Array<{ sha: string; date: string; author: string; message: string; paths: string[] }> = [];

  let currentCommit: { sha: string; date: string; author: string; message: string } | null = null;
  let inPaths = false;
  const currentPaths: string[] = [];

  for (const raw of out.split('\n')) {
    const line = raw.trim();

    // Header line: sha\0date\0author\0subject\0
    if (line.includes('\0')) {
      if (currentCommit && currentPaths.length > 0) {
        commits.push({ ...currentCommit, paths: [...currentPaths] });
      }
      currentPaths.length = 0;
      inPaths = false;

      const parts = line.split('\0');
      if (parts.length >= 4 && parts[0].length === 40) {
        currentCommit = {
          sha: parts[0],
          date: toUtcIso(parts[1]),
          author: parts[2],
          message: parts[3].slice(0, 120),
        };
        inPaths = true;
      } else {
        currentCommit = null;
      }
      continue;
    }

    if (line === '') {
      inPaths = currentCommit !== null;
      continue;
    }

    if (inPaths && currentCommit && line.length > 0) {
      currentPaths.push(line);
    }
  }
  if (currentCommit && currentPaths.length > 0) {
    commits.push({ ...currentCommit, paths: [...currentPaths] });
  }

  // commits are newest-first; walk all to find born (oldest mention), last (newest)
  // We'll iterate in reverse to find born first
  for (let i = commits.length - 1; i >= 0; i--) {
    const c = commits[i];
    for (const p of c.paths) {
      const existing = map.get(p);
      if (!existing) {
        map.set(p, { born: c.date, last: c.date, author: c.author, message: c.message });
      } else {
        // older commit updates born
        if (c.date < existing.born) {
          map.set(p, { ...existing, born: c.date });
        }
      }
    }
  }

  // Now walk newest-first to set last/author/message
  for (const c of commits) {
    for (const p of c.paths) {
      const existing = map.get(p);
      if (existing && c.date >= existing.last) {
        map.set(p, { ...existing, last: c.date, author: c.author, message: c.message });
      }
    }
  }

  return map;
}

/**
 * Fetch history for a single file using --follow (for renames).
 * Used as fallback for paths missing from the bulk map.
 */
export async function fileHistory(path: string, cwd: string): Promise<FileHistoryEntry | null> {
  const out = await run(
    ['log', '--follow', '--format=%H%x00%aI%x00%an%x00%s', '--', path],
    cwd,
  );
  const lines = out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  const parse = (line: string) => {
    const p = line.split('\0');
    return { sha: p[0], date: toUtcIso(p[1] ?? ''), author: p[2] ?? '', message: (p[3] ?? '').slice(0, 120) };
  };

  const newest = parse(lines[0]);
  const oldest = parse(lines[lines.length - 1]);

  return {
    born: oldest.date,
    last: newest.date,
    author: newest.author,
    message: newest.message,
  };
}

/** Blame a single line in a file. Returns author and committer date. */
export interface BlameInfo {
  author: string;
  /** ISO 8601 UTC */
  date: string;
}

export async function blameLine(path: string, line: number, cwd: string): Promise<BlameInfo> {
  const out = await run(['blame', '-L', `${line},${line}`, '--porcelain', '--', path], cwd);
  let author = 'Unknown';
  let dateStr = new Date(0).toISOString();

  for (const raw of out.split('\n')) {
    const l = raw.trim();
    if (l.startsWith('author ') && !l.startsWith('author-')) {
      author = l.slice(7);
    } else if (l.startsWith('author-time ')) {
      const epoch = parseInt(l.slice(12), 10);
      if (!isNaN(epoch)) dateStr = new Date(epoch * 1000).toISOString();
    }
  }
  return { author, date: dateStr };
}

/**
 * Returns commit count per path over the N days before headDate.
 */
export async function commitsSince(
  sinceDate: string,
  cwd: string,
): Promise<Map<string, number>> {
  // git log --since accepts ISO date
  const out = await run(
    ['log', `--after=${sinceDate}`, '--name-only', '--format=%H', '--diff-filter=ACMRD'],
    cwd,
  );
  const counts = new Map<string, number>();
  let inFiles = false;
  for (const raw of out.split('\n')) {
    const line = raw.trim();
    if (line.length === 40 && /^[0-9a-f]+$/.test(line)) {
      inFiles = true;
      continue;
    }
    if (line === '') { inFiles = false; continue; }
    if (inFiles && line.length > 0) {
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Returns set of distinct authors who touched a path since sinceDate.
 */
export async function authorsForPath(
  path: string,
  sinceDate: string,
  cwd: string,
): Promise<Set<string>> {
  const out = await run(
    ['log', `--after=${sinceDate}`, '--format=%an', '--', path],
    cwd,
  );
  const set = new Set<string>();
  for (const line of out.split('\n')) {
    const a = line.trim();
    if (a) set.add(a);
  }
  return set;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert any ISO 8601 string to UTC Z-format. */
function toUtcIso(s: string): string {
  if (!s) return new Date(0).toISOString();
  try {
    return new Date(s).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}
