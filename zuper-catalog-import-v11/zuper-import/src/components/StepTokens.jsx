// src/components/StepTokens.jsx
//
// WHAT THIS STEP DOES:
// 1. GET existing measurement categories from Zuper
// 2. Show each required token alongside a dropdown of existing Zuper categories
// 3. User maps each token → category (auto-mapped by name where possible)
// 4. Optionally CREATE a new category if no suitable one exists
// 5. Pass { tokenUids } downstream so formulas can reference the right category UIDs
//
// We do NOT create tokens — Zuper's measurement tokens are system-defined.
// We only manage which CATEGORY each token belongs to for formula mapping.

import { useState, useEffect, useMemo } from 'react';
import { MASTER_TOKENS, PROPOSAL_LINE_ITEMS } from '../data/masterData.js';
import { createZuperClient } from '../api/client.js';

function catName(c) {
  if (!c) return '';
  if (typeof c === 'string') return c;
  return String(
    c.measurement_category_name || c.category_name ||
    c.name || c.label || c.title ||
    Object.values(c).find(v => typeof v === 'string' && v.length > 1) || ''
  );
}
function catUid(c) {
  if (!c) return '';
  if (typeof c === 'string') return c;
  return String(c.measurement_category_uid || c.category_uid || c.uid || c.id || '');
}

export default function StepTokens({ conn, onNext, onBack }) {
  const [zuperCats,   setZuperCats]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [catMappings, setCatMappings] = useState({});  // tokenName → catUid
  const [newCatName,  setNewCatName]  = useState('');
  const [perTokenCat, setPerTokenCat] = useState({});  // tokenName → custom new cat name
  const [catStatus,   setCatStatus]   = useState({});  // catName → 'creating'|'done'|'error'
  const [createdCats, setCreatedCats] = useState({});  // name → uid (newly created this session)
  const [debugLog,    setDebugLog]    = useState([]);
  const [showDebug,   setShowDebug]   = useState(false);
  const [rawResp,     setRawResp]     = useState('');

  // All unique tokens the line items require
  const requiredTokens = useMemo(() => {
    const seen = new Map();
    PROPOSAL_LINE_ITEMS.forEach(li =>
      li.tokens_used.forEach(t => {
        if (!seen.has(t)) {
          const mt = MASTER_TOKENS.find(x => x.name === t);
          seen.set(t, { name: t, category: mt?.category || 'Roof Measurements', uom: mt?.uom || '' });
        }
      })
    );
    return [...seen.values()];
  }, []);

  const grouped = useMemo(() => {
    const g = {};
    requiredTokens.forEach(t => {
      if (!g[t.category]) g[t.category] = [];
      g[t.category].push(t);
    });
    return g;
  }, [requiredTokens]);

  // Load existing Zuper categories on mount
  useEffect(() => {
    if (!conn) return;
    createZuperClient(conn.region, conn.apiKey)
      .getMeasurementCategories()
      .then(res => {
        setRawResp(JSON.stringify(res, null, 2).substring(0, 4000));
        let raw = res?.data ?? res;
        if (!Array.isArray(raw)) raw = typeof raw === 'object' && raw ? Object.values(raw) : [];
        const safe = raw.filter(c => c != null && catName(c));
        setZuperCats(safe);
        addDebug(`Loaded ${safe.length} measurement categories from Zuper`);

        // Auto-map tokens to categories by name similarity
        const autoMap = {};
        requiredTokens.forEach(t => {
          const tCat = t.category.toLowerCase();
          const match = safe.find(c => {
            const n = catName(c).toLowerCase();
            return n && (tCat.includes(n.substring(0, 6)) || n.includes(tCat.substring(0, 6)));
          });
          if (match) {
            autoMap[t.name] = catUid(match);
            addDebug(`Auto-mapped "${t.name}" → "${catName(match)}"`);
          }
        });
        setCatMappings(autoMap);
      })
      .catch(e => addDebug(`Error: ${e.message}`))
      .finally(() => setLoading(false));
  }, []);

  function addDebug(msg) {
    setDebugLog(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 60));
  }

  // Create a new category in Zuper (only called when user explicitly needs one)
  async function createCategory(name) {
    if (!name.trim()) return;
    const client = createZuperClient(conn.region, conn.apiKey);
    setCatStatus(p => ({ ...p, [name]: 'creating' }));
    try {
      const res = await client.createMeasurementCategory(name.trim());
      addDebug(`Category create response: ${JSON.stringify(res).substring(0, 200)}`);
      const uid = String(
        res?.data?.measurement_category_uid || res?.data?.category_uid ||
        res?.data?.uid || res?.data?.id ||
        res?.measurement_category_uid || res?.uid || res?.id || ''
      );
      if (!uid) throw new Error(`No UID returned: ${JSON.stringify(res).substring(0, 100)}`);
      const newCat = { measurement_category_uid: uid, measurement_category_name: name.trim() };
      setZuperCats(prev => [...prev, newCat]);
      setCreatedCats(prev => ({ ...prev, [name]: uid }));
      setCatStatus(p => ({ ...p, [name]: 'done' }));
      addDebug(`✓ Created category "${name}" → ${uid.substring(0, 12)}…`);
      return uid;
    } catch (e) {
      addDebug(`ERROR creating category "${name}": ${e.message}`);
      setCatStatus(p => ({ ...p, [name]: 'error' }));
      return null;
    }
  }

  // Build the tokenUids map for downstream steps
  // This maps each token name → { category_uid, category_name }
  // (token_uid is not needed — Zuper resolves tokens by name within a category)
  const tokenUids = useMemo(() => {
    const result = {};
    requiredTokens.forEach(t => {
      const uid = catMappings[t.name];
      if (uid) {
        const cat = zuperCats.find(c => catUid(c) === uid);
        result[t.name] = {
          token_uid:     '',           // Zuper system token — no user-assigned UID
          category_uid:  uid,
          category_name: catName(cat) || t.category,
        };
      }
    });
    return result;
  }, [catMappings, zuperCats, requiredTokens]);

  const mappedCount  = Object.values(catMappings).filter(Boolean).length;
  const allMapped    = mappedCount === requiredTokens.length;
  const unmappedTokens = requiredTokens.filter(t => !catMappings[t.name]);

  return (
    <div className="page">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: 'var(--text)' }}>
          Measurement token mapping
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
          Map each required measurement token to its Zuper category. Zuper's tokens are system-defined —
          you only need to confirm which <strong>category</strong> each belongs to.
          If a category is missing, create it here.
        </p>
      </div>

      {/* Summary banner */}
      {!loading && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: '1rem', fontSize: 13,
          background: allMapped ? 'var(--green-bg)' : 'var(--amber-bg)',
          border: `1px solid ${allMapped ? 'var(--green-border)' : 'var(--amber-border)'}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontWeight: 600, color: allMapped ? 'var(--green)' : 'var(--amber)' }}>
            {allMapped ? `✓ All ${requiredTokens.length} tokens mapped` : `${mappedCount} of ${requiredTokens.length} tokens mapped`}
          </span>
          {!allMapped && (
            <span style={{ color: 'var(--text-2)' }}>
              {unmappedTokens.length} still need a category selected
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Main mapping table ── */}
        <div className="card">
          {loading ? (
            <div className="shimmer" style={{ fontSize: 13, color: 'var(--text-2)', padding: '1rem 0' }}>
              Loading measurement categories from Zuper…
            </div>
          ) : (
            Object.entries(grouped).map(([masterCat, tokens]) => (
              <div key={masterCat} style={{ marginBottom: '2rem' }}>
                <div className="section-header">{masterCat}</div>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Token (system-defined)</th>
                      <th style={{ width: '10%' }}>UOM</th>
                      <th style={{ width: '40%' }}>Map to Zuper category</th>
                      <th style={{ width: '15%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map(t => {
                      const mapped = catMappings[t.name];
                      const mappedCat = mapped ? zuperCats.find(c => catUid(c) === mapped) : null;
                      return (
                        <tr key={t.name} style={{ background: mapped ? 'rgba(5,150,105,0.025)' : 'transparent' }}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{t.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontStyle: 'italic' }}>
                              Zuper system token
                            </div>
                          </td>
                          <td><span className="tag">{t.uom}</span></td>
                          <td>
                            <select
                              className="select"
                              value={catMappings[t.name] || ''}
                              onChange={e => setCatMappings(p => ({ ...p, [t.name]: e.target.value }))}
                            >
                              <option value="">— select category —</option>
                              {zuperCats.map((c, i) => {
                                const n = catName(c); const u = catUid(c);
                                if (!n) return null;
                                return <option key={u || i} value={u}>{n}</option>;
                              })}
                            </select>
                          </td>
                          <td>
                            {mapped ? (
                              <span className="badge badge-green">✓ Mapped</span>
                            ) : (
                              <span className="badge badge-amber">Unmapped</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>

        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Create new category */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 8 }}>
              Create new category
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.5 }}>
              If the category you need doesn't exist in Zuper yet, create it here.
              It will appear in the dropdowns above immediately.
            </p>
            <input
              className="input"
              placeholder="e.g. Roof Measurements"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && newCatName.trim() && createCategory(newCatName).then(() => setNewCatName(''))}
            />
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={!newCatName.trim() || catStatus[newCatName] === 'creating'}
              onClick={() => createCategory(newCatName).then(uid => { if (uid) setNewCatName(''); })}
            >
              {catStatus[newCatName] === 'creating' ? 'Creating…' : '+ Create category'}
            </button>
            {catStatus[newCatName] === 'error' && (
              <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>
                Failed to create — check the debug log for details
              </div>
            )}

            {/* Newly created this session */}
            {Object.keys(createdCats).length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created this session</div>
                {Object.entries(createdCats).map(([name, uid]) => (
                  <div key={name} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ color: 'var(--green)', fontWeight: 500 }}>✓ {name}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{uid.substring(0, 10)}…</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>Summary</div>
            {[
              ['Required tokens',   requiredTokens.length,  ''],
              ['Zuper categories',  zuperCats.length,        'blue'],
              ['Mapped',            mappedCount,             'green'],
              ['Unmapped',          requiredTokens.length - mappedCount, requiredTokens.length - mappedCount > 0 ? 'amber' : 'gray'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-2)' }}>{l}</span>
                <span className={`badge badge-${c || 'gray'}`}>{v}</span>
              </div>
            ))}
            <div style={{ margin: '14px 0 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}>
                <span>Progress</span><span>{mappedCount} / {requiredTokens.length}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${requiredTokens.length > 0 ? (mappedCount / requiredTokens.length) * 100 : 0}%` }} />
              </div>
            </div>
          </div>

          {/* Info box */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--blue-bg)', border: '1px solid var(--blue-border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 5 }}>How this works</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
              Zuper measurement tokens (Total Roof Area, etc.) are <strong>system-defined</strong> — they can't be created via API.<br /><br />
              You're only selecting which <strong>category</strong> each token lives under, so formulas can reference the correct category UID.
            </div>
          </div>

          {/* Debug log */}
          <div className="card card-sm">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showDebug ? 10 : 0 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Debug log ({debugLog.length})</span>
              <button className="btn btn-outline btn-xs" onClick={() => setShowDebug(v => !v)}>{showDebug ? 'Hide' : 'Show'}</button>
            </div>
            {showDebug && (
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {debugLog.map((e, i) => (
                  <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid var(--border)', fontSize: 10, display: 'flex', gap: 6 }}>
                    <span style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)', flexShrink: 0 }}>{e.time}</span>
                    <span style={{ color: e.msg.startsWith('ERROR') ? 'var(--red)' : e.msg.startsWith('✓') ? 'var(--green)' : 'var(--text-2)', wordBreak: 'break-all', fontFamily: 'var(--mono)' }}>{e.msg}</span>
                  </div>
                ))}
                {rawResp && (
                  <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>Raw GET /measurements/categories:</div>
                    <pre style={{ fontSize: 9, color: 'var(--text-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 180, overflowY: 'auto' }}>{rawResp}</pre>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={onBack}>← Back</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => onNext({ tokenUids, zuperCats, catMappings })}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
