// src/api/client.js
import { SUPABASE_URL, SUPABASE_ANON } from '../data/masterData.js';

// ─── UOM normaliser ───────────────────────────────────────────────────────────
const UOM_MAP = {
  SQFT:'sq_ft', sqft:'sq_ft', 'sq ft':'sq_ft', 'sq_ft':'sq_ft',
  SQ:'sq', sq:'sq',
  LF:'lf', lf:'lf', 'lin ft':'lf', 'linear ft':'lf',
  '%':'pct', PERCENT:'pct', pct:'pct',
  EA:'ea', ea:'ea', EACH:'ea',
  PC:'pc', pc:'pc', PCS:'pc',
  BX:'bx', bx:'bx', BOX:'bx',
  RL:'rl', rl:'rl', ROLL:'rl',
  BD:'bd', bd:'bd', BUNDLE:'bd',
  TB:'tb', tb:'tb',
  UNIT:'unit', unit:'unit', '':'unit',
};
export function normaliseUom(raw) {
  const k = String(raw || '').trim().toUpperCase().replace(/\s+/g,' ');
  const kl = String(raw || '').trim().toLowerCase();
  return UOM_MAP[k] || UOM_MAP[kl] || UOM_MAP[raw] || String(raw || 'unit').toLowerCase();
}

// ─── Core request ─────────────────────────────────────────────────────────────
export function createZuperClient(region, apiKey) {
  const proxyBase = `/api/zuper/${region}`;

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { accept:'application/json','content-type':'application/json','x-api-key':apiKey },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    let res;
    try { res = await fetch(`${proxyBase}${path}`, opts); }
    catch (e) { throw new Error(`Network: ${e.message}`); }
    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try { detail = JSON.stringify(JSON.parse(text)); } catch {}
      throw new Error(`${res.status} ${detail.substring(0, 400)}`);
    }
    try { return JSON.parse(text); } catch { return { raw: text }; }
  }

  function safeArray(res, ...keys) {
    for (const k of keys) { if (Array.isArray(res?.[k])) return res[k]; }
    return Array.isArray(res) ? res : [];
  }

  // ── Smart token creator: tries every known payload shape ──────────────────
  // Returns { result, winningBody, allAttempts } on success, throws on total failure
  async function createTokenWithFallback(categoryUid, tokenName, rawUom) {
    const uom = normaliseUom(rawUom);
    const endpoint = `/measurements/categories/${categoryUid}/tokens`;

    // All payload combinations to attempt, priority order.
    // Zuper error "Token name / UOM is missing" means it can't read either field.
    // We cover every plausible field name the Zuper API might use.
    const bodies = [
      // Following Zuper's measurement_ naming convention
      { measurement_token_name: tokenName, uom },
      { measurement_token_name: tokenName, measurement_uom: uom },
      // Shorter forms
      { token_name: tokenName, uom },
      { token_name: tokenName, token_uom: uom },
      // The "measurement_token" field we tried before, with different uom key
      { measurement_token: tokenName, measurement_uom: uom },
      { measurement_token: tokenName, uom },
      // Just name / label
      { name: tokenName, uom },
      { label: tokenName, uom },
      // request_data wrappers (like other Zuper endpoints)
      { request_data: { measurement_token_name: tokenName, uom } },
      { request_data: { token_name: tokenName, uom } },
      { request_data: { measurement_token_name: tokenName, measurement_uom: uom } },
      // All fields at once (kitchen sink — Zuper picks what it needs)
      {
        measurement_token_name: tokenName,
        measurement_token:      tokenName,
        token_name:             tokenName,
        name:                   tokenName,
        label:                  tokenName,
        uom,
        measurement_uom:        uom,
        token_uom:              uom,
      },
    ];

    const allAttempts = [];
    for (const body of bodies) {
      try {
        const result = await request('POST', endpoint, body);
        // Reject if Zuper returned a success-code but error body
        if (result?.type === 'error') {
          allAttempts.push({ body, error: result?.message || result?.title || 'API error type' });
          continue;
        }
        return { result, winningBody: body, allAttempts };
      } catch (e) {
        allAttempts.push({ body, error: e.message });
        // 404 means wrong endpoint — stop trying this path
        if (String(e.message).startsWith('404')) break;
      }
    }

    const summary = allAttempts
      .map((a, i) => `[${i+1}] ${JSON.stringify(a.body).substring(0,60)}: ${a.error?.substring(0,80)}`)
      .join('\n');
    throw new Error(`All ${allAttempts.length} payload shapes failed:\n${summary}`);
  }

  return {
    get:  (path)       => request('GET',  path),
    post: (path, body) => request('POST', path, body),
    put:  (path, body) => request('PUT',  path, body),

    getCompany: () => request('GET', '/user/company'),

    getAllProductCategories: async () => {
      const all = [];
      for (let page = 1; page <= 20; page++) {
        let res;
        try { res = await request('GET', `/products/category?count=100&page=${page}&filter.keyword=`); }
        catch { break; }
        const items = safeArray(res, 'data', 'categories');
        if (!items.length) break;
        all.push(...items);
        if (items.length < 100) break;
      }
      return all;
    },

    getMeasurementCategories: () =>
      request('GET', '/measurements/categories?sort=ASC&sort_by=created_at'),

    createMeasurementCategory: (name) =>
      request('POST', '/measurements/categories', {
        category_name: name,
        category_description: name,
      }),

    // Public API — delegates to the multi-attempt helper above
    createMeasurementToken: (categoryUid, tokenName, rawUom) =>
      createTokenWithFallback(categoryUid, tokenName, rawUom),

    createFormula: (payload) => request('POST', '/formulas', payload),

    getLocations: async () => {
      for (const path of ['/location', '/locations']) {
        try {
          const res = await request('GET', path);
          const items = safeArray(res, 'data', 'locations');
          // Return even if empty — that means no locations exist yet
          if (Array.isArray(res?.data) || Array.isArray(res)) return items;
        } catch {}
      }
      return [];
    },

    createLocation: async (name = 'Warehouse') => {
      const payloads = [
        { location_name: name, location_type: 'WAREHOUSE', location_address: { street:'123 Main St', city:'New York', state:'NY', zip:'10001', country:'US' } },
        { location_name: name, location_type: 'WAREHOUSE' },
        { name, type: 'WAREHOUSE' },
        { name, location_type: 'WAREHOUSE' },
        { location_name: name },
      ];
      for (const body of payloads) {
        for (const ep of ['/location', '/locations']) {
          try {
            const res = await request('POST', ep, body);
            if (res?.type !== 'error') return res;
          } catch (e) {
            if (String(e.message).startsWith('404')) break;
          }
        }
      }
      throw new Error('Cannot create location automatically — please add one in Zuper → Settings → Locations → Add Location, then reload.');
    },

    getProducts: async () => {
      const res = await request('GET', '/product').catch(() => ({ data: [] }));
      return safeArray(res, 'data', 'products');
    },
    createProduct: (payload) => request('POST', '/product', payload),
    linkFormulaToProduct: (productId, formulaUid) =>
      request('PUT', `/product/${productId}/formula`, { formula_uid: formulaUid }),
  };
}

// ── Warehouse resolver ────────────────────────────────────────────────────────
export async function getOrCreateWarehouse(client) {
  const locs = await client.getLocations();
  const best = locs.find(l => {
    const t = String(l.location_type || l.type || '').toUpperCase();
    const n = String(l.location_name || l.name || '').toLowerCase();
    return t === 'WAREHOUSE' || n.includes('warehouse') || n.includes('main') || n.includes('default');
  }) || locs[0];

  if (best) return {
    uid:  String(best.location_uid || best.uid || best.id || best.location_id || ''),
    name: String(best.location_name || best.name || 'Warehouse'),
  };

  try {
    const res = await client.createLocation('Warehouse');
    return {
      uid:  String(res?.data?.location_uid || res?.data?.uid || res?.data?.id || res?.uid || ''),
      name: 'Warehouse',
    };
  } catch (e) {
    throw new Error(e.message);
  }
}

// ─── Parse existing tokens from GET /measurements/categories ──────────────────
export function parseExistingTokens(categories) {
  const map = {};
  (Array.isArray(categories) ? categories : []).forEach(cat => {
    const catUid  = String(cat.measurement_category_uid || cat.category_uid || cat.uid || cat.id || '');
    const catName = String(cat.measurement_category_name || cat.category_name || cat.name || '');
    const tokenList = cat.tokens || cat.measurement_tokens || cat.data || cat.items || [];
    (Array.isArray(tokenList) ? tokenList : []).forEach(t => {
      if (!t) return;
      const tName = String(t.measurement_token_name || t.measurement_token || t.token_name || t.name || t.label || '');
      const tUid  = String(t.measurement_token_uid  || t.token_uid          || t.uid  || t.id  || '');
      if (!tName) return;
      map[tName.toLowerCase()] = { token_uid: tUid, category_uid: catUid, category_name: catName, name: tName, uom: String(t.uom || t.measurement_uom || '') };
    });
  });
  return map;
}

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supaHeaders = {
  apikey:         SUPABASE_ANON,
  Authorization:  `Bearer ${SUPABASE_ANON}`,
  'Content-Type': 'application/json',
};

export async function fetchProductsByBrand(brandNorm) {
  const url = `${SUPABASE_URL}/rest/v1/srs_products`
    + `?manufacturer_norm=ilike.${encodeURIComponent(brandNorm)}`
    + `&select=product_id,product_name,product_category,manufacturer,manufacturer_norm,`
    + `suggested_price,proposal_line_item,family_tier,primary_item`
    + `&limit=500`;
  const res = await fetch(url, { headers: supaHeaders });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ─── Expression map builder ───────────────────────────────────────────────────
export function buildExpressionMap(expression, tokenUidMap) {
  if (!expression) return { expression: '', expression_map: [] };
  let expr = expression;
  const map = [];
  let i = 1;
  const tokens = Object.keys(tokenUidMap || {}).sort((a, b) => b.length - a.length);
  for (const tokenName of tokens) {
    if (expr.includes(tokenName)) {
      const key = `$${i}`;
      const { token_uid, category_uid } = tokenUidMap[tokenName] || {};
      map.push({ key, type:'MEASUREMENT', field_name:tokenName, measurement_token_uid:token_uid||'', measurement_category_uid:category_uid||'' });
      expr = expr.split(tokenName).join(key);
      i++;
    }
  }
  expr = expr.replace(/CEIL\((.+?)\)/g, '$1').trim();
  return { expression: expr, expression_map: map };
}
