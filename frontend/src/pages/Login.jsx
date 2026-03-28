import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
  }, []);

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(form.email, form.password); navigate('/'); }
    catch (err) { setError(err.response?.data?.error || 'Incorrect email or password. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      {/* Hero panel */}
      <div className="login-hero">
        {/* Background elements */}
        <div className="login-hero-grid" />
        <div className="login-hero-particles">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="lp-particle" />
          ))}
        </div>

        <div className="hero-content">
          <div className="hero-eyebrow">Daffodil International University · FGS</div>

          <h1 className="hero-headline">
            Research<br /><span>Expense</span><br />Tracker
          </h1>

          <p className="hero-description">
            A unified platform for managing research project budgets, expense submissions,
            and reimbursement tracking across all FGS research initiatives.
          </p>

          <div className="hero-features">
            {[
              { icon: '💰', text: 'Track budgets and fund installments per project' },
              { icon: '📋', text: 'Submit and categorize research expenses' },
              { icon: '✅', text: 'Admin-controlled reimbursement with audit trail' },
              { icon: '🔐', text: 'Role-based access for researchers and admins' },
            ].map((f, i) => (
              <div key={i} className="hero-feature">
                <div className="hero-feature-dot">{f.icon}</div>
                {f.text}
              </div>
            ))}
          </div>

          <div className="hero-stats">
            <div className="hero-stat-item">
              <div className="hero-stat-val">100%</div>
              <div className="hero-stat-lbl">Audit Trail</div>
            </div>
            <div className="hero-stat-item">
              <div className="hero-stat-val">Real-time</div>
              <div className="hero-stat-lbl">Budget View</div>
            </div>
            <div className="hero-stat-item">
              <div className="hero-stat-val">Secure</div>
              <div className="hero-stat-lbl">Role-based</div>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="login-panel">
        <div className="login-logo">R</div>

        {/* Mobile-only hero info banner */}
        <div className="mobile-hero-banner">
          <span style={{ fontSize: 22 }}>🎓</span>
          <div>
            <strong style={{ color: 'rgba(255,255,255,0.75)', display: 'block', marginBottom: 2 }}>FGS Research Expense Tracker</strong>
            Daffodil International University · Faculty of Graduate Studies
          </div>
        </div>

        <h1>Welcome back</h1>
        <p className="tagline">
          Sign in to your FGS ResearchTrack account using your institutional email.
        </p>

        {error && <div className="notice notice-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address <span className="form-required">*</span></label>
            <input type="email" className="form-input"
              placeholder="you@diu.edu.bd"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required autoFocus />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Password <span className="form-required">*</span></label>
            <input type="password" className="form-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required />
          </div>

          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontSize: 14 }}
            disabled={loading}>
            {loading ? '⏳ Verifying…' : 'Sign In →'}
          </button>
        </form>

        <div className="login-footer-text">
          🔒 Authorized personnel only. All access is logged and monitored.<br />
          Faculty of Graduate Studies · Daffodil International University · 2025<br />
          Developed by <strong>Tariqul Islam</strong>
        </div>
      </div>
    </div>
  );
}
