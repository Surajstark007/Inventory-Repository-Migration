// src/components/StepFormulas.jsx
//
// PURPOSE: For each line item (Shingles, Hip & Ridge Cap, Starter Strip, etc.)
// the user selects which formula to create in Zuper. Line items are grouped by
// their SRS product category. User can filter by brand to see which categories
// are relevant to their selected brands' products.
//
// WHAT "line item" means:
//   A line item is a proposal output row like "Shingles (SQ)" or "Ridge Vent (PC)".
//   Each line item has:
//     - A human name:     "Shingles"
//     - A product category: "SHINGLES"
//     - An output UOM:    "SQ"
//     - A default formula expression: "(Total Roof Area * (1 + Waste%) / 100)"
//     - Token dependencies: [Total Roof Area, Suggested Waste %]
//     - Alternative formulas the user can pick from
//
// The formula gets created in Zuper and linked to the product later.

import { useState, useMemo } from 'react';
import { PROPOSAL_LINE_ITEMS } from '../data/masterData.js';
import { createZuperClient, buildExpressionMap } from '../api/client.js';

export default function StepFormulas({ conn, brands, tokenData, onNext, onBack }) {
  const [selected,  setSelected]  = useState(() => {
    const s = {};
    PROPOSAL_LINE_ITEMS.forEach(li => { s[li.name] = !!li.formula_expr; }); // pre-select only those with formulas
    return s;
  });
  const [overrides, setOverrides] = useState({});   // li.name → custom formula object
  const [creating,  setCreating]  = useState(false);
  const [results,   setResults]   = useState({});   // li.name → {uid, formula} | {error} | {skipped}
  const [catFilter, setCatFilter] = useState('all');
  const [log,       setLog]       = useState([]);
  const [showLog,   setShowLog]   = useState(false);

  // Group line items by SRS category for display
  const grouped = useMemo(() => {
    const g = {};
    PROPOSAL_LINE_ITEMS.forEach(li => {
      if (!g[li.srs_category]) g[li.srs_category] = [];
      g[li.srs_category].push(li);
    });
    return g;
  }, []);

  const categories = Object.keys(grouped);

  // For a given line item, return the currently active formula
  const getFormula = li => {
    if (overrides[li.name]) return overrides[li.name];
    if (li.relevant_formulas?.length > 0) return li.relevant_formulas[0];
    if (li.formula_expr) return { name: li.name, expression: li.formula_expr, key: li.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), category: 'AREA_MEASUREMENT', description: '' };
    return null;
  };

  function toggleAll(items, val) {
    const s = { ...selected };
    items.forEach(li => { s[li.name] = val; });
    setSelected(s);
  }

  const selCount     = Object.values(selected).filter(Boolean).length;
  const createdCount = Object.values(results).filter(r => r.uid).length;
  const errorCount   = Object.values(results).filter(r => r.error).length;

  const filteredGroups = catFilter === 'all'
    ? grouped
    : Object.fromEntries(Object.entries(grouped).filter(([k]) => k === catFilter));

  const catLabel = c => c.replace(' AND ', ' & ').replace('OTHER ', '').replace('/ALUMINUM/COIL', '').replace('GUTTER/', 'GUTTER/');

  // ── Create all selected formulas in Zuper ───────────────────────────────────
  async function createFormulas() {
    setCreating(true);
    const client     = createZuperClient(conn.region, conn.apiKey);
    const newResults = {};
    const newLog     = [];
    const todo       = PROPOSAL_LINE_ITEMS.filter(li => selected[li.name]);

    for (const li of todo) {
      const formula = getFormula(li);

      if (!formula?.expression) {
        newResults[li.name] = { skipped: true };
        newLog.push(`⏭ ${li.name} — skipped (no formula expression)`);
        continue;
      }

      const { expression, expression_map } = buildExpressionMap(
        formula.expression,
        tokenData?.tokenUids || {}
      );

      const payload = {
        formula_name:        formula.name,
        formula_key:         (formula.key || formula.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')).substring(0, 50),
        formula_category:    formula.category || 'AREA_MEASUREMENT',
        formula_description: formula.description || `Formula for ${li.name}`,
        formula: {
          expression,
          expression_map,
          rounding_mechanism: 'NEXT_WHOLE_NUMBER',
        },
      };

      try {
        const res = await client.createFormula(payload);
        const uid = String(res?.data?.formula_uid || res?.formula_uid || res?.data?.uid || res?.uid || `f-${Date.now()}`);
        newResults[li.name] = { uid, formula };
        newLog.push(`✓ ${li.name} → ${uid.substring(0, 12)}…`);
      } catch (e) {
        const msg = String(e.message || e);
        newResults[li.name] = { error: msg, formula };
        newLog.push(`✗ ${li.name}: ${msg.substring(0, 100)}`);
      }
    }

    setResults(newResults);
    setLog(newLog);
    setShowLog(true);
    setCreating(false);
  }

  return (
    <div className="page">
      {/* Page header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: 'var(--text)' }}>
          Formula mapping
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
          Each <strong>line item</strong> below (Shingles, Hip & Ridge Cap, Starter Strip, etc.)
          needs a formula in Zuper that calculates how much of that product is needed.
          Select the formula for each, then create them all at once.
        </p>

        {/* Brand context */}
        {brands?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 14px', background: 'var(--accent-light)', borderRadius: 8, width: 'fit-content' }}>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Brands selected:</span>
            {brands.map(b => <span key={b} className="badge badge-accent" style={{ fontSize: 11 }}>{b}</span>)}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Main content ── */}
        <div>
          {/* Category filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button className={`pill${catFilter === 'all' ? ' active' : ''}`} onClick={() => setCatFilter('all')}>
              All ({PROPOSAL_LINE_ITEMS.length})
            </button>
            {categories.map(c => (
              <button key={c} className={`pill${catFilter === c ? ' active' : ''}`}
                onClick={() => setCatFilter(catFilter === c ? 'all' : c)}
                style={{ fontSize: 11 }}>
                {catLabel(c)} ({grouped[c].length})
              </button>
            ))}
          </div>

          {/* Select-all bar */}
          <div className="card" style={{ padding: '10px 14px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox"
                checked={selCount === PROPOSAL_LINE_ITEMS.length}
                onChange={e => { const s = {}; PROPOSAL_LINE_ITEMS.forEach(li => s[li.name] = e.target.checked); setSelected(s); }} />
              <span style={{ color: 'var(--text-2)' }}>Select all</span>
            </label>
            <span className="badge badge-accent">{selCount} selected</span>
            {createdCount > 0 && <span className="badge badge-green">✓ {createdCount} created in Zuper</span>}
            {errorCount > 0 && <span className="badge badge-red">{errorCount} errors</span>}
          </div>

          {/* Line items grouped by category */}
          {Object.entries(filteredGroups).map(([cat, items]) => (
            <div key={cat} className="card" style={{ marginBottom: '1rem' }}>
              {/* Category header with bulk checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <input type="checkbox"
                  checked={items.every(i => selected[i.name])}
                  onChange={e => toggleAll(items, e.target.checked)} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                    {catLabel(cat)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                    {items.length} line item{items.length !== 1 ? 's' : ''} · {items.filter(i => selected[i.name]).length} selected
                  </div>
                </div>
              </div>

              {/* Individual line items */}
              {items.map((li, idx) => {
                const formula  = getFormula(li);
                const result   = results[li.name];
                const isSel    = !!selected[li.name];
                const hasForm  = !!formula?.expression;

                return (
                  <div key={li.name} style={{
                    display: 'grid',
                    gridTemplateColumns: '20px 1fr',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none',
                    opacity: isSel ? 1 : 0.45,
                    transition: 'opacity 0.15s',
                  }}>
                    {/* Checkbox */}
                    <div style={{ paddingTop: 3 }}>
                      <input type="checkbox" checked={isSel}
                        onChange={e => setSelected(p => ({ ...p, [li.name]: e.target.checked }))} />
                    </div>

                    {/* Content */}
                    <div>
                      {/* Line item name row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{li.name}</span>
                        <span className="tag">{li.output_uom}</span>
                        {!hasForm && <span className="badge badge-gray">direct input</span>}
                        {result?.uid   && <span className="badge badge-green">✓ Created in Zuper</span>}
                        {result?.skipped && <span className="badge badge-gray">Skipped</span>}
                        {result?.error && (
                          <span className="badge badge-red" title={result.error}>Error</span>
                        )}
                      </div>

                      {/* Measurement token dependencies */}
                      {li.tokens_used?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 2, alignSelf: 'center' }}>uses:</span>
                          {li.tokens_used.map(t => (
                            <span key={t} className="token-chip">{t}</span>
                          ))}
                        </div>
                      )}

                      {/* Formula section */}
                      {hasForm ? (
                        <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '10px 12px' }}>
                          {/* Formula selector dropdown */}
                          {li.relevant_formulas?.length > 1 && (
                            <div style={{ marginBottom: 8 }}>
                              <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                                Formula ({li.relevant_formulas.length} options available)
                              </label>
                              <select className="select"
                                value={formula?.name || ''}
                                onChange={e => {
                                  const f = li.relevant_formulas.find(x => x.name === e.target.value);
                                  if (f) setOverrides(p => ({ ...p, [li.name]: f }));
                                }}>
                                {li.relevant_formulas.map(f => (
                                  <option key={f.key} value={f.name}>{f.name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Formula expression preview */}
                          <div>
                            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>
                              Expression
                            </label>
                            <div className="mono" style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, wordBreak: 'break-all' }}>
                              {formula?.expression || '—'}
                            </div>
                          </div>

                          {/* Error detail */}
                          {result?.error && (
                            <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--red-bg)', borderRadius: 6, fontSize: 11, color: 'var(--red)', lineHeight: 1.5, wordBreak: 'break-all' }}>
                              {result.error.substring(0, 200)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', padding: '6px 0' }}>
                          This line item is entered manually on each job — no formula needed.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Stats + create button */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>
              Formula creation
            </div>
            {[
              ['Total line items', PROPOSAL_LINE_ITEMS.length, ''],
              ['Selected',    selCount, 'accent'],
              ['With formula', PROPOSAL_LINE_ITEMS.filter(li => selected[li.name] && getFormula(li)?.expression).length, 'green'],
              ['Direct input', PROPOSAL_LINE_ITEMS.filter(li => selected[li.name] && !getFormula(li)?.expression).length, 'gray'],
              ['Created ✓',   createdCount, 'blue'],
              ['Errors',      errorCount,   errorCount > 0 ? 'red' : 'gray'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-2)' }}>{l}</span>
                <span className={`badge badge-${c || 'gray'}`}>{v}</span>
              </div>
            ))}

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 14 }}
              disabled={creating || selCount === 0}
              onClick={createFormulas}
            >
              {creating
                ? 'Creating formulas…'
                : `Create ${selCount} formula${selCount !== 1 ? 's' : ''} in Zuper`}
            </button>
          </div>

          {/* What happens note */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--blue-bg)', border: '1px solid var(--blue-border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 6 }}>What happens</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
              Each selected line item creates a formula in Zuper via <span className="mono" style={{ fontSize: 11 }}>POST /formulas</span>.<br /><br />
              The formula's <strong>expression</strong> uses measurement token UIDs so Zuper can calculate quantities from job measurements automatically.
            </div>
          </div>

          {/* Creation log */}
          {log.length > 0 && (
            <div className="card card-sm">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showLog ? 10 : 0 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Log ({log.length})</span>
                <button className="btn btn-outline btn-xs" onClick={() => setShowLog(v => !v)}>
                  {showLog ? 'Hide' : 'Show'}
                </button>
              </div>
              {showLog && (
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {log.map((l, i) => (
                    <div key={i} style={{
                      fontSize: 11, fontFamily: 'var(--mono)', padding: '4px 0',
                      borderBottom: '1px solid var(--border)',
                      color: l.startsWith('✓') ? 'var(--green)' : l.startsWith('✗') ? 'var(--red)' : 'var(--text-3)',
                      wordBreak: 'break-all', lineHeight: 1.5,
                    }}>
                      {l}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={onBack}>← Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onNext(results)}>
              {createdCount > 0 ? 'Continue →' : 'Skip →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
