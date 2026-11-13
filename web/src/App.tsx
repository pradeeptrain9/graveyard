import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Graveyard, Grave } from './types.js';
import { validateGraveyard } from './types.js';
import Cemetery from './Cemetery.js';
import Ledger from './Ledger.js';
import Epitaph from './Epitaph.js';

type View = 'cemetery' | 'ledger';

const DEMOS = [
  { label: 'socket.io', file: `${import.meta.env.BASE_URL}demo/socket.io.graveyard.json` },
  { label: 'got', file: `${import.meta.env.BASE_URL}demo/got.graveyard.json` },
  { label: 'chalk', file: `${import.meta.env.BASE_URL}demo/chalk.graveyard.json` },
];

export default function App() {
  const [graveyard, setGraveyard] = useState<Graveyard | null>(null);
  const [view, setView] = useState<View>('cemetery');
  const [selectedGrave, setSelectedGrave] = useState<Grave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [windOn, setWindOn] = useState(false);
  const [dragging, setDragging] = useState(false);
  const windRef = useRef<AudioContext | null>(null);
  const windNodesRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);

  // Load a demo on first render
  useEffect(() => {
    loadUrl(DEMOS[0].file);
  }, []);

  async function loadUrl(url: string) {
    setError(null);
    setLoading(true);
    setSelectedGrave(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: unknown = await res.json();
      ingest(json);
    } catch (e) {
      setError(`Failed to load: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function ingest(json: unknown) {
    const result = validateGraveyard(json);
    if (!result.ok) {
      setError('Invalid graveyard.json:\n' + result.errors.join('\n'));
      return;
    }
    setGraveyard(json as Graveyard);
    setSelectedGrave(null);
    setError(null);
  }

  // File drop / pick
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      ingest(JSON.parse(text));
    } catch {
      setError('Could not parse dropped file as JSON.');
    }
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      ingest(JSON.parse(text));
    } catch {
      setError('Could not parse file as JSON.');
    }
  }, []);

  // Web Audio wind (off by default)
  function toggleWind() {
    if (windOn) {
      windNodesRef.current?.gain.gain.setTargetAtTime(0, windRef.current!.currentTime, 0.3);
      setTimeout(() => {
        windNodesRef.current?.source.stop();
        windNodesRef.current = null;
      }, 1000);
      setWindOn(false);
    } else {
      const ctx = windRef.current ?? new AudioContext();
      windRef.current = ctx;
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      // Pink noise approximation
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.setTargetAtTime(0.15, ctx.currentTime, 0.5);
      // Low-pass filter for wind effect
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      windNodesRef.current = { source, gain };
      setWindOn(true);
    }
  }

  return (
    <div
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        padding: '0.75rem 1.25rem',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}>
        <span style={{ fontSize: '1.4rem', lineHeight: 1 }} role="img" aria-label="graveyard">🪦</span>
        <h1 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '0.03em' }}>
          Graveyard
        </h1>

        {/* Demo picker */}
        <nav aria-label="Demo repos" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {DEMOS.map((d) => (
            <button
              key={d.file}
              onClick={() => loadUrl(d.file)}
              aria-pressed={graveyard?.repo === d.label}
              aria-label={`Load ${d.label} demo`}
              style={{
                background: graveyard?.repo === d.label ? 'var(--color-accent)' : 'rgba(255,255,255,0.07)',
                border: 'none',
                color: graveyard?.repo === d.label ? '#fff' : 'var(--color-moon)',
                padding: '0.3rem 0.8rem',
                borderRadius: '4px',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              {d.label}
            </button>
          ))}
        </nav>

        {/* File drop / pick */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            border: `1px dashed ${dragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: '4px',
            padding: '0.3rem 0.75rem',
            cursor: 'pointer',
            fontSize: '0.8rem',
            color: dragging ? 'var(--color-accent)' : 'var(--color-stone)',
            transition: 'border-color 0.15s, color 0.15s',
          }}
        >
          <span aria-hidden="true">📂</span>
          Drop or pick graveyard.json
          <input type="file" accept=".json" onChange={handleFileInput} style={{ display: 'none' }} aria-label="Upload graveyard.json" />
        </label>

        {/* View toggle */}
        <div role="group" aria-label="View mode" style={{ display: 'flex', gap: '0.3rem', marginInlineStart: 'auto' }}>
          <ViewBtn label="🪦 Cemetery" active={view === 'cemetery'} onClick={() => setView('cemetery')} />
          <ViewBtn label="📋 Ledger" active={view === 'ledger'} onClick={() => setView('ledger')} />
        </div>

        {/* Wind toggle */}
        <button
          onClick={toggleWind}
          aria-pressed={windOn}
          aria-label={windOn ? 'Turn off wind sound' : 'Turn on wind sound'}
          title="Ambient wind sound"
          style={{
            background: windOn ? 'rgba(153,102,255,0.3)' : 'rgba(255,255,255,0.07)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-moon)',
            padding: '0.3rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          🌬
        </button>
      </header>

      {/* Repo meta bar */}
      {graveyard && (
        <div style={{ padding: '0.4rem 1.25rem', background: 'rgba(0,0,0,0.2)', fontSize: '0.78rem', color: 'var(--color-stone)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <span>Repo: <strong style={{ color: 'var(--color-moon)' }}>{graveyard.repo}</strong></span>
          <span>Graves: <strong style={{ color: '#ff6b6b' }}>{graveyard.graves.length}</strong></span>
          <span>Cobwebs: <strong style={{ color: 'var(--color-cobweb)' }}>{graveyard.cobwebs.length}</strong></span>
          <span>Haunted: <strong style={{ color: 'var(--color-haunted)' }}>{graveyard.haunted.length}</strong></span>
          <span>Scanned: {new Date(graveyard.scannedAt).toLocaleString()}</span>
          <span style={{ marginInlineStart: 'auto' }}>HEAD: <code style={{ fontSize: '0.72rem' }}>{graveyard.headSha.slice(0, 8)}</code></span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" style={{ padding: '0.75rem 1.25rem', background: 'rgba(255,100,100,0.15)', color: '#ff9999', fontSize: '0.85rem', whiteSpace: 'pre-wrap', borderBottom: '1px solid rgba(255,100,100,0.3)' }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div aria-live="polite" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-stone)' }}>
          Loading…
        </div>
      )}

      {/* Main content */}
      {graveyard && !loading && (
        <main style={{ flex: 1, padding: '1rem 1.25rem', position: 'relative' }}>
          {view === 'cemetery' && (
            <Cemetery
              graveyard={graveyard}
              onSelectGrave={setSelectedGrave}
              selectedId={selectedGrave?.id ?? null}
            />
          )}
          {view === 'ledger' && (
            <Ledger
              graveyard={graveyard}
              onSelectGrave={setSelectedGrave}
              selectedId={selectedGrave?.id ?? null}
            />
          )}

          {/* Epitaph side panel */}
          <Epitaph
            grave={selectedGrave}
            cobwebs={graveyard.cobwebs}
            onClose={() => setSelectedGrave(null)}
          />
        </main>
      )}

      {/* Empty state */}
      {!graveyard && !loading && !error && (
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--color-stone)' }}>
          <span style={{ fontSize: '3rem' }}>🪦</span>
          <p>Drop a <code>graveyard.json</code> or pick a demo above.</p>
        </main>
      )}

      <style>{`
        @keyframes fog-drift {
          from { transform: translateX(0); opacity: 1; }
          to   { transform: translateX(6px); opacity: 0.85; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
        :focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
        tr:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
      `}</style>
    </div>
  );
}

function ViewBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        background: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.07)',
        border: 'none',
        color: active ? '#fff' : 'var(--color-moon)',
        padding: '0.3rem 0.8rem',
        borderRadius: '4px',
        fontSize: '0.82rem',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
