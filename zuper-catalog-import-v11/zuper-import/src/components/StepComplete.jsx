// src/components/StepComplete.jsx
export default function StepComplete({ conn, brands, formulaResults, productData, onRestart }) {
  const formulaCount  = Object.values(formulaResults || {}).filter(v => v && !v.skipped && !v.error).length;
  const createdCount  = Object.values(productData?.created || {}).filter(v => v && !v.error).length;
  const mappedCount   = Object.values(productData?.mappings || {}).filter(m => m.action === 'map').length;
  const linkedCount   = Object.values(productData?.created || {}).filter(v => v?.formula_linked).length;

  return (
    <div style={{ maxWidth: 620, margin: '3rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      {/* Icon */}
      <div style={{
        width: 80, height: 80, margin: '0 auto 1.5rem',
        borderRadius: '50%',
        background: 'var(--green-bg)', border: '2.5px solid var(--green-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, color: 'var(--green)',
      }}>✓</div>

      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 10, color: 'var(--text)' }}>
        Import complete
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
        The SRS catalog has been synced to <strong style={{ color: 'var(--text)' }}>{conn?.name}</strong> on{' '}
        <strong style={{ color: 'var(--text)' }}>{conn?.region}</strong>
        {brands?.length > 0 && <> for <strong style={{ color: 'var(--text)' }}>{brands.join(', ')}</strong></>}.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '2rem' }}>
        {[
          { label: 'Brands',        value: brands?.length || 0 },
          { label: 'Formulas',      value: formulaCount },
          { label: 'Products',      value: createdCount },
          { label: 'Formula links', value: linkedCount },
        ].map(({ label, value }) => (
          <div key={label} className="stat">
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Summary list */}
      <div className="card" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        {[
          `Connected to ${conn?.name} (${conn?.id}) on ${conn?.region}`,
          `Brands imported: ${brands?.join(', ') || '—'}`,
          `Mapped measurement tokens to Zuper measurement categories`,
          `Created ${formulaCount} formula${formulaCount !== 1 ? 's' : ''} with full expression maps and token bindings`,
          `Created ${createdCount} new product${createdCount !== 1 ? 's' : ''} using SRS suggested pricing`,
          `Mapped ${mappedCount} existing Zuper product${mappedCount !== 1 ? 's' : ''}`,
          `Linked ${linkedCount} formula${linkedCount !== 1 ? 's' : ''} to corresponding product line items`,
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13,
          }}>
            <span style={{ color: 'var(--green)', flexShrink: 0, fontWeight: 700, marginTop: 1 }}>✓</span>
            <span style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={onRestart} style={{ padding: '10px 28px' }}>
          Start new import
        </button>
        {conn?.region && (
          <a
            href={`https://${conn.region}.zuperpro.com`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            style={{ padding: '10px 28px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            Open Zuper ↗
          </a>
        )}
      </div>
    </div>
  );
}
