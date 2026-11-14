/**
 * Pure layout engine: Graveyard → stone/plot positions.
 * No I/O, no React — just math. Property test 7 lives in engine/test.
 */
import type { Graveyard, Grave, Plot } from './types.js';

// Cell size in SVG units
export const CELL_W = 56;
const CELL_H = 72;
export const PLOT_PAD = 24;        // padding inside a plot
export const PLOT_GAP = 32;        // gap between plots
export const PLOT_HEADER = 28;     // height of the dir label
export const COLS_PER_PLOT = 6;    // max stones per row

export type HeightBucket = 0 | 1 | 2 | 3 | 4;

/** Map ageDays → height bucket 0..4 (design spec: floor(log2(ageDays/30 + 1))) */
export function heightBucket(ageDays: number): HeightBucket {
  return Math.min(4, Math.floor(Math.log2(ageDays / 30 + 1))) as HeightBucket;
}

export const STONE_HEIGHTS: Record<HeightBucket, number> = {
  0: 20,
  1: 28,
  2: 38,
  3: 50,
  4: 64,
};

export interface StoneLayout {
  graveId: string;
  /** SVG x relative to plot origin */
  x: number;
  /** SVG y (top of stone) relative to plot origin */
  y: number;
  width: number;
  height: number;
  bucket: HeightBucket;
  /** true if this grave's path appears in haunted list */
  haunted: boolean;
  /** number of cobwebs on this path */
  cobwebs: number;
}

export interface PlotLayout {
  dir: string;
  fog: number;
  /** SVG x of plot origin (top-left of bounding box) */
  x: number;
  /** SVG y of plot origin */
  y: number;
  width: number;
  height: number;
  stones: StoneLayout[];
}

export interface CemeteryLayout {
  plots: PlotLayout[];
  totalWidth: number;
  totalHeight: number;
}

export function buildLayout(graveyard: Graveyard): CemeteryLayout {
  const hauntedPaths = new Set(graveyard.haunted.map((h) => h.path));

  // Count cobwebs per path
  const cobwebsByPath = new Map<string, number>();
  for (const c of graveyard.cobwebs) {
    cobwebsByPath.set(c.path, (cobwebsByPath.get(c.path) ?? 0) + 1);
  }

  // Group graves by plot (top-level dir)
  const gravesByPlot = new Map<string, Grave[]>();
  for (const p of graveyard.plots) {
    gravesByPlot.set(p.dir, []);
  }
  for (const g of graveyard.graves) {
    const dir = topLevelDir(g.path);
    if (!gravesByPlot.has(dir)) gravesByPlot.set(dir, []);
    gravesByPlot.get(dir)!.push(g);
  }

  const plots: PlotLayout[] = [];
  let cursorX = 0;
  let maxY = 0;

  // Lay out plots in a wrapping grid (wrap every 3 plots)
  const plotsPerRow = 3;
  let rowX = 0;
  let rowY = 0;
  let rowMaxH = 0;
  let colInRow = 0;

  for (const plotMeta of graveyard.plots) {
    const graves = gravesByPlot.get(plotMeta.dir) ?? [];

    const stones = layoutStones(graves, hauntedPaths, cobwebsByPath);
    const { plotW, plotH } = plotSize(stones);

    if (colInRow > 0 && colInRow >= plotsPerRow) {
      rowY += rowMaxH + PLOT_GAP;
      rowX = 0;
      rowMaxH = 0;
      colInRow = 0;
    }

    plots.push({
      dir: plotMeta.dir,
      fog: plotMeta.fog,
      x: rowX,
      y: rowY,
      width: plotW,
      height: plotH,
      stones,
    });

    rowX += plotW + PLOT_GAP;
    rowMaxH = Math.max(rowMaxH, plotH);
    colInRow++;
  }

  const totalWidth = Math.max(...plots.map((p) => p.x + p.width), 400);
  const totalHeight = Math.max(...plots.map((p) => p.y + p.height), 300);

  return { plots, totalWidth, totalHeight };
}

function layoutStones(
  graves: Grave[],
  hauntedPaths: Set<string>,
  cobwebsByPath: Map<string, number>,
): StoneLayout[] {
  const stones: StoneLayout[] = [];
  let col = 0;
  let row = 0;

  for (const g of graves) {
    const bucket = heightBucket(g.ageDays);
    const h = STONE_HEIGHTS[bucket];
    const w = CELL_W - 8;

    const x = PLOT_PAD + col * CELL_W;
    // Stones sit on the bottom of the row cell
    const y = PLOT_PAD + PLOT_HEADER + row * CELL_H + (CELL_H - h);

    stones.push({
      graveId: g.id,
      x,
      y,
      width: w,
      height: h,
      bucket,
      haunted: hauntedPaths.has(g.path),
      cobwebs: cobwebsByPath.get(g.path) ?? 0,
    });

    col++;
    if (col >= COLS_PER_PLOT) {
      col = 0;
      row++;
    }
  }
  return stones;
}

function plotSize(stones: StoneLayout[]): { plotW: number; plotH: number } {
  if (stones.length === 0) {
    return { plotW: COLS_PER_PLOT * CELL_W + PLOT_PAD * 2, plotH: PLOT_HEADER + CELL_H + PLOT_PAD * 2 };
  }
  const maxX = Math.max(...stones.map((s) => s.x + s.width));
  const maxY = Math.max(...stones.map((s) => s.y + s.height));
  return {
    plotW: Math.max(maxX + PLOT_PAD, COLS_PER_PLOT * CELL_W + PLOT_PAD * 2),
    plotH: maxY + PLOT_PAD,
  };
}

export function topLevelDir(filePath: string): string {
  const slash = filePath.indexOf('/');
  return slash === -1 ? '.' : filePath.slice(0, slash);
}
