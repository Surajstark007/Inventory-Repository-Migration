// src/App.jsx
import { useState, Component } from 'react';
import './styles.css';
import StepConnect  from './components/StepConnect.jsx';
import StepBrands   from './components/StepBrands.jsx';
import StepTokens   from './components/StepTokens.jsx';
import StepFormulas from './components/StepFormulas.jsx';
import StepProducts from './components/StepProducts.jsx';
import StepComplete from './components/StepComplete.jsx';

// ─── Error boundary — shows a readable crash screen instead of blank page ────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: '3rem 2rem', maxWidth: 540, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#dc2626' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 13, color: '#4b5368', marginBottom: 20 }}>
          {this.state.error.message}
        </p>
        <button
          onClick={() => { this.setState({ error: null }); this.props.onReset?.(); }}
          style={{ padding: '9px 20px', borderRadius: 8, background: '#4f58f0', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
        >
          Restart
        </button>
      </div>
    );
  }
}

// ─── Steps definition ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 'connect',  label: 'Connect' },
  { id: 'brands',   label: 'Select brands' },
  { id: 'tokens',   label: 'Token mapping' },
  { id: 'formulas', label: 'Formula mapping' },
  { id: 'products', label: 'Product mapping' },
  { id: 'complete', label: 'Complete' },
];

// ─── Main app ─────────────────────────────────────────────────────────────────
export default function App() {
  const [step,           setStep]           = useState(0);
  const [conn,           setConn]           = useState(null);
  const [brands,         setBrands]         = useState([]);
  const [zuperCats,      setZuperCats]      = useState([]);
  const [tokenData,      setTokenData]      = useState(null);
  const [formulaResults, setFormulaResults] = useState({});
  const [productData,    setProductData]    = useState(null);

  function restart() {
    setStep(0); setConn(null); setBrands([]); setZuperCats([]);
    setTokenData(null); setFormulaResults({}); setProductData(null);
  }

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-logo">
          <div className="header-logo-mark">Z</div>
          Zuper Catalog Import
          {conn && (
            <div className="header-company">
              <span style={{ color: '#d1d5db' }}>·</span>
              <span style={{ fontWeight: 500 }}>{conn.name}</span>
              <span className="badge badge-accent" style={{ fontSize: 10 }}>{conn.region}</span>
            </div>
          )}
        </div>

        {/* Stepper nav */}
        <nav className="stepper">
          {STEPS.map((s, i) => {
            const isDone   = i < step;
            const isActive = i === step;
            return (
              <button
                key={s.id}
                className={`step-btn${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}
                onClick={() => isDone && setStep(i)}
                title={isDone ? `Go back to ${s.label}` : undefined}
              >
                <span className={`step-num${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
                  {isDone ? '✓' : i + 1}
                </span>
                {s.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ── Step pages ─────────────────────────────────────────────────────── */}
      <main style={{ flex: 1 }}>
        <ErrorBoundary key={step} onReset={restart}>
          {step === 0 && (
            <StepConnect onNext={c => { setConn(c); setStep(1); }} />
          )}
          {step === 1 && (
            <StepBrands
              conn={conn}
              onNext={(b, cats) => { setBrands(b); setZuperCats(cats || []); setStep(2); }}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <StepTokens
              conn={conn}
              brands={brands}
              onNext={d => { setTokenData(d); setStep(3); }}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepFormulas
              conn={conn}
              brands={brands}
              tokenData={tokenData}
              onNext={r => { setFormulaResults(r); setStep(4); }}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <StepProducts
              conn={conn}
              brands={brands}
              formulaResults={formulaResults}
              onNext={d => { setProductData(d); setStep(5); }}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <StepComplete
              conn={conn}
              brands={brands}
              formulaResults={formulaResults}
              productData={productData}
              onRestart={restart}
            />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
