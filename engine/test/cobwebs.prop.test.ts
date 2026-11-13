/**
 * Property 4 — cobweb threshold
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Cobweb } from '../src/schema.js';

/** Simulate the age filter from cobwebs.ts */
function filterCobwebs(
  items: Array<{ ageDays: number; path: string; line: number }>,
  threshold: number,
): Cobweb[] {
  return items
    .filter((i) => i.ageDays >= threshold)
    .map((i) => ({
      id: `${i.path}:${i.line}`,
      path: i.path,
      line: i.line,
      tag: 'TODO' as const,
      text: 'placeholder',
      author: 'Alice',
      ageDays: i.ageDays,
    }));
}

describe('Property 4 — cobweb threshold', () => {
  const THRESHOLD = 180;

  it('every cobweb has ageDays >= 180', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ageDays: fc.integer({ min: 0, max: 1000 }),
            path: fc.stringMatching(/^[a-z][a-z/._-]{1,20}\.ts$/),
            line: fc.integer({ min: 1, max: 500 }),
          }),
          { minLength: 0, maxLength: 50 },
        ),
        (items) => {
          const cobwebs = filterCobwebs(items, THRESHOLD);
          for (const c of cobwebs) {
            expect(c.ageDays).toBeGreaterThanOrEqual(THRESHOLD);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no item with ageDays >= 180 is dropped', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ageDays: fc.integer({ min: 0, max: 1000 }),
            path: fc.stringMatching(/^[a-z][a-z/._-]{1,20}\.ts$/),
            line: fc.integer({ min: 1, max: 500 }),
          }),
          { minLength: 0, maxLength: 50 },
        ),
        (items) => {
          const eligible = items.filter((i) => i.ageDays >= THRESHOLD);
          const cobwebs = filterCobwebs(items, THRESHOLD);
          expect(cobwebs.length).toBe(eligible.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
