// src/components/StepConnect.jsx
import { useState } from 'react';
import { createZuperClient } from '../api/client.js';

const REGIONS = ['us-east-1', 'us-west-1c', 'ap-southeast-2'];

export default function StepConnect({ onNext }) {
  const [region,  setRegion]  = useState('us-east-1');
  const [apiKey,  setApiKey]  = useState('');
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [error,   setError]   = useState('');

  async function connect() {
    if (!apiKey.trim()) { setError('API key is required'); return; }
    setLoading(true); setError(''); setCompany(null);
    try {
      const client = createZuperClient(region, apiKey.trim());
      const res = await client.getCompany();

      // Accept any of the common response shapes Zuper returns
      const name = res?.data?.company_name
                || res?.company_name
                || res?.data?.name
                || res?.name
                || null;
      const id   = res?.data?.company_id
                || res?.company_id
                || res?.data?.id
                || res?.id
                || '—';

      if (!name) {
        // If we got a 200 but can't find company name, still allow proceed
        // and show the raw response for debugging
        setError(`Connected but couldn't read company name. Raw: ${JSON.stringify(res).substring(0, 120)}`);
        setLoading(false);
        return;
      }
      setCompany({ name, id, region, apiKey: apiKey.trim() });
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="page-narrow">
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          width: 60, height: 60, margin: '0 auto 1rem',
          background: 'var(--accent-light)', border: '2px solid var(--accent-border)',
          borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26,
        }}>⚡</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: 'var(--text)' }}>
          Connect to Zuper
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
          Select your data center region and enter your API key to begin the catalog import.
        </p>
      </div>

      <div className="card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Region */}
          <div>
            <span className="label">Data center region</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {REGIONS.map(r => (
                <button
                  key={r}
                  className={`pill${region === r ? ' active' : ''}`}
                  style={{ borderRadius: 8, textAlign: 'center', padding: '10px 6px', fontSize: 12, width: '100%' }}
                  onClick={() => setRegion(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <span className="label">API key</span>
            <input
              className="input"
              type="password"
              placeholder="Paste your x-api-key here…"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && connect()}
              autoComplete="off"
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: 'var(--red-bg)', border: '1px solid var(--red-border)',
              fontSize: 13, color: 'var(--red)', lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          {/* Success */}
          {company && (
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: 'var(--green-bg)', border: '1.5px solid var(--green-border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ✓ Connected successfully
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
                {company.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>
                Company ID: <strong>{company.id}</strong> &nbsp;·&nbsp; Region: <strong>{company.region}</strong>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={connect}
              disabled={loading || !apiKey.trim()}
              style={{ flex: company ? 'unset' : 1 }}
            >
              {loading ? 'Connecting…' : 'Connect'}
            </button>
            {company && (
              <button
                className="btn btn-primary"
                onClick={() => onNext(company)}
                style={{ flex: 1 }}
              >
                Continue: Select Brands →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Endpoint note */}
      <div style={{
        marginTop: '1.25rem', padding: '12px 14px', borderRadius: 8,
        background: 'var(--bg-2)', border: '1px solid var(--border)',
      }}>
        <div className="label" style={{ marginBottom: 5 }}>Endpoint</div>
        <code className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>
          https://<span style={{ color: 'var(--accent)', fontWeight: 600 }}>{region}</span>.zuperpro.com/api/user/company
        </code>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>
          Proxied server-side via Netlify — no CORS issues
        </div>
      </div>
    </div>
  );
}
