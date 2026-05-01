// src/components/StepBrands.jsx
import { useState, useEffect, useMemo } from 'react';
import { ALL_BRANDS, BIG3 } from '../data/masterData.js';
import { createZuperClient } from '../api/client.js';

// Safe name extraction for any Zuper category shape
function safeName(c) {
  if (!c) return '';
  if (typeof c === 'string') return c;
  return String(
    c.category_name || c.name || c.label || c.title ||
    Object.values(c).find(v => typeof v === 'string' && v.length > 0) || ''
  );
}

// Category color by keyword
const CAT_COLORS = [
  { kw: 'shin', color: '#4f58f0', bg: '#eef0ff' },
  { kw: 'vent', color: '#059669', bg: '#ecfdf5' },
  { kw: 'gutter', color: '#0284c7', bg: '#e0f2fe' },
  { kw: 'under', color: '#7c3aed', bg: '#f5f3ff' },
  { kw: 'flash', color: '#b45309', bg: '#fef3c7' },
  { kw: 'nail', color: '#dc2626', bg: '#fef2f2' },
  { kw: 'ice', color: '#0891b2', bg: '#ecfeff' },
  { kw: 'drip', color: '#6d28d9', bg: '#ede9fe' },
  { kw: 'ridge', color: '#d97706', bg: '#fffbeb' },
  { kw: 'sidin', color: '#166534', bg: '#f0fdf4' },
  { kw: 'deck', color: '#92400e', bg: '#fef3c7' },
  { kw: 'start', color: '#1d4ed8', bg: '#eff6ff' },
];
function catStyle(name) {
  const n = name.toLowerCase();
  const match = CAT_COLORS.find(c => n.includes(c.kw));
  return match ? { color: match.color, bg: match.bg } : { color: '#374151', bg: '#f3f4f6' };
}

export default function StepBrands({ conn, onNext, onBack }) {
  const [search,      setSearch]      = useState('');
  const [selected,    setSelected]    = useState(new Set());
  const [zuperCats,   setZuperCats]   = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [showAllCats, setShowAllCats] = useState(false);

  useEffect(() => {
    if (!conn) return;
    createZuperClient(conn.region, conn.apiKey)
      .getAllProductCategories()
      .then(cats => {
        // Normalise: extract name strings from whatever shape the API returns
        const safe = (Array.isArray(cats) ? cats : [])
          .map(c => {
            const n = safeName(c);
            return n ? { _name: n, _raw: c } : null;
          })
          .filter(Boolean);
        setZuperCats(safe);
      })
      .catch(() => setZuperCats([]))
      .finally(() => setLoadingCats(false));
  }, []);

  const filtered = useMemo(
    () => ALL_BRANDS.filter(b => b.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const toggle    = b => { const s = new Set(selected); s.has(b) ? s.delete(b) : s.add(b); setSelected(s); };
  const selectAll = ()  => setSelected(new Set(filtered));
  const clearAll  = ()  => setSelected(new Set());

  const visibleCats = showAllCats ? zuperCats : zuperCats.slice(0, 12);

  return (
    <div className="page">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: 'var(--text)' }}>
          Select brands to import
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
          Choose manufacturer brands to bring into Zuper. Search and click tiles to select —
          your selections persist as you search.
        </p>
      </div>

      {/* Zuper categories section - shown prominently */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>
              Zuper product categories
              {!loadingCats && (
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-3)', marginLeft: 8 }}>
                  ({zuperCats.length} found in your account)
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              These are the existing categories in your Zuper account that products will be mapped to
            </div>
          </div>
        </div>

        {loadingCats ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="shimmer" style={{ height: 32, width: 120, borderRadius: 6, background: 'var(--bg-3)' }} />
            ))}
          </div>
        ) : zuperCats.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 0' }}>
            No product categories found in your Zuper account yet
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {visibleCats.map((c, i) => {
                const n = c._name;
                const { color, bg } = catStyle(n);
                return (
                  <div key={i} style={{
                    padding: '5px 12px', borderRadius: 6,
                    background: bg, border: `1px solid ${color}22`,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: color, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color }}>{n}</span>
                  </div>
                );
              })}
            </div>
            {zuperCats.length > 12 && (
              <button
                className="btn btn-outline btn-sm"
                style={{ marginTop: 10 }}
                onClick={() => setShowAllCats(v => !v)}
              >
                {showAllCats ? `Show fewer` : `Show all ${zuperCats.length} categories`}
              </button>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Brand tile grid */}
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', alignItems: 'center' }}>
            <input
              className="input"
              placeholder="Search brands…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-outline btn-sm" onClick={selectAll}>Select all</button>
            <button className="btn btn-outline btn-sm" onClick={clearAll}>Clear</button>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              No brands match "{search}"
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(138px, 1fr))', gap: 10 }}>
              {filtered.map(brand => {
                const isSel = selected.has(brand);
                const isBig = BIG3.includes(brand);
                return (
                  <div
                    key={brand}
                    onClick={() => toggle(brand)}
                    style={{
                      padding: '14px 12px', borderRadius: 12, cursor: 'pointer',
                      border: isSel ? '2px solid var(--accent)' : '1.5px solid var(--border-2)',
                      background: isSel ? 'var(--accent-light)' : 'var(--bg-2)',
                      transition: 'all 0.15s', position: 'relative', userSelect: 'none',
                      boxShadow: isSel ? '0 2px 8px rgba(79,88,240,0.15)' : 'var(--shadow-sm)',
                    }}
                  >
                    {isBig && (
                      <span className="badge badge-amber" style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, padding: '1px 5px' }}>
                        Big 3
                      </span>
                    )}
                    {isSel && (
                      <div style={{
                        position: 'absolute', top: 8, left: 8, width: 16, height: 16, borderRadius: '50%',
                        background: 'var(--accent)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700,
                      }}>✓</div>
                    )}
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, marginBottom: 10,
                      background: isSel ? 'rgba(79,88,240,0.15)' : 'var(--bg-4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)',
                      color: isSel ? 'var(--accent)' : 'var(--text-3)',
                    }}>
                      {brand.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{
                      fontSize: 12, lineHeight: 1.35,
                      fontWeight: isSel ? 600 : 500,
                      color: isSel ? 'var(--accent)' : 'var(--text)',
                    }}>
                      {brand}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Selected brands</span>
              {selected.size > 0 && <span className="badge badge-accent">{selected.size}</span>}
            </div>
            {selected.size === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '4px 0', lineHeight: 1.5 }}>
                Click tiles on the left to select brands you want to import
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[...selected].map(b => (
                  <div key={b} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 4,
                        background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)',
                      }}>
                        {b.substring(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{b}</span>
                    </div>
                    <button
                      onClick={() => toggle(b)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={onBack}>← Back</button>
            <button
              className="btn btn-primary"
              disabled={selected.size === 0}
              onClick={() => onNext([...selected], zuperCats.map(c => c._raw || c))}
              style={{ flex: 1 }}
            >
              Continue ({selected.size}) →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
