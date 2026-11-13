/**
 * Property 7 — layout: no two stone rectangles intersect; all stones inside their plot.
 * We test the pure layout logic by reimplementing it inline (web package is not a dep of engine).
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Minimal layout reimplementation (mirrors web/src/layout.ts)
// ---------------------------------------------------------------------------

const CELL_W = 56;
const CELL_H = 72;
const PLOT_PAD = 24;
const PLOT_HEADER = 28;
const COLS_PER_PLOT = 6;

const STONE_HEIGHTS = [20, 28, 38, 50, 64];

function heightBucket(ageDays: number): number {
  return Math.min(4, Math.floor(Math.log2(ageDays / 30 + 1)));
}

interface Rect { x: number; y: number; w: number; h: number }

function layoutStones(ageDaysList: number[]): Rect[] {
  const stones: Rect[] = [];
  let col = 0;
  let row = 0;
  for (const ageDays of ageDaysList) {
    const bucket = heightBucket(ageDays);
    const h = STONE_HEIGHTS[bucket];
    const w = CELL_W - 8;
    const x = PLOT_PAD + col * CELL_W;
    const y = PLOT_PAD + PLOT_HEADER + row * CELL_H + (CELL_H - h);
    stones.push({ x, y, w, h });
    col++;
    if (col >= COLS_PER_PLOT) { col = 0; row++; }
  }
  return stones;
}

function plotSize(stones: Rect[]): { plotW: number; plotH: number } {
  if (stones.length === 0) return { plotW: COLS_PER_PLOT * CELL_W + PLOT_PAD * 2, plotH: PLOT_HEADER + CELL_H + PLOT_PAD * 2 };
  const maxX = Math.max(...stones.map((s) => s.x + s.w));
  const maxY = Math.max(...stones.map((s) => s.y + s.h));
  return {
    plotW: Math.max(maxX + PLOT_PAD, COLS_PER_PLOT * CELL_W + PLOT_PAD * 2),
    plotH: maxY + PLOT_PAD,
  };
}

function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('Property 7 — layout', () => {
  it('no two stone rectangles intersect', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 3000 }), { minLength: 1, maxLength: 50 }),
        (ageDaysList) => {
          const stones = layoutStones(ageDaysList);
          for (let i = 0; i < stones.length; i++) {
            for (let j = i + 1; j < stones.length; j++) {
              expect(rectsIntersect(stones[i], stones[j])).toBe(false);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('all stones lie inside their plot bounding box', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 3000 }), { minLength: 1, maxLength: 50 }),
        (ageDaysList) => {
          const stones = layoutStones(ageDaysList);
          const { plotW, plotH } = plotSize(stones);
          for (const s of stones) {
            expect(s.x).toBeGreaterThanOrEqual(0);
            expect(s.y).toBeGreaterThanOrEqual(0);
            expect(s.x + s.w).toBeLessThanOrEqual(plotW);
            expect(s.y + s.h).toBeLessThanOrEqual(plotH);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
