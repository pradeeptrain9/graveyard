/**
 * Property 8 — epitaph fail-closed
 * An LLM reply containing any number/date/name not in the facts is rejected.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/** Mirrors containsForeignFact from epitaph.ts */
function containsForeignFact(text: string, allowedFacts: Set<string>): boolean {
  const numbers = text.match(/\b\d+\b/g) ?? [];
  for (const n of numbers) {
    if (!allowedFacts.has(n)) {
      let found = false;
      for (const f of allowedFacts) {
        if (f.includes(n)) { found = true; break; }
      }
      if (!found) return true;
    }
  }
  return false;
}

describe('Property 8 — epitaph fail-closed', () => {
  it('a reply with only allowed numbers passes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 9999 }).map(String), { minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 5, maxLength: 100 }).filter((s) => !/\d/.test(s)),
        (allowedNums, baseText) => {
          const allowed = new Set(allowedNums);
          const text = baseText + ' ' + allowedNums.join(' ');
          expect(containsForeignFact(text, allowed)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('a reply with a foreign number is rejected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10000, max: 99999 }).map(String),
        fc.array(fc.integer({ min: 0, max: 9999 }).map(String), { minLength: 0, maxLength: 3 }),
        (foreignNum, allowedNums) => {
          // Ensure foreignNum is not a substring of any allowed fact
          const allowed = new Set(allowedNums.filter((n) => !foreignNum.includes(n) && !n.includes(foreignNum)));
          const text = `Here lies the code. It died ${foreignNum} days ago.`;
          expect(containsForeignFact(text, allowed)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
