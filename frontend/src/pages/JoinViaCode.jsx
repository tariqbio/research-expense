import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Public axios — no Bearer token, same reason as JoinViaLink
const publicApi = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' } });

export default function JoinViaCode() {
  const { code }   = useParams();
  const navigate   = useNavigate();
  const [info, setInfo]       = useState(null);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState({ name:'', email:'', password:'', confirm:'', position:'' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!code) { setError('No code provided.'); setLoading(false); return; }
    publicApi.get(`/auth/code/${code}`)
      .then(r => setInfo(r.data))
      .catch(e => setError(e.response?.data?.error || 'Invalid or expired code.'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleSubmit = async e => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setSaving(true);
    try {
      const { data } = await publicApi.post(`/auth/code/${code}`, form);
      localStorage.setItem('rt_token', data.token);
      localStorage.setItem('rt_user',  JSON.stringify(data.user));
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  if (error) return (
    <div className="login-page" style={{ justifyContent:'center' }}>
      <div className="login-panel" style={{ maxWidth:420, margin:'0 auto' }}>
        <div className="login-logo">❌</div>
        <h1>Code problem</h1>
        <p className="tagline" style={{ textAlign:'center' }}>{error}</p>
        <a href="/login" className="btn btn-outline"
          style={{ width:'100%', justifyContent:'center', marginTop:20, padding:'11px', fontSize:14, display:'flex' }}>
          Back to Sign In
        </a>
      </div>
    </div>
  );

  const expiresIn = info ? Math.ceil((new Date(info.expires_at) - new Date()) / 86400000) : 0;

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-grid" />
        <div className="hero-content">
          <div className="hero-eyebrow">Project Invite Code</div>
          <h1 className="hero-headline">Join<br /><span>{info?.workspace_name}</span></h1>
          <div className="hero-features">
            {info?.project_name && (
              <div className="hero-feature">
                <div className="hero-feature-dot">📁</div>
                Project: <strong>{info.project_name}</strong>
              </div>
            )}
            <div className="hero-feature">
              <div className="hero-feature-dot">👤</div>
              Uses remaining: <strong>{info?.uses_left}</strong>
            </div>
            <div className="hero-feature">
              <div className="hero-feature-dot">⏰</div>
              Expires in: <strong>{expiresIn} day{expiresIn!==1?'s':''}</strong>
            </div>
          </div>
          <div style={{
            background:'rgba(255,255,255,0.1)', borderRadius:10,
            padding:'16px 20px', marginTop:24,
          }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)',
                          textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
              Your invite code
            </div>
            <div style={{ fontSize:28, fontWeight:800, color:'#28e98c',
                          letterSpacing:'0.15em', fontFamily:'monospace' }}>
              {code?.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-logo">R</div>
        <h1>Create your account</h1>
        <p className="tagline">
          You'll be joined to <strong>{info?.project_name || info?.workspace_name}</strong> automatically.
        </p>

        {error && <div className="notice notice-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name <span className="form-required">*</span></label>
            <input className="form-input" placeholder="e.g. Tariqul Islam"
              value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Email <span className="form-required">*</span></label>
            <input type="email" className="form-input" placeholder="you@university.edu"
              value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required />
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
              <label className="form-label">Confirm <span className="form-required">*</span></label>
              <input type="password" className="form-input" placeholder="Repeat"
                value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary"
            style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14 }}
            disabled={saving}>
            {saving ? '⏳ Joining…' : 'Create Account & Join →'}
          </button>
        </form>
      </div>
    </div>
  );
}
