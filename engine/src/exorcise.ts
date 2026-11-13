import fs from 'node:fs/promises';
import path from 'node:path';
import type { Graveyard, Grave } from './schema.js';
import { run, isClean } from './git.js';

export const EXIT_DIRTY = 3;
export const EXIT_UNKNOWN_ID = 4;
export const EXIT_UNSAFE_EDIT = 5;

export class ExorciseError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
  ) {
    super(message);
    this.name = 'ExorciseError';
  }
}

/**
 * Exorcise a grave by id from the latest scan.
 * - Refuses if working tree is dirty (exit 3)
 * - Creates branch graveyard/exorcise-<id>
 * - Deletes/edits the artifact and commits; does NOT push
 */
export async function exorcise(
  graveyard: Graveyard,
  id: string,
  repoPath: string,
): Promise<void> {
  const grave = graveyard.graves.find((g) => g.id === id);
  if (!grave) {
    throw new ExorciseError(`id ${id} not found in latest scan`, EXIT_UNKNOWN_ID);
  }

  const clean = await isClean(repoPath);
  if (!clean) {
    throw new ExorciseError('working tree is dirty; commit or stash changes first', EXIT_DIRTY);
  }

  const branch = `graveyard/exorcise-${id}`;
  await run(['checkout', '-b', branch], repoPath);

  try {
    await applyExorcism(grave, repoPath);

    const subject = grave.name ?? grave.path;
    const msg = `chore(graveyard): exorcise ${grave.kind} ${subject}`;
    await run(['commit', '-m', msg], repoPath);
  } catch (err) {
    // Try to restore original branch on failure
    await run(['checkout', '-'], repoPath).catch(() => undefined);
    await run(['branch', '-D', branch], repoPath).catch(() => undefined);
    throw err;
  }
}

async function applyExorcism(grave: Grave, repoPath: string): Promise<void> {
  const absPath = path.join(repoPath, grave.path);

  if (grave.kind === 'file') {
    await run(['rm', grave.path], repoPath);
    return;
  }

  if (grave.kind === 'dependency') {
    await removeDependency(grave.name!, repoPath);
    await run(['add', 'package.json'], repoPath);
    return;
  }

  if (grave.kind === 'export') {
    if (!grave.line) {
      throw new ExorciseError(
        `export grave ${grave.id} has no line number; cannot safely edit`,
        EXIT_UNSAFE_EDIT,
      );
    }
    await removeExportKeyword(absPath, grave.line, grave.path, repoPath);
    return;
  }
}

/** Remove `export` keyword from a specific line. */
async function removeExportKeyword(
  absPath: string,
  lineNumber: number,
  repoRelPath: string,
  repoPath: string,
): Promise<void> {
  const content = await fs.readFile(absPath, 'utf8');
  const lines = content.split('\n');
  const idx = lineNumber - 1;

  if (idx < 0 || idx >= lines.length) {
    throw new ExorciseError(
      `line ${lineNumber} out of range in ${repoRelPath}`,
      EXIT_UNSAFE_EDIT,
    );
  }

  const original = lines[idx];

  // Must start with `export ` or `export default `
  if (/^export default /.test(original)) {
    lines[idx] = original.replace(/^export default /, '');
  } else if (/^export /.test(original)) {
    lines[idx] = original.replace(/^export /, '');
  } else {
    throw new ExorciseError(
      `line ${lineNumber} of ${repoRelPath} does not start with 'export'; refusing to edit`,
      EXIT_UNSAFE_EDIT,
    );
  }

  await fs.writeFile(absPath, lines.join('\n'), 'utf8');
  await run(['add', repoRelPath], repoPath);
}

/** Remove a dependency from the nearest package.json. */
async function removeDependency(name: string, repoPath: string): Promise<void> {
  const pkgPath = path.join(repoPath, 'package.json');
  const raw = await fs.readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw) as Record<string, unknown>;

  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const section = pkg[field] as Record<string, unknown> | undefined;
    if (section && Object.prototype.hasOwnProperty.call(section, name)) {
      delete section[name];
    }
  }

  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}
