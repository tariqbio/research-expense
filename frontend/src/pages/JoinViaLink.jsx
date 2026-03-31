import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function JoinViaLink() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const { login }  = useAuth();
  const token      = params.get('token');

  const [invite, setInvite]   = useState(null);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState({ name:'', password:'', confirm:'', position:'' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!token) { setError('No invite token found in the link.'); setLoading(false); return; }
    api.get(`/auth/join?token=${token}`)
      .then(r => setInvite(r.data))
      .catch(e => setError(e.response?.data?.error || 'Invalid or expired invite link.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async e => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setSaving(true);
    try {
      const { data } = await api.post('/auth/join', {
        token, name: form.name, password: form.password, position: form.position,
      });
      // Auto login after joining
      localStorage.setItem('rt_token', data.token);
      localStorage.setItem('rt_user',  JSON.stringify(data.user));
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  if (error) return (
    <div className="login-page" style={{ justifyContent:'center' }}>
      <div className="login-panel" style={{ maxWidth:420, margin:'0 auto' }}>
        <div className="login-logo">❌</div>
        <h1>Invite problem</h1>
        <p className="tagline" style={{ textAlign:'center' }}>{error}</p>
        <a href="/login" className="btn btn-outline"
          style={{ width:'100%', justifyContent:'center', marginTop:20,
                   padding:'11px', fontSize:14, display:'flex' }}>
          Back to Sign In
        </a>
      </div>
    </div>
  );

  const expiresIn = invite ? Math.ceil((new Date(invite.expires_at) - new Date()) / 86400000) : 0;

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-grid" />
        <div className="hero-content">
          <div className="hero-eyebrow">You've been invited</div>
          <h1 className="hero-headline">Join<br /><span>{invite?.workspace_name}</span></h1>
          {invite?.report_header && invite.report_header !== invite.workspace_name && (
            <p className="hero-description" style={{ opacity:0.7 }}>{invite.report_header}</p>
          )}
          <div className="hero-features">
            <div className="hero-feature">
              <div className="hero-feature-dot">✉️</div>
              Invited as: <strong>{invite?.email}</strong>
            </div>
            <div className="hero-feature">
              <div className="hero-feature-dot">👤</div>
              Role: <strong>{invite?.role === 'admin' ? 'Administrator' : 'Researcher'}</strong>
            </div>
            {invite?.project_name && (
              <div className="hero-feature">
                <div className="hero-feature-dot">📁</div>
                Auto-joined to: <strong>{invite.project_name}</strong>
              </div>
            )}
            <div className="hero-feature">
              <div className="hero-feature-dot">⏰</div>
              Invite expires in: <strong>{expiresIn} day{expiresIn!==1?'s':''}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-logo">R</div>
        <h1>Complete your account</h1>
        <p className="tagline">You're joining <strong>{invite?.workspace_name}</strong></p>

        {error && <div className="notice notice-error">⚠ {error}</div>}

        <div style={{
          background:'var(--bg-secondary)', borderRadius:8, padding:'10px 14px',
          fontSize:13, color:'var(--text-secondary)', marginBottom:20,
          border:'1px solid var(--border)',
        }}>
          📧 Your email is locked to: <strong style={{ color:'var(--text-primary)' }}>{invite?.email}</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Your Full Name <span className="form-required">*</span></label>
            <input className="form-input" placeholder="e.g. Tariqul Islam"
              value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Position / Designation</label>
            <input className="form-input" placeholder="e.g. Research Assistant"
              value={form.position} onChange={e=>setForm(f=>({...f,position:e.target.value}))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password <span className="form-required">*</span></label>
              <input type="password" className="form-input" placeholder="Min. 8 characters"
                value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password <span className="form-required">*</span></label>
              <input type="password" className="form-input" placeholder="Repeat"
                value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary"
            style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14 }}
            disabled={saving}>
            {saving ? '⏳ Creating account…' : 'Create Account & Join →'}
          </button>
        </form>
      </div>
    </div>
  );
}
