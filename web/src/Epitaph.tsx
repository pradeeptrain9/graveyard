import React, { useEffect, useRef } from 'react';
import type { Grave, Cobweb } from './types.js';

interface Props {
  grave: Grave | null;
  cobwebs: Cobweb[];
  onClose: () => void;
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
    });
  } catch { return iso; }
}

export default function Epitaph({ grave, cobwebs, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus close button when panel opens
  useEffect(() => {
    if (grave) closeRef.current?.focus();
  }, [grave?.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && grave) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [grave, onClose]);

  if (!grave) return null;

  const command = `npx graveyard exorcise ${grave.id}`;
  const relatedCobwebs = cobwebs.filter((c) => c.path === grave.path);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // fallback: select text
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Epitaph for ${grave.name ?? grave.path}`}
      ref={panelRef}
      style={{
        position: 'fixed',
        insetInlineEnd: 0,
        insetBlock: 0,
        width: 'min(380px, 100vw)',
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        padding: '1.5rem',
        overflowY: 'auto',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🪦</span>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close epitaph"
          style={{
            background: 'none',
            border: '1px solid var(--color-border)',
            color: 'var(--color-moon)',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '0.85rem',
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Epitaph text */}
      <blockquote
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          lineHeight: 1.6,
          color: 'var(--color-epitaph)',
          borderLeft: '3px solid var(--color-accent)',
          paddingLeft: '0.75rem',
          fontStyle: 'italic',
        }}
      >
        {grave.epitaph}
      </blockquote>

      {/* Facts */}
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 1rem' }}>
        <Fact label="Kind" value={grave.kind} />
        <Fact label="Path" value={grave.path} mono />
        {grave.name && <Fact label="Name" value={grave.name} mono />}
        {grave.line && <Fact label="Line" value={String(grave.line)} />}
        <Fact label="Born" value={fmt(grave.born)} />
        <Fact label="Last touched" value={`${fmt(grave.lastTouched)} (${grave.ageDays} days ago)`} />
        <Fact label="Author" value={grave.author} />
        <Fact label="Last commit" value={`"${grave.lastMessage}"`} />
        <Fact label="ID" value={grave.id} mono />
      </dl>

      {/* Cobwebs on this file */}
      {relatedCobwebs.length > 0 && (
        <section aria-label="Cobwebs in this file">
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--color-stone)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            🕸 Cobwebs ({relatedCobwebs.length})
          </h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {relatedCobwebs.map((c) => (
              <li key={c.id} style={{ fontSize: '0.82rem', color: 'var(--color-moon)', background: 'rgba(255,255,255,0.04)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                <span style={{ color: 'var(--color-haunted)', fontWeight: 600 }}>{c.tag}</span>
                {' '}line {c.line} · {c.ageDays}d · {c.author}
                <div style={{ color: 'var(--color-stone)', marginTop: '2px' }}>{c.text}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Exorcise command */}
      <section aria-label="Exorcise command">
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--color-stone)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ⚡ Exorcise
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <code
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.4)',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.78rem',
              color: 'var(--color-accent)',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {command}
          </code>
          <button
            onClick={copyCommand}
            aria-label="Copy exorcise command"
            title="Copy to clipboard"
            style={{
              background: 'var(--color-accent)',
              border: 'none',
              color: '#fff',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              flexShrink: 0,
            }}
          >
            Copy
          </button>
        </div>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: 'var(--color-stone)' }}>
          Creates a branch <code>graveyard/exorcise-{grave.id}</code> and commits the deletion. No push.
        </p>
      </section>
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt style={{ color: 'var(--color-stone)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: '2px' }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-moon)', fontFamily: mono ? 'monospace' : undefined, overflowWrap: 'anywhere' }}>
        {value}
      </dd>
    </>
  );
}
