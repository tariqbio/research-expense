import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    if (params.get('reset') === '1') setInfo('Password reset successfully. You can now sign in.');
  }, []);

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(form.email, form.password); navigate('/'); }
    catch (err) { setError(err.response?.data?.error || 'Incorrect email or password.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-grid" />
        <div className="login-hero-particles">
          {[...Array(8)].map((_, i) => <div key={i} className="lp-particle" />)}
        </div>
        <div className="hero-content">
          <div className="hero-eyebrow">ResearchTrack · Universal Edition</div>
          <h1 className="hero-headline">Research<br /><span>Expense</span><br />Tracker</h1>
          <p className="hero-description">
            A unified platform for managing research project budgets, expense submissions,
            and reimbursement tracking — for any organization.
          </p>
          <div className="hero-features">
            {[
              { icon: '🏛️', text: 'Multi-organization support' },
              { icon: '💰', text: 'Track budgets and fund installments' },
              { icon: '📋', text: 'Submit and categorize expenses' },
              { icon: '🔐', text: 'Role-based access with audit trail' },
            ].map((f, i) => (
              <div key={i} className="hero-feature">
                <div className="hero-feature-dot">{f.icon}</div>
                {f.text}
              </div>
            ))}
          </div>
          <div className="hero-stats">
            <div className="hero-stat-item"><div className="hero-stat-val">100%</div><div className="hero-stat-lbl">Audit Trail</div></div>
            <div className="hero-stat-item"><div className="hero-stat-val">Real-time</div><div className="hero-stat-lbl">Budget View</div></div>
            <div className="hero-stat-item"><div className="hero-stat-val">Secure</div><div className="hero-stat-lbl">Role-based</div></div>
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="mobile-login-hero-strip">
          <div className="m-eyebrow">ResearchTrack · Universal Edition</div>
          <div className="m-headline">Research<br /><span>Expense</span><br />Tracker</div>
          <p className="m-desc">A unified platform for research project budgets and expense tracking.</p>
          <div className="m-stats">
            <div className="m-stat"><div className="m-stat-val">100%</div><div className="m-stat-lbl">Audit Trail</div></div>
            <div className="m-stat"><div className="m-stat-val">Live</div><div className="m-stat-lbl">Budget View</div></div>
            <div className="m-stat"><div className="m-stat-val">Secure</div><div className="m-stat-lbl">Role-based</div></div>
          </div>
        </div>

        <div className="login-logo">R</div>
        <h1>Welcome back</h1>
        <p className="tagline">Sign in to your ResearchTrack account.</p>

        {info  && <div className="notice notice-success">✓ {info}</div>}
        {error && <div className="notice notice-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address <span className="form-required">*</span></label>
            <input type="email" className="form-input" placeholder="you@institution.edu"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">
              Password <span className="form-required">*</span>
              <Link to="/forgot-password" style={{ float: 'right', fontSize: 12, color: 'var(--accent)', fontWeight: 400 }}>
                Forgot password?
              </Link>
            </label>
            <input type="password" className="form-input" placeholder="Enter your password"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required />
          </div>

          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontSize: 14 }}
            disabled={loading}>
            {loading ? '⏳ Verifying…' : 'Sign In →'}
          </button>
        </form>

        <div className="login-footer-text" style={{ marginTop: 20 }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)' }}>Create one</Link>
        </div>

        <div className="login-footer-text">
          🔒 All access is logged and monitored.<br />
          ResearchTrack · Universal Edition · 2025<br />
          Developed by <strong>Tariqul Islam</strong>
        </div>
      </div>
    </div>
  );
}
