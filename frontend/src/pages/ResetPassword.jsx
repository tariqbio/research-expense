import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      navigate('/login?reset=1');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired link. Please request a new one.');
    } finally { setLoading(false); }
  };

  if (!token) return (
    <div className="login-page" style={{ justifyContent: 'center' }}>
      <div className="login-panel" style={{ maxWidth: 420, margin: '0 auto' }}>
        <div className="login-logo">❌</div>
        <h1>Invalid link</h1>
        <p className="tagline">This reset link is missing or invalid.</p>
        <Link to="/forgot-password" className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 24, padding: '12px 16px', fontSize: 14, display: 'flex' }}>
          Request New Link
        </Link>
      </div>
    </div>
  );

  return (
    <div className="login-page" style={{ justifyContent: 'center' }}>
      <div className="login-panel" style={{ maxWidth: 420, margin: '0 auto' }}>
        <div className="login-logo">🔒</div>
        <h1>Set new password</h1>
        <p className="tagline">Choose a strong password for your account.</p>
        {error && <div className="notice notice-error">⚠ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" className="form-input" placeholder="Min. 8 characters"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input type="password" className="form-input" placeholder="Repeat password"
              value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
          </div>
          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontSize: 14 }}
            disabled={loading}>
            {loading ? '⏳ Saving…' : 'Set Password →'}
          </button>
        </form>
      </div>
    </div>
  );
}
