import React, { useState, useCallback } from 'react';
import type { Graveyard, Grave, Cobweb, HauntedHouse } from './types.js';

interface Props {
  graveyard: Graveyard;
  onSelectGrave: (grave: Grave) => void;
  selectedId: string | null;
}

type SortKey = 'kind' | 'path' | 'name' | 'ageDays' | 'author' | 'born';
type SortDir = 'asc' | 'desc';

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  } catch { return iso; }
}

export default function Ledger({ graveyard, onSelectGrave, selectedId }: Props) {
  const [tab, setTab] = useState<'graves' | 'cobwebs' | 'haunted'>('graves');
  const [sortKey, setSortKey] = useState<SortKey>('ageDays');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      else setSortDir('desc');
      return key;
    });
  }, []);

  const sortedGraves = [...graveyard.graves].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'kind') cmp = a.kind.localeCompare(b.kind);
    else if (sortKey === 'path') cmp = a.path.localeCompare(b.path);
    else if (sortKey === 'name') cmp = (a.name ?? '').localeCompare(b.name ?? '');
    else if (sortKey === 'ageDays') cmp = a.ageDays - b.ageDays;
    else if (sortKey === 'author') cmp = a.author.localeCompare(b.author);
    else if (sortKey === 'born') cmp = a.born.localeCompare(b.born);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Tabs */}
      <div role="tablist" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <Tab id="tab-graves" label={`Graves (${graveyard.graves.length})`} active={tab === 'graves'} onClick={() => setTab('graves')} />
        <Tab id="tab-cobwebs" label={`Cobwebs (${graveyard.cobwebs.length})`} active={tab === 'cobwebs'} onClick={() => setTab('cobwebs')} />
        <Tab id="tab-haunted" label={`Haunted (${graveyard.haunted.length})`} active={tab === 'haunted'} onClick={() => setTab('haunted')} />
      </div>

      {tab === 'graves' && (
        <div style={{ overflowX: 'auto' }}>
          {sortedGraves.length === 0
            ? <p style={{ color: 'var(--color-stone)', padding: '1rem' }}>No graves found — this codebase is clean! 🎉</p>
            : (
              <table
                role="grid"
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}
                aria-label="Graves table"
              >
                <thead>
                  <tr>
                    <SortTh label="Kind" sortKey="kind" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Path" sortKey="path" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Age (days)" sortKey="ageDays" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Born" sortKey="born" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Author" sortKey="author" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGraves.map((g) => (
                    <tr
                      key={g.id}
                      onClick={() => onSelectGrave(g)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectGrave(g); }}}
                      tabIndex={0}
                      aria-selected={g.id === selectedId}
                      role="row"
                      style={{
                        cursor: 'pointer',
                        background: g.id === selectedId ? 'rgba(153,102,255,0.12)' : 'transparent',
                        outline: 'none',
                      }}
                    >
                      <td style={tdStyle}>
                        <KindBadge kind={g.kind} />
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.76rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={g.path}>{g.path}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.76rem' }}>{g.name ?? '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: ageColor(g.ageDays) }}>{g.ageDays}</td>
                      <td style={tdStyle}>{fmt(g.born)}</td>
                      <td style={{ ...tdStyle, maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={g.author}>{g.author}</td>
                      <td style={tdStyle}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectGrave(g); }}
                          aria-label={`View epitaph for ${g.name ?? g.path}`}
                          style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-moon)', padding: '2px 8px', borderRadius: '3px', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          View 🪦
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}

      {tab === 'cobwebs' && (
        <div style={{ overflowX: 'auto' }}>
          {graveyard.cobwebs.length === 0
            ? <p style={{ color: 'var(--color-stone)', padding: '1rem' }}>No old TODOs found.</p>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }} aria-label="Cobwebs table">
                <thead>
                  <tr>
                    {['Tag', 'Path', 'Line', 'Text', 'Age (days)', 'Author'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {graveyard.cobwebs.map((c) => (
                    <tr key={c.id} style={trStyle}>
                      <td style={tdStyle}><TagBadge tag={c.tag} /></td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.76rem' }}>{c.path}:{c.line}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{c.line}</td>
                      <td style={{ ...tdStyle, maxWidth: '280px', color: 'var(--color-stone)' }}>{c.text}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: ageColor(c.ageDays) }}>{c.ageDays}</td>
                      <td style={tdStyle}>{c.author}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}

      {tab === 'haunted' && (
        <div style={{ overflowX: 'auto' }}>
          {graveyard.haunted.length === 0
            ? <p style={{ color: 'var(--color-stone)', padding: '1rem' }}>No haunted files found.</p>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }} aria-label="Haunted houses table">
                <thead>
                  <tr>
                    {['Path', 'Commits (90d)', 'Authors'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {graveyard.haunted.map((h) => (
                    <tr key={h.path} style={trStyle}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.76rem' }}>{h.path}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-haunted)' }}>{h.commits90d}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{h.authors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Tab({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        background: active ? 'var(--color-surface)' : 'none',
        border: active ? '1px solid var(--color-border)' : '1px solid transparent',
        borderBottom: active ? '1px solid var(--color-surface)' : '1px solid transparent',
        color: active ? 'var(--color-moon)' : 'var(--color-stone)',
        padding: '0.4rem 0.9rem',
        borderRadius: '4px 4px 0 0',
        cursor: 'pointer',
        fontSize: '0.85rem',
      }}
    >
      {label}
    </button>
  );
}

function SortTh({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  const isActive = current === sortKey;
  const ariaSort = !isActive ? 'none' : dir === 'asc' ? 'ascending' : 'descending';
  return (
    <th
      style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}
      aria-sort={ariaSort}
      onClick={() => onSort(sortKey)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSort(sortKey); }}}
    >
      {label} {isActive ? (dir === 'asc' ? '↑' : '↓') : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const colors: Record<string, string> = {
    file: '#ff6b6b',
    export: '#ffd93d',
    dependency: '#6bcb77',
  };
  return (
    <span style={{ background: colors[kind] ?? '#888', color: '#000', padding: '1px 6px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600 }}>
      {kind}
    </span>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const colors: Record<string, string> = { TODO: '#ffd93d', FIXME: '#ff6b6b', HACK: '#ff9f43' };
  return (
    <span style={{ background: colors[tag] ?? '#888', color: '#000', padding: '1px 6px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600 }}>
      {tag}
    </span>
  );
}

function ageColor(days: number): string {
  if (days > 730) return '#ff6b6b';
  if (days > 365) return '#ffd93d';
  return 'var(--color-moon)';
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 10px',
  borderBottom: '1px solid var(--color-border)',
  color: 'var(--color-stone)',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle',
};

const trStyle: React.CSSProperties = {
  background: 'transparent',
};
