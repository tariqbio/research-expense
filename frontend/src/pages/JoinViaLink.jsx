import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function JoinViaLink() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token');

  const [invite, setInvite]   = useState(null);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState({ name:'', password:'', confirm:'', position:'' });
  const [loading, setLoading] = useState(!!token); // only load if token present
  const [saving, setSaving]   = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [showCf, setShowCf]   = useState(false);

  // Manual link paste state (shown when no token in URL)
  const [pastedLink, setPastedLink] = useState('');
  const [pasting, setPasting]       = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get(`/auth/join?token=${token}`)
      .then(r => setInvite(r.data))
      .catch(e => setError(e.response?.data?.error || 'Invalid or expired invite link.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePasteLink = e => {
    e.preventDefault();
    const url = pastedLink.trim();
    if (!url) return;
    // Extract token from pasted URL or raw token
    let extracted = url;
    try {
      const u = new URL(url);
      extracted = u.searchParams.get('token') || url;
    } catch {}
    if (!extracted || extracted === url && !url.includes('=')) {
      setError('Could not find a token in that link. Make sure you copied the full invite URL.');
      return;
    }
    setPasting(true); setError('');
    api.get(`/auth/join?token=${extracted}`)
      .then(r => {
        setInvite(r.data);
        // Update URL so the token is in the address bar
        window.history.replaceState({}, '', `/join?token=${extracted}`);
      })
      .catch(e => setError(e.response?.data?.error || 'Invalid or expired invite link.'))
      .finally(() => setPasting(false));
  };

  const handleSubmit = async e => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    const tok = token || (pastedLink && (() => {
      try { return new URL(pastedLink.trim()).searchParams.get('token'); } catch { return pastedLink.trim(); }
    })());
    setSaving(true);
    try {
      const { data } = await api.post('/auth/join', {
        token: tok, name: form.name, password: form.password, position: form.position,
      });
      localStorage.setItem('rt_token', data.token);
      localStorage.setItem('rt_user',  JSON.stringify(data.user));
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const expiresIn = invite ? Math.ceil((new Date(invite.expires_at) - new Date()) / 86400000) : 0;

  /* ─── NO TOKEN: show link-paste landing ─── */
  if (!invite && !token) return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-grid" />
        <div className="hero-content">
          <div className="hero-eyebrow">ResearchTrack · Join</div>
          <h1 className="hero-headline">Join a<br /><span>Workspace</span></h1>
          <p className="hero-description">
            You've received an invite link from a workspace admin.
            Paste the full link below to verify your invitation and create your account.
          </p>
          <div className="hero-features">
            {[
              { icon:'✉️', text:'Check your email for a message with an invite link — it looks like a URL starting with https://…' },
              { icon:'🔗', text:'Copy the full link from the email and paste it in the box on the right.' },
              { icon:'🔢', text:'Got a join code instead of a link? Use the "Join via Code" option below.' },
              { icon:'🔑', text:'Already have an account? Just sign in — no need to use this page.' },
            ].map((f,i) => (
              <div key={i} className="hero-feature">
                <div className="hero-feature-dot">{f.icon}</div>
                <span style={{ fontSize:13, color:'rgba(255,255,255,0.60)', lineHeight:1.6 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-logo">R</div>
        <h1>Paste your invite link</h1>
        <p className="tagline">Copy the invite URL from your email and paste it below.</p>

        {error && <div className="notice notice-error">⚠ {error}</div>}

        <form onSubmit={handlePasteLink}>
          <div className="form-group">
            <label className="form-label">Your Invite Link</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="https://your-app.up.railway.app/join?token=abc123…"
              value={pastedLink}
              onChange={e => { setPastedLink(e.target.value); setError(''); }}
              style={{ resize:'none', fontFamily:'monospace', fontSize:12, lineHeight:1.6 }}
            />
            <div className="form-hint">
              The invite link was sent to your email by your workspace admin. It should start with https:// and contain a token= parameter.
            </div>
          </div>
          <button type="submit" className="btn btn-primary"
            style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14 }}
            disabled={pasting || !pastedLink.trim()}>
            {pasting ? '⏳ Verifying link…' : '🔍 Verify Invite Link →'}
          </button>
        </form>

        <div style={{ margin:'20px 0', borderTop:'1px solid rgba(255,255,255,0.08)' }} />

        <a href="/join-code" style={{
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          padding:'11px 16px', borderRadius:10, fontSize:13, fontWeight:600,
          border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.05)',
          color:'rgba(255,255,255,0.80)', textDecoration:'none',
          transition:'all 0.2s',
        }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.10)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
          🔢 Have a join code instead?
        </a>

        <div className="login-footer-text" style={{ marginTop:20, fontSize:11 }}>
          Already have an account?{' '}
          <a href="/login" style={{ color:'var(--accent)' }}>Sign in here</a>
        </div>
      </div>
    </div>
  );

  /* ─── TOKEN INVALID/ERROR ─── */
  if (error && !invite) return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-grid" />
        <div className="hero-content">
          <div className="hero-eyebrow">ResearchTrack · Join</div>
          <h1 className="hero-headline">Invite<br /><span>Problem</span></h1>
          <p className="hero-description">
            Your invite link couldn't be verified. This usually happens when the link has expired,
            already been used, or was copied incorrectly.
          </p>
          <div className="hero-features">
            {[
              { icon:'⏰', text:'Invite links expire after 7 days — ask your admin for a new one.' },
              { icon:'✉️', text:'Email invite links are single-use — clicking them twice invalidates the link.' },
              { icon:'🔗', text:'Make sure you copied the full URL, including the token= part at the end.' },
              { icon:'🔑', text:'If you already have an account, just sign in instead.' },
            ].map((f,i) => (
              <div key={i} className="hero-feature">
                <div className="hero-feature-dot">{f.icon}</div>
                <span style={{ fontSize:13, color:'rgba(255,255,255,0.60)', lineHeight:1.6 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="login-panel">
        <div className="login-logo">❌</div>
        <h1>Invite not valid</h1>
        <p className="tagline">{error}</p>
        <div style={{
          background:'rgba(239,68,68,0.08)', borderRadius:10, padding:'14px 16px',
          border:'1px solid rgba(239,68,68,0.22)', marginBottom:22,
        }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#f87171', marginBottom:8 }}>What to do:</div>
          <ul style={{ margin:0, paddingLeft:16, fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:2.1 }}>
            <li>Contact the person who invited you and ask for a new invite link</li>
            <li>Check your inbox for a more recent invite email</li>
            <li>If you already registered, try signing in</li>
          </ul>
        </div>
        <a href="/join" className="btn btn-primary"
          style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14, display:'flex', marginBottom:10 }}>
          ← Try a different link
        </a>
        <a href="/login" style={{
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          padding:'11px 16px', borderRadius:10, fontSize:13, fontWeight:600,
          border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.05)',
          color:'rgba(255,255,255,0.75)', textDecoration:'none',
        }}>
          Go to Sign In
        </a>
      </div>
    </div>
  );

  /* ─── VALID INVITE: show account creation form ─── */
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
            <input className="form-input" placeholder="e.g. Research Assistant, PhD Student"
              value={form.position} onChange={e=>setForm(f=>({...f,position:e.target.value}))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password <span className="form-required">*</span></label>
              <div style={{ position:'relative' }}>
                <input type={showPw?'text':'password'} className="form-input" placeholder="Min. 8 characters"
                  value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                  required style={{ paddingRight:40 }} />
                <button type="button" onClick={()=>setShowPw(s=>!s)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                            background:'none', border:'none', cursor:'pointer', fontSize:14,
                            color:'rgba(255,255,255,0.35)' }}>{showPw?'🙈':'👁'}</button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password <span className="form-required">*</span></label>
              <div style={{ position:'relative' }}>
                <input type={showCf?'text':'password'} className="form-input" placeholder="Repeat"
                  value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))}
                  required style={{ paddingRight:40 }} />
                <button type="button" onClick={()=>setShowCf(s=>!s)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                            background:'none', border:'none', cursor:'pointer', fontSize:14,
                            color:'rgba(255,255,255,0.35)' }}>{showCf?'🙈':'👁'}</button>
              </div>
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
