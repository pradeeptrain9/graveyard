import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { Graveyard, Grave } from './types.js';
import { buildLayout, STONE_HEIGHTS } from './layout.js';
import type { StoneLayout, PlotLayout } from './layout.js';

interface Props {
  graveyard: Graveyard;
  onSelectGrave: (grave: Grave) => void;
  selectedId: string | null;
}

const FOG_COLOR = 'rgba(60,80,160,';
const LANTERN_RADIUS = 160;

export default function Cemetery({ graveyard, onSelectGrave, selectedId }: Props) {
  const layout = buildLayout(graveyard);
  const svgRef = useRef<SVGSVGElement>(null);
  const [lantern, setLantern] = useState<{ x: number; y: number } | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (prefersReducedMotion) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgEl = svgRef.current!;
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svgEl.getScreenCTM()!.inverse());
    setLantern({ x: svgPt.x, y: svgPt.y });
  }, [prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => setLantern(null), []);

  const handleStoneActivate = useCallback((graveId: string) => {
    const grave = graveyard.graves.find((g) => g.id === graveId);
    if (grave) onSelectGrave(grave);
  }, [graveyard.graves, onSelectGrave]);

  const PAD = 24;
  const viewW = layout.totalWidth + PAD * 2;
  const viewH = layout.totalHeight + PAD * 2;

  return (
    <div
      style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}
      aria-label="Cemetery map"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewW} ${viewH}`}
        width="100%"
        style={{ display: 'block', background: 'var(--color-bg)', cursor: 'crosshair', maxHeight: '70vh' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="img"
        aria-label={`Cemetery for ${graveyard.repo}: ${graveyard.graves.length} graves`}
      >
        <defs>
          {/* Lantern mask: bright circle fades to dark */}
          {lantern && (
            <radialGradient id="lantern-grad" cx={lantern.x} cy={lantern.y} r={LANTERN_RADIUS} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="70%" stopColor="white" stopOpacity="0.6" />
              <stop offset="100%" stopColor="white" stopOpacity="0.15" />
            </radialGradient>
          )}
          {!lantern && (
            <radialGradient id="lantern-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
            </radialGradient>
          )}
          <mask id="lantern-mask">
            <rect width={viewW} height={viewH} fill={lantern ? 'rgba(255,255,255,0.18)' : 'white'} />
            {lantern && <circle cx={lantern.x} cy={lantern.y} r={LANTERN_RADIUS} fill="white" />}
          </mask>
        </defs>

        {/* Ground */}
        <rect width={viewW} height={viewH} fill="var(--color-bg)" />

        {/* Plots + stones */}
        <g mask={lantern ? 'url(#lantern-mask)' : undefined}>
          {layout.plots.map((plot) => (
            <PlotGroup
              key={plot.dir}
              plot={plot}
              offsetX={PAD}
              offsetY={PAD}
              onActivate={handleStoneActivate}
              selectedId={selectedId}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </g>
      </svg>

      {/* Legend */}
      <Legend />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plot
// ---------------------------------------------------------------------------

interface PlotGroupProps {
  plot: PlotLayout;
  offsetX: number;
  offsetY: number;
  onActivate: (id: string) => void;
  selectedId: string | null;
  prefersReducedMotion: boolean;
}

function PlotGroup({ plot, offsetX, offsetY, onActivate, selectedId, prefersReducedMotion }: PlotGroupProps) {
  const x = plot.x + offsetX;
  const y = plot.y + offsetY;

  return (
    <g transform={`translate(${x},${y})`} role="group" aria-label={`Plot: ${plot.dir}`}>
      {/* Plot background */}
      <rect
        width={plot.width}
        height={plot.height}
        rx={6}
        fill="rgba(255,255,255,0.025)"
        stroke="var(--color-border)"
        strokeWidth={1}
      />

      {/* Fog overlay */}
      {plot.fog > 0 && (
        <rect
          width={plot.width}
          height={plot.height}
          rx={6}
          fill={`${FOG_COLOR}${(plot.fog * 0.45).toFixed(2)})`}
          style={prefersReducedMotion ? undefined : { animation: `fog-drift 8s ease-in-out infinite alternate` }}
        />
      )}

      {/* Dir label */}
      <text
        x={12}
        y={18}
        fontSize={11}
        fill="var(--color-stone)"
        fontFamily="monospace"
        aria-hidden="true"
      >
        {plot.dir}/
      </text>

      {/* Fog percentage */}
      {plot.fog > 0 && (
        <text x={plot.width - 10} y={18} fontSize={10} fill="var(--color-stone)" textAnchor="end" aria-hidden="true">
          {Math.round(plot.fog * 100)}% dead
        </text>
      )}

      {/* Stones */}
      {plot.stones.map((stone) => (
        <Stone
          key={stone.graveId}
          stone={stone}
          onActivate={onActivate}
          selected={stone.graveId === selectedId}
        />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Stone
// ---------------------------------------------------------------------------

interface StoneProps {
  stone: StoneLayout;
  onActivate: (id: string) => void;
  selected: boolean;
}

const STONE_COLORS: Record<number, string> = {
  0: '#5a5a7a',
  1: '#6e6e90',
  2: '#8282aa',
  3: '#9898c0',
  4: '#b0b0d8',
};

function Stone({ stone, onActivate, selected }: StoneProps) {
  const { x, y, width, height, bucket, haunted, cobwebs, graveId } = stone;
  const fill = STONE_COLORS[bucket];
  const stroke = selected ? 'var(--color-accent)' : (haunted ? 'var(--color-haunted)' : 'rgba(255,255,255,0.1)');
  const strokeW = selected ? 2 : 1;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate(graveId);
    }
  };

  // Rounded top tombstone shape
  const r = Math.min(width / 2, 10);
  const topCurveY = y + r;
  const stonePath = `M ${x} ${y + height} L ${x} ${topCurveY} Q ${x} ${y} ${x + r} ${y} L ${x + width - r} ${y} Q ${x + width} ${y} ${x + width} ${topCurveY} L ${x + width} ${y + height} Z`;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Grave ${graveId}${haunted ? ' (haunted)' : ''}${cobwebs > 0 ? ` (${cobwebs} cobwebs)` : ''}`}
      onClick={() => onActivate(graveId)}
      onKeyDown={handleKey}
      style={{ cursor: 'pointer', outline: 'none' }}
    >
      {/* Focus ring */}
      {selected && (
        <rect
          x={x - 3} y={y - 3}
          width={width + 6} height={height + 6}
          rx={4}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      )}

      {/* Stone body */}
      <path d={stonePath} fill={fill} stroke={stroke} strokeWidth={strokeW} />

      {/* Grave crack (decorative) */}
      {bucket >= 3 && (
        <line
          x1={x + width / 2}
          y1={y + 4}
          x2={x + width / 2 + 4}
          y2={y + height * 0.6}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={1}
        />
      )}

      {/* Cobweb indicator */}
      {cobwebs > 0 && (
        <text x={x + width - 2} y={y + 10} fontSize={8} fill="var(--color-cobweb)" textAnchor="end" aria-hidden="true">
          🕸
        </text>
      )}

      {/* Haunted house fire */}
      {haunted && (
        <text x={x + width / 2} y={y - 4} fontSize={9} textAnchor="middle" aria-hidden="true">
          🔥
        </text>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div
      role="complementary"
      aria-label="Cemetery legend"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.75rem 1rem',
        fontSize: '0.75rem',
        color: 'var(--color-stone)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <LegendItem icon="🪦" label="Unused file / export / dependency" />
      <LegendItem icon="🔥" label="Top-10 most-changed (haunted)" />
      <LegendItem icon="🕸" label="Old TODO/FIXME/HACK (cobweb)" />
      <LegendItem icon="🌫" label="Plot fog = % dead files" />
      <LegendItem icon="↕" label="Stone height = age" />
    </div>
  );
}

function LegendItem({ icon, label }: { icon: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
