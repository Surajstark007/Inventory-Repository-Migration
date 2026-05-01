# Zuper Catalog Import

A production-ready web tool for importing SRS product catalog data into Zuper, with measurement token mapping, formula creation, and product syncing.

---

## Quick deploy to Netlify

### Option A — Drag & drop (fastest)
1. `npm install && npm run build`
2. Drag the `dist/` folder to [app.netlify.com/drop](https://app.netlify.com/drop)

### Option B — Git-connected (recommended)
1. Push this repo to GitHub/GitLab
2. In Netlify: New site → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy

Netlify will automatically pick up `netlify.toml` and deploy the serverless proxy function.

---

## Local development

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173
```

**Note:** Local dev won't have the Netlify proxy function running, so Zuper API calls will hit CORS. Use the Netlify CLI for full local testing:

```bash
npm install -g netlify-cli
netlify dev        # Starts Vite + functions at http://localhost:8888
```

---

## Architecture

```
Browser
  ↓  (same-origin)
Netlify Edge (/api/zuper/{region}/...)
  ↓  (server-side, no CORS)
Zuper API (https://{region}.zuperpro.com/api/...)

Browser
  ↓  (direct, Supabase CORS-enabled)
Supabase REST API (SRS product catalog)
```

### The Netlify proxy

`netlify/functions/zuper-proxy.js` is a serverless function that:
- Receives requests at `/api/zuper/{region}/{path}`
- Extracts the API key from the `x-api-key` header
- Forwards the request to `https://{region}.zuperpro.com/api/{path}`
- Returns the response — no CORS headers needed

### Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main wizard shell, step routing, shared state |
| `src/components/StepConnect.jsx` | Step 1: Region + API key, company verification |
| `src/components/StepBrands.jsx` | Step 2: Brand tile selection with search |
| `src/components/StepTokens.jsx` | Step 3: Token → Zuper category mapping + creation |
| `src/components/StepFormulas.jsx` | Step 4: Formula selection, expression map build, creation |
| `src/components/StepProducts.jsx` | Step 5: Product mapping + creation with formula linking |
| `src/components/StepComplete.jsx` | Step 6: Summary + stats |
| `src/api/client.js` | Zuper API client + Supabase fetcher + expression builder |
| `src/data/masterData.js` | Embedded token master + formula-to-line-item mappings |
| `netlify/functions/zuper-proxy.js` | CORS proxy serverless function |
| `netlify.toml` | Build + redirect config |

---

## Workflow

1. **Connect** — Select dc-region, enter API key → verifies company name
2. **Select brands** — Tile grid of all 29 SRS brands; fetches existing Zuper product categories
3. **Token mapping** — Shows all measurement tokens needed; maps to existing Zuper measurement categories or creates new ones
4. **Formula mapping** — Shows all 30 line items grouped by SRS category; each has a dropdown of relevant pre-matched formulas from the master; creates formulas in Zuper with full `expression_map`
5. **Product mapping** — Pulls selected brand products from Supabase SRS catalog; auto-maps to existing Zuper products by name; creates new products using `suggested_price`; links formula UIDs to products
6. **Complete** — Stats summary + link to Zuper

---

## Zuper API endpoints used

| Method | Endpoint | Purpose |
|--------|---------|---------|
| GET | `/user/company` | Verify connection |
| GET | `/products/category?count=100&page=N` | Fetch all product categories (paginated) |
| GET | `/measurements/categories` | Fetch measurement categories |
| POST | `/measurements/categories` | Create measurement category |
| POST | `/measurements` | Create measurement token |
| POST | `/formulas` | Create formula |
| GET | `/product` | Fetch existing products |
| POST | `/product` | Create product |
| PUT | `/product/{id}/formula` | Link formula to product |

---

## Data sources

- **SRS product catalog** — Supabase (`srs_products` table, 19,807 rows)
- **Measurement token master** — Embedded from `Measurement_Token_Master.csv` (802 unique tokens)
- **Formula master** — Pre-matched per line item from `Formula_master.csv` (3,406 formulas, 128 relevant embedded)
