/**
 * Integration test for exorcise.ts — Task 10.2
 * - dirty tree refused (exit 3)
 * - creates branch + one commit, no push
 * - file, dependency, export exorcism
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { exorcise, ExorciseError, EXIT_DIRTY } from '../src/exorcise.js';
import { graveId } from '../src/build.js';
import type { Graveyard, Grave } from '../src/schema.js';
import { schemaVersion } from '../src/schema.js';
import { isClean } from '../src/git.js';

const execFile = promisify(_execFile);

async function git(args: string[], cwd: string, env?: Record<string, string>): Promise<string> {
  const { stdout } = await execFile('git', args, { cwd, env: { ...process.env, ...env } });
  return stdout;
}

const GIT_ENV = {
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@test.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@test.com',
  GIT_AUTHOR_DATE: '2024-01-01T00:00:00Z',
  GIT_COMMITTER_DATE: '2024-01-01T00:00:00Z',
};

async function commit(msg: string, cwd: string): Promise<void> {
  await execFile('git', ['commit', '-m', msg], { cwd, env: { ...process.env, ...GIT_ENV } });
}

function makeGrave(kind: Grave['kind'], path: string, name?: string, line?: number): Grave {
  const id = graveId(kind, path, name);
  return {
    id, kind, path,
    ...(name !== undefined ? { name } : {}),
    ...(line !== undefined ? { line } : {}),
    born: '2024-01-01T00:00:00.000Z',
    lastTouched: '2024-01-01T00:00:00.000Z',
    ageDays: 365,
    author: 'Test',
    lastMessage: 'initial commit',
    epitaph: 'Here lies test.',
  };
}

function makeGraveyard(graves: Grave[]): Graveyard {
  return {
    schemaVersion,
    repo: 'test',
    headSha: 'abc',
    headDate: '2025-01-01T00:00:00.000Z',
    scannedAt: '2025-01-01T00:00:00.000Z',
    graves,
    cobwebs: [],
    haunted: [],
    plots: [],
  };
}

let repoDir: string;

beforeAll(async () => {
  repoDir = await mkdtemp(join(tmpdir(), 'graveyard-exorcise-'));
  await git(['init', '-b', 'main'], repoDir);
  await git(['config', 'user.email', 'test@test.com'], repoDir);
  await git(['config', 'user.name', 'Test'], repoDir);

  // Create initial files
  await writeFile(join(repoDir, 'dead.ts'), 'export const x = 1;\n');
  await writeFile(join(repoDir, 'live.ts'), 'export const y = 2;\n');
  await writeFile(join(repoDir, 'exports.ts'), 'export function dead() {}\nexport function live() {}\n');
  await writeFile(join(repoDir, 'package.json'), JSON.stringify({
    name: 'test', version: '1.0.0',
    dependencies: { 'unused-dep': '^1.0.0', 'used-dep': '^2.0.0' },
  }, null, 2) + '\n');
  await git(['add', '.'], repoDir);
  await commit('initial', repoDir);
});

afterAll(async () => {
  await rm(repoDir, { recursive: true, force: true });
});

describe('exorcise — dirty tree refused', () => {
  it('throws ExorciseError with EXIT_DIRTY when tree is dirty', async () => {
    // Dirty the tree
    await writeFile(join(repoDir, 'dirty.txt'), 'dirty\n');
    try {
      const g = makeGraveyard([makeGrave('file', 'dead.ts')]);
      await expect(exorcise(g, graveId('file', 'dead.ts'), repoDir))
        .rejects.toMatchObject({ exitCode: EXIT_DIRTY });
    } finally {
      // Clean up
      await rm(join(repoDir, 'dirty.txt'), { force: true });
    }
  });
});

describe('exorcise — file grave', () => {
  it('creates a branch and commits deletion without pushing', async () => {
    // Reset to main first
    await git(['checkout', 'main'], repoDir);

    const grave = makeGrave('file', 'dead.ts');
    const g = makeGraveyard([grave]);
    await exorcise(g, grave.id, repoDir);

    // Should be on exorcise branch
    const branch = (await git(['branch', '--show-current'], repoDir)).trim();
    expect(branch).toBe(`graveyard/exorcise-${grave.id}`);

    // Exactly 2 commits: initial + exorcise
    const log = (await git(['log', '--oneline'], repoDir)).trim().split('\n');
    expect(log).toHaveLength(2);
    expect(log[0]).toContain('exorcise file dead.ts');

    // No remote pushed
    const remotes = (await git(['branch', '-r'], repoDir)).trim();
    expect(remotes).toBe('');

    // dead.ts gone
    await expect(import('node:fs/promises').then((f) => f.access(join(repoDir, 'dead.ts'))))
      .rejects.toThrow();

    // Switch back
    await git(['checkout', 'main'], repoDir);
  });
});

describe('exorcise — dependency grave', () => {
  it('removes dep from package.json and commits', async () => {
    await git(['checkout', 'main'], repoDir);
    const grave = makeGrave('dependency', 'package.json', 'unused-dep');
    const g = makeGraveyard([grave]);
    await exorcise(g, grave.id, repoDir);

    const { readFile } = await import('node:fs/promises');
    const pkg = JSON.parse(await readFile(join(repoDir, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['unused-dep']).toBeUndefined();
    expect(pkg.dependencies['used-dep']).toBeDefined();

    const log = (await git(['log', '--oneline'], repoDir)).trim().split('\n');
    expect(log[0]).toContain('exorcise dependency unused-dep');

    await git(['checkout', 'main'], repoDir);
  });
});

describe('exorcise — export grave', () => {
  it('removes export keyword from exact line, keeps declaration', async () => {
    await git(['checkout', 'main'], repoDir);
    const grave = makeGrave('export', 'exports.ts', 'dead', 1);
    const g = makeGraveyard([grave]);
    await exorcise(g, grave.id, repoDir);

    const { readFile } = await import('node:fs/promises');
    const content = await readFile(join(repoDir, 'exports.ts'), 'utf8');
    expect(content).toContain('function dead()');
    expect(content).not.toMatch(/^export function dead/m);
    // live export must be untouched
    expect(content).toContain('export function live()');

    await git(['checkout', 'main'], repoDir);
  });
});
