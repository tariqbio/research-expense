import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | ok | error

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    api.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="login-page login-page--centered">
      <div className="login-panel" style={{ maxWidth: 420, margin: '0 auto' }}>
        {status === 'verifying' && <>
          <div className="login-logo">⏳</div>
          <h1>Verifying…</h1>
          <p className="tagline">Please wait.</p>
        </>}
        {status === 'ok' && <>
          <div className="login-logo">✅</div>
          <h1>Email verified!</h1>
          <p className="tagline">Your email is confirmed. Your administrator will approve your account shortly — you'll get an email when ready.</p>
          <Link to="/login" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 24, padding: '12px 16px', fontSize: 14, display: 'flex' }}>
            Go to Sign In
          </Link>
        </>}
        {status === 'error' && <>
          <div className="login-logo">❌</div>
          <h1>Link expired</h1>
          <p className="tagline">This verification link is invalid or has expired. Please register again or contact your admin.</p>
          <Link to="/request-access" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 24, padding: '12px 16px', fontSize: 14, display: 'flex' }}>
            Register Again
          </Link>
        </>}
      </div>
    </div>
  );
}
