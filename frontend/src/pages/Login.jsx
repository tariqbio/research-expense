import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      {/* Left hero panel */}
      <div className="login-left">
        <div className="login-hero">
          <span className="login-hero-icon">🔬</span>
          <h1>Research <span>Expense</span><br />Tracker</h1>
          <p>A unified platform for managing research project budgets, expenses, and reimbursements across all FGS projects at DIU.</p>

          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-icon">📁</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Project Management</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Track budgets, installments and payment schedules</div>
              </div>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon">🧾</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Expense Tracking</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Submit, categorize and monitor all expenditures</div>
              </div>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon">✅</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Reimbursement Control</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Immutable audit log of all payment decisions</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-right">
        <div className="login-form-header">
          <div className="login-form-logo">🔬</div>
          <h2>Welcome back</h2>
          <p>Sign in to your FGS account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email" className="form-input"
              placeholder="you@diu.edu.bd"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input
              type="password" className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          <button
            type="submit" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}
            disabled={loading}
          >
            {loading ? '⏳ Verifying…' : '→ Sign In to Dashboard'}
          </button>
        </form>

        <div className="login-form-footer">
          <div>🔒 Secured · Authorized personnel only</div>
          <div style={{ marginTop: 6 }}>Faculty of Graduate Studies · DIU · 2025</div>
        </div>
      </div>
    </div>
  );
}
