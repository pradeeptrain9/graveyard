/**
 * Integration test for git.ts — creates a fixture repo with known commits.
 * Task 3.3
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { headInfo, lsFiles, buildHistoryMap, isClean, fileHistory } from '../src/git.js';

const execFile = promisify(_execFile);

async function git(args: string[], cwd: string, env?: Record<string, string>): Promise<string> {
  const { stdout } = await execFile('git', args, {
    cwd,
    env: { ...process.env, ...env },
  });
  return stdout;
}

let repoDir: string;

const AUTHOR_ENV = {
  GIT_AUTHOR_NAME: 'Test Author',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test Committer',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

/** Create a commit at a specific ISO date */
async function commit(msg: string, dateIso: string, cwd: string): Promise<void> {
  const env = {
    ...AUTHOR_ENV,
    GIT_AUTHOR_DATE: dateIso,
    GIT_COMMITTER_DATE: dateIso,
  };
  await git(['commit', '-m', msg], cwd, env);
}

beforeAll(async () => {
  repoDir = await mkdtemp(join(tmpdir(), 'graveyard-test-'));

  await git(['init', '-b', 'main'], repoDir);
  await git(['config', 'user.email', 'test@example.com'], repoDir);
  await git(['config', 'user.name', 'Test'], repoDir);

  // Commit 1 — 2024-01-01: add alpha.ts and beta.ts
  await writeFile(join(repoDir, 'alpha.ts'), 'export const a = 1;\n');
  await writeFile(join(repoDir, 'beta.ts'), 'export const b = 2;\n');
  await git(['add', '.'], repoDir);
  await commit('feat: add alpha and beta', '2024-01-01T00:00:00Z', repoDir);

  // Commit 2 — 2024-03-15: update beta.ts
  await writeFile(join(repoDir, 'beta.ts'), 'export const b = 99;\n');
  await git(['add', 'beta.ts'], repoDir);
  await commit('fix: update beta', '2024-03-15T12:00:00Z', repoDir);

  // Commit 3 — 2024-06-01: add gamma.ts (HEAD)
  await writeFile(join(repoDir, 'gamma.ts'), 'export const g = 3;\n');
  await git(['add', 'gamma.ts'], repoDir);
  await commit('feat: add gamma', '2024-06-01T00:00:00Z', repoDir);
});

afterAll(async () => {
  await rm(repoDir, { recursive: true, force: true });
});

describe('headInfo()', () => {
  it('returns the HEAD SHA and date', async () => {
    const info = await headInfo(repoDir);
    expect(info.sha).toHaveLength(40);
    expect(info.date).toBe('2024-06-01T00:00:00.000Z');
  });
});

describe('lsFiles()', () => {
  it('lists tracked TS files', async () => {
    const files = await lsFiles(repoDir, ['*.ts']);
    expect(files).toContain('alpha.ts');
    expect(files).toContain('beta.ts');
    expect(files).toContain('gamma.ts');
  });
});

describe('isClean()', () => {
  it('returns true when no uncommitted changes', async () => {
    expect(await isClean(repoDir)).toBe(true);
  });
});

describe('buildHistoryMap()', () => {
  it('tracks born and lastTouched correctly', async () => {
    const map = await buildHistoryMap(repoDir);

    // alpha.ts: born 2024-01-01, last 2024-01-01 (never updated)
    const alpha = map.get('alpha.ts');
    expect(alpha).toBeDefined();
    expect(alpha!.born).toBe('2024-01-01T00:00:00.000Z');
    expect(alpha!.last).toBe('2024-01-01T00:00:00.000Z');

    // beta.ts: born 2024-01-01, last 2024-03-15
    const beta = map.get('beta.ts');
    expect(beta).toBeDefined();
    expect(beta!.born).toBe('2024-01-01T00:00:00.000Z');
    expect(beta!.last).toBe('2024-03-15T12:00:00.000Z');
    expect(beta!.message).toBe('fix: update beta');

    // gamma.ts: born 2024-06-01, last 2024-06-01
    const gamma = map.get('gamma.ts');
    expect(gamma).toBeDefined();
    expect(gamma!.born).toBe('2024-06-01T00:00:00.000Z');
  });
});

describe('fileHistory()', () => {
  it('returns consistent results with buildHistoryMap', async () => {
    const hist = await fileHistory('beta.ts', repoDir);
    expect(hist).not.toBeNull();
    expect(hist!.born).toBe('2024-01-01T00:00:00.000Z');
    expect(hist!.last).toBe('2024-03-15T12:00:00.000Z');
  });
});
