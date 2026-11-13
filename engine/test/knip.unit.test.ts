/**
 * Unit tests for adaptKnip() against fixtures.
 * Task 4.2
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptKnip } from '../src/knip.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): unknown {
  const raw = readFileSync(join(__dirname, 'fixtures', name), 'utf8');
  return JSON.parse(raw);
}

describe('adaptKnip()', () => {
  it('extracts files, exports, types and dependencies from sample fixture', () => {
    const json = loadFixture('knip-sample.json');
    const graves = adaptKnip(json);

    const files = graves.filter((g) => g.kind === 'file');
    const exports = graves.filter((g) => g.kind === 'export');
    const deps = graves.filter((g) => g.kind === 'dependency');

    expect(files).toHaveLength(2);
    expect(exports).toHaveLength(3); // 2 exports + 1 type
    expect(deps).toHaveLength(2);    // 1 dep + 1 devDep

    expect(files[0].path).toBe('src/legacy/oldHelper.ts');
    expect(files[1].path).toBe('src/utils/unused.ts');

    const deprecatedFn = exports.find((e) => e.name === 'deprecatedFn');
    expect(deprecatedFn).toBeDefined();
    expect(deprecatedFn?.path).toBe('src/lib/core.ts');
    expect(deprecatedFn?.line).toBe(42);

    expect(deps.some((d) => d.name === 'lodash')).toBe(true);
    expect(deps.some((d) => d.name === 'old-testing-lib')).toBe(true);
  });

  it('returns empty array for minimal fixture', () => {
    const json = loadFixture('knip-minimal.json');
    expect(adaptKnip(json)).toHaveLength(0);
  });

  it('handles completely empty / null input gracefully', () => {
    expect(adaptKnip(null)).toHaveLength(0);
    expect(adaptKnip({})).toHaveLength(0);
    expect(adaptKnip([])).toHaveLength(0);
  });

  it('deduplicates identical entries', () => {
    const json = {
      files: [{ file: 'src/dupe.ts' }, { file: 'src/dupe.ts' }],
      exports: [],
      dependencies: [],
    };
    const graves = adaptKnip(json);
    expect(graves.filter((g) => g.path === 'src/dupe.ts')).toHaveLength(1);
  });

  it('normalises Windows backslash paths', () => {
    const json = { files: [{ file: 'src\\windows\\path.ts' }], exports: [], dependencies: [] };
    const graves = adaptKnip(json);
    expect(graves[0].path).toBe('src/windows/path.ts');
  });

  it('strips leading ./ from paths', () => {
    const json = { files: [{ file: './src/relative.ts' }], exports: [], dependencies: [] };
    const graves = adaptKnip(json);
    expect(graves[0].path).toBe('src/relative.ts');
  });
});
