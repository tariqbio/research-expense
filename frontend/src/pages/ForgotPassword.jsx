import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function ForgotPassword() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true);
    try { await api.post('/auth/forgot-password', { email }); setSent(true); }
    catch { setSent(true); } // always show success
    finally { setLoading(false); }
  };

  return (
    <div className="login-page login-page--centered">
      <div className="login-panel" style={{ maxWidth: 420, margin: '0 auto' }}>
        <div className="login-logo">🔑</div>
        <h1>{sent ? 'Check your inbox' : 'Forgot password?'}</h1>

        {sent ? (
          <>
            <p className="tagline" style={{ textAlign: 'center' }}>
              If <strong>{email}</strong> is registered, a password reset link has been sent. Check your spam folder too.
            </p>
            <Link to="/login" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 24, padding: '12px 16px', fontSize: 14, display: 'flex' }}>
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <p className="tagline" style={{ textAlign: 'center' }}>
              Enter your email and we'll send a reset link if the account exists.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" placeholder="you@institution.edu"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontSize: 14 }}
                disabled={loading}>
                {loading ? '⏳ Sending…' : 'Send Reset Link →'}
              </button>
            </form>
            <div className="login-footer-text" style={{ marginTop: 20 }}>
              <Link to="/login" style={{ color: 'var(--accent)' }}>← Back to Sign In</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
