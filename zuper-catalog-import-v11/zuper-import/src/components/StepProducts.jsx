// src/components/StepProducts.jsx
import { useState, useEffect, useMemo } from 'react';
import { PROPOSAL_LINE_ITEMS } from '../data/masterData.js';
import { createZuperClient, fetchProductsByBrand, getOrCreateWarehouse } from '../api/client.js';

function prodName(p) { return String(p?.product_name || p?.name || p?.title || ''); }
function prodId(p)   { return String(p?.product_id   || p?.id   || ''); }

export default function StepProducts({ conn, brands, formulaResults, onNext, onBack }) {
  const [activeBrand,   setActiveBrand]   = useState(brands[0] || '');
  const [zuperProds,    setZuperProds]    = useState([]);
  const [supaProds,     setSupaProds]     = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [locationUid,   setLocationUid]   = useState('');   // warehouse UID resolved once
  const [locationName,  setLocationName]  = useState('');
  const [locationError, setLocationError] = useState('');
  const [mappings,      setMappings]      = useState({});
  const [creating,      setCreating]      = useState({});
  const [created,       setCreated]       = useState({});
  const [expanded,      setExpanded]      = useState(new Set());
  const [log,           setLog]           = useState([]);

  // ── Resolve warehouse location once on mount ──────────────────────────────
  useEffect(() => {
    if (!conn) return;
    const client = createZuperClient(conn.region, conn.apiKey);
    getOrCreateWarehouse(client).then(r => r)
      .then(uid => {
        setLocationUid(uid);
        setLocationName(uid ? 'Warehouse' : '');
      })
      .catch(e => {
        setLocationError(String(e.message || e));
      });
  }, [conn]);

  // ── Load products when brand changes ─────────────────────────────────────
  useEffect(() => {
    if (!activeBrand || !conn) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setSupaProds([]);
      setMappings({});

      const client = createZuperClient(conn.region, conn.apiKey);
      const [zp, sp] = await Promise.all([
        client.getProducts().catch(() => []),
        fetchProductsByBrand(activeBrand).catch(() => []),
      ]);
      if (cancelled) return;

      const zpSafe = (Array.isArray(zp) ? zp : []).filter(p => p && typeof p === 'object');
      const spSafe = (Array.isArray(sp) ? sp : []).filter(p => p && typeof p === 'object');
      setZuperProds(zpSafe);
      setSupaProds(spSafe);

      // Auto-map by name similarity
      const auto = {};
      spSafe.forEach(p => {
        const pName = (p.product_name || '').toLowerCase();
        const match = pName.length > 6
          ? zpSafe.find(z => prodName(z).toLowerCase().includes(pName.substring(0, 10)))
          : null;
        auto[p.product_id] = match
          ? { action: 'map',    zuper_prod: match }
          : { action: 'create' };
      });
      setMappings(auto);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [activeBrand, conn]);

  // ── Create a single product ──────────────────────────────────────────────
  async function createProduct(p) {
    if (!locationUid) {
      setLog(prev => [...prev, `✗ No location UID available — resolve location first`]);
      return;
    }
    const client = createZuperClient(conn.region, conn.apiKey);
    setCreating(prev => ({ ...prev, [p.product_id]: true }));
    try {
      const res = await client.createProduct({
        product: {
          product_name:     String(p.product_name || ''),
          product_category: String(p.product_category || ''),
          product_id:       String(p.product_id),
          price:            parseFloat(p.suggested_price || 0),
          // location_uid is REQUIRED — use the resolved warehouse UID
          location_availability: [{
            location:     locationUid,
            quantity:     100,
            min_quantity: 1,
          }],
        },
      });

      const newId = String(
        res?.data?.product_id || res?.data?.uid || res?.data?.id ||
        res?.product_id || p.product_id
      );

      // Link formula if available for this line item
      const li      = PROPOSAL_LINE_ITEMS.find(x => x.srs_category === p.product_category);
      const fResult = li ? (formulaResults || {})[li.name] : null;
      if (fResult?.uid && newId && newId !== String(p.product_id)) {
        await client.linkFormulaToProduct(newId, fResult.uid).catch(() => {});
      }

      setCreated(prev => ({
        ...prev,
        [p.product_id]: { zuper_id: newId, formula_linked: !!fResult?.uid },
      }));
      setLog(prev => [
        ...prev,
        `✓ "${p.product_name}" — $${parseFloat(p.suggested_price || 0).toFixed(2)}`,
      ]);
    } catch (e) {
      const msg = String(e.message || e);
      setCreated(prev => ({ ...prev, [p.product_id]: { error: msg } }));
      setLog(prev => [...prev, `✗ "${p.product_name}": ${msg.substring(0, 100)}`]);
    }
    setCreating(prev => ({ ...prev, [p.product_id]: false }));
  }

  async function createAllPending() {
    const pending = supaProds.filter(p =>
      mappings[p.product_id]?.action === 'create' && !created[p.product_id]
    );
    for (const p of pending) await createProduct(p);
  }

  const grouped = useMemo(() => {
    const g = {};
    supaProds.forEach(p => {
      const cat = String(p.product_category || 'Other');
      if (!g[cat]) g[cat] = [];
      g[cat].push(p);
    });
    return g;
  }, [supaProds]);

  const pendingCount = supaProds.filter(p =>
    mappings[p.product_id]?.action === 'create' && !created[p.product_id]
  ).length;
  const mappedCount  = supaProds.filter(p => mappings[p.product_id]?.action === 'map').length;
  const createdCount = Object.values(created).filter(v => v && !v.error).length;
  const errorCount   = Object.values(created).filter(v => v?.error).length;

  return (
    <div className="page">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: 'var(--text)' }}>
          Product mapping
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
          Match SRS catalog products with your Zuper product library.
          Unmapped products will be created using SRS suggested pricing with formula linked automatically.
        </p>
      </div>

      {/* ── Location banner ── */}
      {locationError ? (
        <div style={{ padding: '14px 18px', borderRadius: 10, background: 'var(--red-bg)', border: '1px solid var(--red-border)', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: 14, marginBottom: 6 }}>
            ⚠ Location error — action required
          </div>
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 10 }}>
            Zuper requires at least one inventory location before products can be created.
            Please add one manually:
          </p>
          <ol style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 2, paddingLeft: 20 }}>
            <li>Log in to your Zuper account</li>
            <li>Go to <strong style={{color:'var(--text)'}}>Settings → Locations → Add Location</strong></li>
            <li>Create a location named <strong style={{color:'var(--text)'}}>Warehouse</strong> (type: Warehouse)</li>
            <li>Come back here and reload the page</li>
          </ol>
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)', wordBreak: 'break-all' }}>
            API error: {locationError}
          </div>
        </div>
      ) : locationUid ? (
        <div style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--green-bg)', border: '1px solid var(--green-border)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ Location resolved</span>
          <span style={{ color: 'var(--text-2)' }}>Products will be assigned to <strong style={{ color: 'var(--text)' }}>{locationName || 'Warehouse'}</strong> (uid: {locationUid.substring(0, 12)}…)</span>
        </div>
      ) : (
        <div style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', marginBottom: '1rem', fontSize: 13 }}>
          <span className="shimmer" style={{ color: 'var(--amber)' }}>Resolving warehouse location…</span>
        </div>
      )}

      {/* ── Brand tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {brands.map(b => (
          <button
            key={b}
            className={`pill${activeBrand === b ? ' active' : ''}`}
            onClick={() => setActiveBrand(b)}
          >
            {b}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>
        {/* ── Main table ── */}
        <div className="card">
          {loading ? (
            <div className="shimmer" style={{ fontSize: 13, color: 'var(--text-2)', padding: '1rem 0' }}>
              Loading products for {activeBrand}…
            </div>
          ) : supaProds.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              No products found for <strong>{activeBrand}</strong> in the SRS catalog
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  <strong style={{ color: 'var(--text)' }}>{supaProds.length}</strong> SRS products
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  <strong style={{ color: 'var(--text)' }}>{zuperProds.length}</strong> already in Zuper
                </span>
              </div>

              {Object.entries(grouped).map(([cat, prods]) => {
                const li         = PROPOSAL_LINE_ITEMS.find(x => x.srs_category === cat);
                const hasFormula = li && (formulaResults || {})[li.name] && !(formulaResults || {})[li.name]?.skipped;
                const isExpanded = expanded.has(cat);
                const shown      = isExpanded ? prods : prods.slice(0, 4);

                return (
                  <div key={cat} style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="section-header" style={{ marginBottom: 0, paddingBottom: 0, border: 'none', fontSize: 11, fontWeight: 700 }}>
                        {cat.replace(' AND ', ' & ')}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{prods.length} products</span>
                      {hasFormula && <span className="badge badge-accent">formula linked</span>}
                    </div>

                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '38%' }}>Product</th>
                          <th style={{ width: '12%' }}>Price</th>
                          <th style={{ width: '32%' }}>Map to existing Zuper product</th>
                          <th style={{ width: '18%' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map(p => {
                          const m          = mappings[p.product_id] || { action: 'create' };
                          const isDone     = created[p.product_id];
                          const isCreating = creating[p.product_id];
                          const selVal     = m.zuper_prod ? (prodId(m.zuper_prod) || '') : '';

                          return (
                            <tr key={p.product_id}>
                              <td>
                                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35, color: 'var(--text)' }}>
                                  {String(p.product_name || '')}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                                  {String(p.manufacturer_norm || '')}
                                  {p.family_tier ? ` · ${p.family_tier}` : ''}
                                </div>
                              </td>

                              <td>
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500 }}>
                                  {p.suggested_price
                                    ? `$${parseFloat(p.suggested_price).toFixed(2)}`
                                    : '—'}
                                </span>
                              </td>

                              <td>
                                <select
                                  className="select"
                                  value={selVal}
                                  onChange={e => {
                                    const found = zuperProds.find(z => prodId(z) === e.target.value);
                                    setMappings(prev => ({
                                      ...prev,
                                      [p.product_id]: found
                                        ? { action: 'map',    zuper_prod: found }
                                        : { action: 'create', zuper_prod: null  },
                                    }));
                                  }}
                                >
                                  <option value="">— create new product —</option>
                                  {zuperProds.map((z, i) => {
                                    const n = prodName(z);
                                    const u = prodId(z);
                                    if (!n) return null;
                                    return <option key={u || i} value={u}>{n}</option>;
                                  })}
                                </select>
                              </td>

                              <td>
                                {isDone && !isDone.error ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <span className="badge badge-green">✓ Created</span>
                                    {isDone.formula_linked && (
                                      <span className="badge badge-accent" style={{ fontSize: 9 }}>formula linked</span>
                                    )}
                                  </div>
                                ) : isDone?.error ? (
                                  <div>
                                    <span className="badge badge-red">Error</span>
                                    <div style={{ fontSize: 9, color: 'var(--red)', marginTop: 2, maxWidth: 140, wordBreak: 'break-word', lineHeight: 1.3 }}>
                                      {isDone.error.substring(0, 80)}
                                    </div>
                                  </div>
                                ) : m.action === 'map' ? (
                                  <span className="badge badge-blue">Mapped</span>
                                ) : (
                                  <button
                                    className="btn btn-primary btn-xs"
                                    onClick={() => createProduct(p)}
                                    disabled={isCreating || !locationUid}
                                    title={!locationUid ? 'Waiting for location…' : ''}
                                  >
                                    {isCreating ? '…' : 'Create'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {prods.length > 4 && (
                      <button
                        className="btn btn-outline btn-xs"
                        style={{ marginTop: 8 }}
                        onClick={() => {
                          const s = new Set(expanded);
                          s.has(cat) ? s.delete(cat) : s.add(cat);
                          setExpanded(s);
                        }}
                      >
                        {expanded.has(cat) ? 'Show fewer ↑' : `Show all ${prods.length} ↓`}
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Location info */}
          <div className="card card-sm">
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>
              Inventory location
            </div>
            {locationUid ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
                  <span className="badge badge-green" style={{ marginRight: 6 }}>✓</span>
                  {locationName || 'Warehouse'}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{locationUid}</div>
              </>
            ) : locationError ? (
              <div style={{ fontSize: 12, color: 'var(--red)' }}>⚠ {locationError.substring(0, 80)}</div>
            ) : (
              <div className="shimmer" style={{ fontSize: 12, color: 'var(--text-3)' }}>Resolving…</div>
            )}
          </div>

          {/* Stats */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>
              {activeBrand}
            </div>
            {[
              ['SRS products', supaProds.length, ''],
              ['Auto-mapped',  mappedCount,       'blue'],
              ['To create',    pendingCount,      'amber'],
              ['Created',      createdCount,      'green'],
              ['Errors',       errorCount,        errorCount > 0 ? 'red' : ''],
            ].map(([l, v, c]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-2)' }}>{l}</span>
                {c
                  ? <span className={`badge badge-${c}`}>{v}</span>
                  : <span style={{ fontWeight: 600, color: 'var(--text)' }}>{v}</span>
                }
              </div>
            ))}

            {pendingCount > 0 && (
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 14 }}
                onClick={createAllPending}
                disabled={!locationUid}
                title={!locationUid ? 'Waiting for warehouse location…' : ''}
              >
                Create all {pendingCount} pending
              </button>
            )}
          </div>

          {/* Log */}
          {log.length > 0 && (
            <div className="card card-sm" style={{ maxHeight: 220, overflowY: 'auto' }}>
              <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Log
              </div>
              {log.map((l, i) => (
                <div key={i} style={{
                  fontSize: 11, fontFamily: 'var(--mono)', padding: '3px 0',
                  borderBottom: '1px solid var(--border)',
                  color: l.startsWith('✓') ? 'var(--green)' : 'var(--red)',
                  wordBreak: 'break-all', lineHeight: 1.4,
                }}>
                  {l}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={onBack}>← Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onNext({ mappings, created })}>
              Finish →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
