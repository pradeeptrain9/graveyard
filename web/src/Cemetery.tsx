import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import type { Graveyard, Grave } from './types.js';
import { buildLayout } from './layout.js';
import type { StoneLayout, PlotLayout } from './layout.js';

interface Props {
  graveyard: Graveyard;
  onSelectGrave: (grave: Grave) => void;
  selectedId: string | null;
}

const LANTERN_RADIUS = 170;
const PAD = 28;
const SKY = 120; // horizon band above the plots: moon (HEAD) + haunted houses (churn)

// Fresh stones are pale; old ones darken and go green (bucket = age, see layout.ts)
const GRANITE: [string, string][] = [
  ['#d3d5e8', '#9597b0'],
  ['#b4b6cd', '#7c7f98'],
  ['#989bb2', '#666a80'],
  ['#7f8598', '#505868'],
  ['#6c7380', '#3e4a46'],
];

export default function Cemetery({ graveyard, onSelectGrave, selectedId }: Props) {
  const layout = useMemo(() => buildLayout(graveyard), [graveyard]);
  const gravesById = useMemo(() => new Map(graveyard.graves.map((g) => [g.id, g])), [graveyard]);
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
    const svgEl = svgRef.current;
    const ctm = svgEl?.getScreenCTM();
    if (!svgEl || !ctm) return;
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    setLantern({ x: p.x, y: p.y });
  }, []);

  const handleMouseLeave = useCallback(() => setLantern(null), []);

  const handleStoneActivate = useCallback((graveId: string) => {
    const grave = gravesById.get(graveId);
    if (grave) onSelectGrave(grave);
  }, [gravesById, onSelectGrave]);

  const viewW = layout.totalWidth + PAD * 2;
  const viewH = layout.totalHeight + SKY + PAD;

  return (
    <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewW} ${viewH}`}
        width="100%"
        style={{ display: 'block', cursor: 'crosshair', maxHeight: '74vh', minWidth: 720, borderRadius: 8 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="group"
        aria-label={`Cemetery for ${graveyard.repo}: ${graveyard.graves.length} graves`}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#04050d" />
            <stop offset="55%" stopColor="#10132c" />
            <stop offset="100%" stopColor="#1d1734" />
          </linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#141221" />
            <stop offset="100%" stopColor="#090a10" />
          </linearGradient>
          <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1b26" />
            <stop offset="100%" stopColor="#11160f" />
          </linearGradient>
          <radialGradient id="moon-glow">
            <stop offset="0%" stopColor="#f6efcf" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f6efcf" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="moss" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5d8a45" stopOpacity="0.7" />
            <stop offset="45%" stopColor="#5d8a45" stopOpacity="0" />
          </linearGradient>
          {GRANITE.map(([top, bottom], i) => (
            <linearGradient key={i} id={`granite-${i}`} x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor={top} />
              <stop offset="100%" stopColor={bottom} />
            </linearGradient>
          ))}
          <filter id="fog-noise" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.009 0.035" numOctaves="3" seed="13" />
            <feColorMatrix values="0 0 0 0 0.72  0 0 0 0 0.78  0 0 0 0 0.95  0 0 0 2.6 -1.25" />
          </filter>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="lantern-glow" cx={lantern?.x ?? 0} cy={lantern?.y ?? 0} r={LANTERN_RADIUS} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffb75e" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ffb75e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lantern-soft" cx={lantern?.x ?? 0} cy={lantern?.y ?? 0} r={LANTERN_RADIUS} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff" />
            <stop offset={prefersReducedMotion ? '100%' : '60%'} stopColor="#fff" />
            <stop offset="100%" stopColor="#8a8a8a" />
          </radialGradient>
          {/* Outside the lantern the scene drops to ~55% luminance: dim, still readable */}
          <mask id="lantern-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={viewW} height={viewH}>
            <rect width={viewW} height={viewH} fill="#8a8a8a" />
            {lantern && <circle cx={lantern.x} cy={lantern.y} r={LANTERN_RADIUS} fill="url(#lantern-soft)" />}
          </mask>
        </defs>

        <g mask={lantern ? 'url(#lantern-mask)' : undefined}>
          <rect width={viewW} height={viewH} fill="url(#sky)" />
          <rect y={SKY - 14} width={viewW} height={viewH - SKY + 14} fill="url(#ground)" />

          <Moon cx={viewW - 80} cy={56} sha={graveyard.headSha} date={graveyard.headDate} />
          <HauntedRow houses={graveyard.haunted} x0={PAD} baseline={SKY - 14} maxW={viewW - PAD * 2 - 170} />

          {layout.plots.map((plot, i) => (
            <PlotGroup
              key={plot.dir}
              idx={i}
              plot={plot}
              offsetX={PAD}
              offsetY={SKY}
              gravesById={gravesById}
              onActivate={handleStoneActivate}
              selectedId={selectedId}
            />
          ))}
        </g>

        {lantern && (
          <circle cx={lantern.x} cy={lantern.y} r={LANTERN_RADIUS} fill="url(#lantern-glow)" style={{ mixBlendMode: 'screen', pointerEvents: 'none' }} />
        )}
      </svg>

      <Legend />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizon: moon = HEAD commit, houses = top-10 churn
// ---------------------------------------------------------------------------

function Moon({ cx, cy, sha, date }: { cx: number; cy: number; sha: string; date: string }) {
  const label = `HEAD ${sha.slice(0, 7)} · ${date.slice(0, 10)}`;
  return (
    <g role="img" aria-label={`Moon: ${label}`}>
      <title>{label}</title>
      <circle cx={cx} cy={cy} r={70} fill="url(#moon-glow)" />
      <circle cx={cx} cy={cy} r={26} fill="#f1ead0" />
      <circle cx={cx - 8} cy={cy - 6} r={5} fill="#000" opacity={0.07} />
      <circle cx={cx + 9} cy={cy + 7} r={3.5} fill="#000" opacity={0.07} />
      <circle cx={cx + 4} cy={cy - 12} r={2.5} fill="#000" opacity={0.06} />
      <text x={cx} y={cy + 44} fontSize={10} textAnchor="middle" fill="#a9a6c4" fontFamily="monospace" aria-hidden="true">
        {label}
      </text>
    </g>
  );
}

function HauntedRow({ houses, x0, baseline, maxW }: {
  houses: Graveyard['haunted']; x0: number; baseline: number; maxW: number;
}) {
  if (houses.length === 0) return null;
  const max = Math.max(...houses.map((h) => h.commits90d));
  const step = Math.min(56, maxW / houses.length);
  const w = step - 12;
  return (
    <g role="list" aria-label="Haunted houses: most-changed files in the last 90 days">
      {houses.map((h, i) => {
        const bodyH = 18 + 46 * (h.commits90d / max); // taller = more churn
        const x = x0 + i * step;
        const top = baseline - bodyH;
        const roof = w * 0.55;
        const lit = Math.min(h.authors, 4); // lit windows = distinct authors
        const label = `${h.path}: ${h.commits90d} commits, ${h.authors} author${h.authors === 1 ? '' : 's'}`;
        return (
          <g key={h.path} role="listitem" aria-label={label}>
            <title>{label}</title>
            <path d={`M ${x} ${baseline} V ${top} L ${x + w / 2} ${top - roof} L ${x + w} ${top} V ${baseline} Z`} fill="#07070f" stroke="#2c2846" strokeWidth={1} />
            {Array.from({ length: lit }, (_, k) => (
              <rect key={k} x={x + 5 + (k % 2) * (w - 16)} y={top + 6 + Math.floor(k / 2) * 12} width={6} height={7} fill="#ffcf5c" opacity={0.9} filter="url(#glow)" />
            ))}
            <rect x={x + w / 2 - 3.5} y={baseline - 10} width={7} height={10} fill="#1d1a2e" />
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Plot: fenced soil, fog = share of dead files
// ---------------------------------------------------------------------------

interface PlotGroupProps {
  idx: number;
  plot: PlotLayout;
  offsetX: number;
  offsetY: number;
  gravesById: Map<string, Grave>;
  onActivate: (id: string) => void;
  selectedId: string | null;
}

function PlotGroup({ idx, plot, offsetX, offsetY, gravesById, onActivate, selectedId }: PlotGroupProps) {
  const { width, height, fog } = plot;
  const clip = `plot-clip-${idx}`;
  const fogOpacity = fog > 0 ? Math.min(0.6, 0.12 + fog * 0.5) : 0;
  const posts = Math.floor(width / 14);

  return (
    <g transform={`translate(${plot.x + offsetX},${plot.y + offsetY})`} role="group" aria-label={`Plot ${plot.dir}, ${Math.round(fog * 100)}% of files dead`}>
      <clipPath id={clip}><rect width={width} height={height} rx={4} /></clipPath>
      <rect width={width} height={height} rx={4} fill="url(#soil)" stroke="#262438" />

      {fogOpacity > 0 && (
        <g clipPath={`url(#${clip})`} style={{ pointerEvents: 'none' }}>
          <rect className="fog" x={-60} y={height * 0.25} width={width + 120} height={height * 0.75} filter="url(#fog-noise)" opacity={fogOpacity} />
        </g>
      )}

      <text x={12} y={20} fontSize={15} fill="#cfcbe6" fontFamily="var(--font-display)" aria-hidden="true">
        {plot.dir === '.' ? '(root)' : `${plot.dir}/`}
      </text>
      {fog > 0 && (
        <text x={width - 12} y={20} fontSize={10.5} fill="#a9a6c4" textAnchor="end" aria-hidden="true">
          {Math.round(fog * 100)}% dead
        </text>
      )}

      {plot.stones.map((stone) => {
        const grave = gravesById.get(stone.graveId);
        return grave ? (
          <Stone key={stone.graveId} stone={stone} grave={grave} onActivate={onActivate} selected={stone.graveId === selectedId} />
        ) : null;
      })}

      {/* Low front fog layer drifts over the stone bases */}
      {fogOpacity > 0 && (
        <g clipPath={`url(#${clip})`} style={{ pointerEvents: 'none' }}>
          <rect className="fog fog-front" x={-60} y={height * 0.6} width={width + 120} height={height * 0.4} filter="url(#fog-noise)" opacity={fogOpacity * 0.35} />
        </g>
      )}

      {/* Front iron fence */}
      <g aria-hidden="true" stroke="#3b3656" strokeWidth={1.4} style={{ pointerEvents: 'none' }}>
        <line x1={4} y1={height - 15} x2={width - 4} y2={height - 15} />
        <line x1={4} y1={height - 6} x2={width - 4} y2={height - 6} />
        {Array.from({ length: posts }, (_, k) => {
          const px = 7 + k * 14;
          return <path key={k} d={`M ${px} ${height - 3} V ${height - 19} l -2 3 M ${px} ${height - 19} l 2 3`} fill="none" />;
        })}
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Stone: shape = kind, height + colour + moss = age, ghost = haunted, web = cobweb
// ---------------------------------------------------------------------------

interface StoneProps {
  stone: StoneLayout;
  grave: Grave;
  onActivate: (id: string) => void;
  selected: boolean;
}

const KIND_LABEL: Record<Grave['kind'], string> = {
  file: 'Dead file',
  export: 'Unused export',
  dependency: 'Unused dependency',
};

function stonePath(kind: Grave['kind'], x: number, y: number, w: number, h: number): string {
  if (kind === 'export') {
    // Cross
    const bw = w * 0.34, cx = x + w / 2, armY = y + Math.min(h * 0.28, 14), armH = Math.max(6, h * 0.16), armW = w * 0.86;
    return `M ${cx - bw / 2} ${y + h} V ${armY + armH} H ${cx - armW / 2} V ${armY} H ${cx - bw / 2} V ${y} H ${cx + bw / 2} V ${armY} H ${cx + armW / 2} V ${armY + armH} H ${cx + bw / 2} V ${y + h} Z`;
  }
  if (kind === 'dependency') {
    // Obelisk
    const base = w * 0.62, top = w * 0.36, cx = x + w / 2, tip = Math.min(10, h * 0.3);
    return `M ${cx - base / 2} ${y + h} L ${cx - top / 2} ${y + tip} L ${cx} ${y} L ${cx + top / 2} ${y + tip} L ${cx + base / 2} ${y + h} Z`;
  }
  // Headstone
  const r = Math.min(w / 2, h * 0.6, 18);
  return `M ${x} ${y + h} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h} Z`;
}

function shortName(g: Grave): string {
  const n = g.name ?? g.path.split('/').pop() ?? g.path;
  return n.length > 8 ? `${n.slice(0, 7)}…` : n;
}

function Stone({ stone, grave, onActivate, selected }: StoneProps) {
  const { x, y, width: w, height: h, bucket, haunted, cobwebs, graveId } = stone;
  const d = stonePath(grave.kind, x, y, w, h);
  const who = grave.name ? `${grave.name} in ${grave.path}` : grave.path;
  const label = `${KIND_LABEL[grave.kind]}: ${who}, untouched ${grave.ageDays} days${haunted ? ', haunted' : ''}${cobwebs > 0 ? `, ${cobwebs} cobweb${cobwebs === 1 ? '' : 's'}` : ''}`;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate(graveId);
    }
  };

  return (
    <g
      className={`stone${selected ? ' selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onActivate(graveId)}
      onKeyDown={handleKey}
    >
      <title>{label}</title>
      <ellipse cx={x + w / 2} cy={y + h} rx={w * 0.58} ry={3.5} fill="#0b0a07" opacity={0.9} />
      <path className="stone-body" d={d} fill={`url(#granite-${bucket})`} stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
      {bucket >= 3 && <path d={d} fill="url(#moss)" style={{ pointerEvents: 'none' }} />}
      {bucket >= 3 && (
        <path d={`M ${x + w * 0.55} ${y + 6} l -3 ${h * 0.2} l 4 ${h * 0.15} l -2 ${h * 0.2}`} stroke="rgba(0,0,0,0.35)" strokeWidth={0.9} fill="none" aria-hidden="true" />
      )}
      {grave.kind === 'file' && h >= 38 && (
        <text x={x + w / 2} y={y + h * 0.58} fontSize={7.5} textAnchor="middle" fill="rgba(18,18,30,0.65)" fontFamily="var(--font-display)" aria-hidden="true">
          {shortName(grave)}
        </text>
      )}
      {cobwebs > 0 && <Web x={x + w} y={y} s={grave.kind === 'file' ? 13 : 10} />}
      {haunted && <Ghost cx={x + w / 2} y={y - 19} />}
    </g>
  );
}

function Web({ x, y, s }: { x: number; y: number; s: number }) {
  const angles = [0, 22.5, 45, 67.5, 90].map((a) => (a * Math.PI) / 180);
  const pt = (r: number, a: number) => `${x - r * Math.cos(a)},${y + r * Math.sin(a)}`;
  return (
    <g stroke="#dfe2f3" strokeWidth={0.6} fill="none" opacity={0.75} aria-hidden="true" style={{ pointerEvents: 'none' }}>
      {angles.map((a, i) => <line key={i} x1={x} y1={y} x2={x - s * Math.cos(a)} y2={y + s * Math.sin(a)} />)}
      {[0.35, 0.65, 0.95].map((f) => <polyline key={f} points={angles.map((a) => pt(s * f, a)).join(' ')} />)}
    </g>
  );
}

function Ghost({ cx, y }: { cx: number; y: number }) {
  return (
    <g className="ghost" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <path
        d={`M ${cx - 7} ${y + 16} V ${y + 7} A 7 7 0 0 1 ${cx + 7} ${y + 7} V ${y + 16} l -2.33 -3 l -2.33 3 l -2.34 -3 l -2.33 3 l -2.33 -3 l -2.34 3 Z`}
        fill="#eef2ff"
        opacity={0.88}
        filter="url(#glow)"
      />
      <ellipse cx={cx - 2.5} cy={y + 7} rx={1.2} ry={1.7} fill="#1a1630" />
      <ellipse cx={cx + 2.5} cy={y + 7} rx={1.2} ry={1.7} fill="#1a1630" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

const ICON = { width: 18, height: 18, viewBox: '0 0 18 18', 'aria-hidden': true } as const;

function Legend() {
  return (
    <ul className="legend" aria-label="Cemetery legend">
      <li><svg {...ICON}><path d={stonePath('file', 3, 2, 12, 15)} fill="#9799b2" /></svg>Headstone = dead file</li>
      <li><svg {...ICON}><path d={stonePath('export', 3, 2, 12, 15)} fill="#9799b2" /></svg>Cross = unused export</li>
      <li><svg {...ICON}><path d={stonePath('dependency', 3, 2, 12, 15)} fill="#9799b2" /></svg>Obelisk = unused dependency</li>
      <li><svg {...ICON}><path d="M 3 16 V 9 L 9 3 L 15 9 V 16 Z" fill="#07070f" stroke="#6d6890" /><rect x="5" y="9" width="3" height="3" fill="#ffcf5c" /></svg>House = top-10 churn (height = commits, lit windows = authors)</li>
      <li><svg {...ICON}><circle cx="9" cy="8" r="5" fill="#eef2ff" /></svg>Ghost = dead code in a churning file</li>
      <li><svg {...ICON}><g stroke="#dfe2f3" strokeWidth="0.8" fill="none"><line x1="16" y1="2" x2="2" y2="2" /><line x1="16" y1="2" x2="16" y2="16" /><line x1="16" y1="2" x2="5" y2="13" /><polyline points="8,2 11,7 16,9" /></g></svg>Cobweb = TODO/FIXME/HACK ≥ 180 days</li>
      <li><span aria-hidden="true" style={{ fontSize: 14 }}>🌫</span>Fog = % of plot's files dead</li>
      <li><span aria-hidden="true" style={{ fontSize: 14 }}>↕</span>Taller, darker, mossier = older</li>
      <li><svg {...ICON}><circle cx="9" cy="9" r="6" fill="#f1ead0" /></svg>Moon = HEAD commit</li>
    </ul>
  );
}
