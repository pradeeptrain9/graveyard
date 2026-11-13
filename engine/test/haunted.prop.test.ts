/**
 * Property 5 — haunted houses
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { rankHaunted } from '../src/haunted.js';

describe('Property 5 — haunted', () => {
  it('at most 10 entries returned', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            path: fc.stringMatching(/^[a-z][a-z0-9/._-]{1,20}\.ts$/),
            commits: fc.integer({ min: 1, max: 200 }),
          }),
          { minLength: 0, maxLength: 50 },
        ),
        (entries) => {
          const counts = new Map(entries.map((e) => [e.path, e.commits]));
          const authors = new Map(entries.map((e) => [e.path, new Set(['Alice'])]));
          const result = rankHaunted(counts, authors);
          expect(result.length).toBeLessThanOrEqual(10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sorted by commits90d desc, ties by path asc', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            path: fc.stringMatching(/^[a-z][a-z0-9/._-]{1,20}\.ts$/),
            commits: fc.integer({ min: 1, max: 200 }),
          }),
          { minLength: 2, maxLength: 50 },
        ),
        (entries) => {
          const counts = new Map(entries.map((e) => [e.path, e.commits]));
          const authors = new Map<string, Set<string>>();
          const result = rankHaunted(counts, authors);

          for (let i = 0; i < result.length - 1; i++) {
            const a = result[i];
            const b = result[i + 1];
            if (a.commits90d === b.commits90d) {
              expect(a.path.localeCompare(b.path)).toBeLessThanOrEqual(0);
            } else {
              expect(a.commits90d).toBeGreaterThan(b.commits90d);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no non-haunted file has more commits than the last haunted one', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            path: fc.stringMatching(/^[a-z][a-z0-9/._-]{1,20}\.ts$/),
            commits: fc.integer({ min: 1, max: 200 }),
          }),
          { minLength: 11, maxLength: 50 },
        ),
        (entries) => {
          const counts = new Map(entries.map((e) => [e.path, e.commits]));
          const authors = new Map<string, Set<string>>();
          const result = rankHaunted(counts, authors);

          if (result.length < 10) return; // fewer unique paths than 10

          const minHauntedCommits = result[result.length - 1].commits90d;
          const hauntedPaths = new Set(result.map((h) => h.path));

          for (const [p, c] of counts) {
            if (!hauntedPaths.has(p)) {
              expect(c).toBeLessThanOrEqual(minHauntedCommits);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
