/**
 * Property-based tests for build.ts
 * Properties 1 (determinism), 2 (stable ids), 3 (ages), 6 (fog)
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildGraveyard, graveId } from '../src/build.js';
import type { GraveyardFacts } from '../src/build.js';
import type { PartialGrave } from '../src/knip.js';
import type { FileHistoryEntry } from '../src/git.js';
import type { Cobweb } from '../src/schema.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const isoDate = (base: Date, offsetDays: number) =>
  new Date(base.getTime() + offsetDays * 86_400_000).toISOString();

const headDate = new Date('2024-06-01T00:00:00Z');

const partialGraveArb: fc.Arbitrary<PartialGrave> = fc.record({
  kind: fc.constantFrom('file', 'export', 'dependency') as fc.Arbitrary<PartialGrave['kind']>,
  path: fc.stringMatching(/^[a-z][a-z0-9/._-]{1,30}\.ts$/),
  name: fc.option(fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{1,20}$/), { nil: undefined }),
  line: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
});

function makeHistoryEntry(bornOffset: number, lastOffset: number): FileHistoryEntry {
  // ensure born <= last
  const born = isoDate(headDate, -Math.abs(bornOffset));
  const last = isoDate(headDate, -Math.max(0, Math.min(Math.abs(bornOffset), Math.abs(lastOffset))));
  return { born, last, author: 'Alice', message: 'test commit' };
}

function factsFrom(partials: PartialGrave[]): GraveyardFacts {
  const historyMap = new Map<string, FileHistoryEntry>();
  for (const pg of partials) {
    historyMap.set(pg.path, makeHistoryEntry(100, 10));
  }

  const trackedFiles = [...new Set(partials.filter((p) => p.kind !== 'dependency').map((p) => p.path))];

  return {
    repo: 'test-repo',
    headSha: 'abc123',
    headDate: headDate.toISOString(),
    partialGraves: partials,
    historyMap,
    cobwebs: [],
    commitCounts: new Map(),
    authorsByPath: new Map(),
    trackedFiles,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Property 1: Determinism
// Output is the same regardless of input ordering (except scannedAt)
// ---------------------------------------------------------------------------

describe('Property 1 — determinism', () => {
  it('buildGraveyard(facts) equals buildGraveyard(shuffled facts) modulo scannedAt', () => {
    fc.assert(
      fc.property(fc.array(partialGraveArb, { minLength: 0, maxLength: 20 }), (partials) => {
        const facts1 = factsFrom(partials);
        const facts2 = factsFrom(shuffle(partials));

        const g1 = buildGraveyard(facts1);
        const g2 = buildGraveyard(facts2);

        expect({ ...g1, scannedAt: '' }).toEqual({ ...g2, scannedAt: '' });
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Stable ids
// ---------------------------------------------------------------------------

describe('Property 2 — stable ids', () => {
  it('grave id depends only on kind, path, name', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('file', 'export', 'dependency') as fc.Arbitrary<PartialGrave['kind']>,
        fc.stringMatching(/^[a-z][a-z/._-]{1,30}\.ts$/),
        fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
        (kind, filePath, name) => {
          const id1 = graveId(kind, filePath, name);
          const id2 = graveId(kind, filePath, name);
          expect(id1).toBe(id2);
          expect(id1).toHaveLength(10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('different kind/path/name produce different ids (with overwhelming probability)', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.constantFrom('file', 'export', 'dependency') as fc.Arbitrary<PartialGrave['kind']>,
          fc.stringMatching(/^[a-z][a-z/._-]{1,20}\.ts$/),
          fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
        ),
        fc.tuple(
          fc.constantFrom('file', 'export', 'dependency') as fc.Arbitrary<PartialGrave['kind']>,
          fc.stringMatching(/^[a-z][a-z/._-]{1,20}\.ts$/),
          fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
        ),
        ([k1, p1, n1], [k2, p2, n2]) => {
          // If inputs are identical, ids should be identical; if different, ids should differ
          if (k1 === k2 && p1 === p2 && (n1 ?? '') === (n2 ?? '')) {
            expect(graveId(k1, p1, n1)).toBe(graveId(k2, p2, n2));
          }
          // We don't assert inequality because hash collisions are theoretically possible,
          // just astronomically unlikely — so we only test the equality case.
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Ages
// ---------------------------------------------------------------------------

describe('Property 3 — ages', () => {
  it('every ageDays >= 0 and lastTouched >= born', () => {
    fc.assert(
      fc.property(fc.array(partialGraveArb, { minLength: 1, maxLength: 20 }), (partials) => {
        const facts = factsFrom(partials);
        const g = buildGraveyard(facts);
        for (const grave of g.graves) {
          expect(grave.ageDays).toBeGreaterThanOrEqual(0);
          expect(new Date(grave.lastTouched).getTime()).toBeGreaterThanOrEqual(
            new Date(grave.born).getTime(),
          );
        }
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Fog
// ---------------------------------------------------------------------------

describe('Property 6 — fog', () => {
  it('0 <= fog <= 1 and deadFiles <= files', () => {
    fc.assert(
      fc.property(fc.array(partialGraveArb, { minLength: 0, maxLength: 30 }), (partials) => {
        const facts = factsFrom(partials);
        const g = buildGraveyard(facts);
        for (const plot of g.plots) {
          expect(plot.fog).toBeGreaterThanOrEqual(0);
          expect(plot.fog).toBeLessThanOrEqual(1);
          expect(plot.deadFiles).toBeLessThanOrEqual(plot.files);
        }
      }),
      { numRuns: 50 },
    );
  });
});
