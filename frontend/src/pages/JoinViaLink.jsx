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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [showCf, setShowCf]   = useState(false);

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
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setSaving(true);
    try {
      const { data } = await api.post('/auth/join', {
        token, name: form.name, password: form.password, position: form.position,
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

  if (error && !invite) return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-grid" />
        <div className="hero-content">
          <div className="hero-eyebrow">ResearchTrack</div>
          <h1 className="hero-headline">Invite<br /><span>Problem</span></h1>
          <p className="hero-description">
            Your invite link could not be verified. This usually happens when the
            link has expired, already been used, or was copied incorrectly from
            the email.
          </p>
          <div className="hero-features" style={{ marginTop:28 }}>
            {[
              { icon:'⏰', text:'Invite links expire after 7 days. Ask your workspace admin to send a fresh one.' },
              { icon:'✉️', text:'Email invite links are single-use — clicking them twice will invalidate the link.' },
              { icon:'🔗', text:'Make sure you copied the full URL. Some email clients truncate long links.' },
              { icon:'🔑', text:'If you already registered before, just sign in — no need to use the link again.' },
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
        <div className="login-logo" style={{ fontSize:32 }}>⚠️</div>
        <h1>Invite not valid</h1>
        <p className="tagline">{error}</p>
        <div style={{
          background:'rgba(239,68,68,0.10)', borderRadius:10, padding:'16px',
          border:'1px solid rgba(239,68,68,0.25)', marginBottom:24,
        }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#f87171', marginBottom:8 }}>What you can do:</div>
          <ul style={{ margin:0, paddingLeft:18, fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:2.1 }}>
            <li>Contact whoever invited you and ask for a <strong style={{ color:'rgba(255,255,255,0.8)' }}>new invite link</strong></li>
            <li>Check your inbox for a more recent invite email</li>
            <li>If you already have an account, sign in directly</li>
            <li>Got a join code instead? Use that below</li>
          </ul>
        </div>
        <a href="/login" className="btn btn-primary"
          style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14, display:'flex', marginBottom:10 }}>
          Go to Sign In →
        </a>
        <a href="/join-code" style={{
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          padding:'11px 16px', borderRadius:10, fontSize:13, fontWeight:600,
          border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.05)',
          color:'rgba(255,255,255,0.80)', textDecoration:'none',
        }}>
          🔢 Have a join code instead?
        </a>
      </div>
    </div>
  );

  const expiresIn = invite ? Math.ceil((new Date(invite.expires_at) - new Date()) / 86400000) : 0;
  const isExpiringSoon = expiresIn <= 1;
  const roleLabel = invite?.role === 'admin' ? 'Administrator' : 'Researcher';
  const roleFeatures = invite?.role === 'admin' ? [
    { icon:'🛠', text:'Manage all projects, members, and workspace settings' },
    { icon:'📊', text:'Generate PDF and Excel financial reports for your PI or funding body' },
    { icon:'👥', text:'Invite new team members and assign them to specific projects' },
    { icon:'💰', text:'Approve expenses, track installments and reimbursements' },
  ] : [
    { icon:'📁', text:'View and contribute to projects you are assigned to' },
    { icon:'💸', text:'Submit expense claims and track your reimbursement status' },
    { icon:'📊', text:'See your expense history and project budget usage' },
    { icon:'🔒', text:'Your data is fully private — only visible within this workspace' },
  ];

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-grid" />
        <div className="hero-content">
          <div className="hero-eyebrow">You've been invited to join</div>
          <h1 className="hero-headline">
            {invite?.workspace_name}<br /><span>ResearchTrack</span>
          </h1>
          {invite?.report_header && invite.report_header !== invite.workspace_name && (
            <p className="hero-description" style={{ opacity:0.65, marginTop:4 }}>{invite.report_header}</p>
          )}

          <div style={{
            marginTop:24, padding:'14px 18px',
            background:'rgba(40,233,140,0.07)', border:'1px solid rgba(40,233,140,0.18)',
            borderRadius:12,
          }}>
            <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase',
                          letterSpacing:'0.08em', color:'rgba(40,233,140,0.70)', marginBottom:12 }}>
              Invite Details
            </div>
            {[
              { icon:'✉️', label:'Invited email', value: invite?.email },
              { icon:'🎭', label:'Your role',     value: roleLabel,
                badge: invite?.role==='admin' ? { text:'Full access', color:'#a78bfa' } : { text:'Researcher', color:'#28e98c' } },
              invite?.project_name && { icon:'📁', label:'Auto-joined project', value: invite.project_name },
              { icon:'⏳', label:'Link expires in',
                value: expiresIn <= 0 ? 'Expires today!' : `${expiresIn} day${expiresIn!==1?'s':''}`,
                warn: isExpiringSoon },
            ].filter(Boolean).map((item,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:15, width:22, textAlign:'center', flexShrink:0 }}>{item.icon}</span>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.38)', minWidth:110, flexShrink:0 }}>{item.label}</span>
                <span style={{ fontSize:13, fontWeight:600, color: item.warn ? '#fbbf24' : '#fff' }}>
                  {item.value}
                </span>
                {item.badge && (
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20,
                                 background: item.badge.color+'22', color: item.badge.color,
                                 border:`1px solid ${item.badge.color}44`, fontWeight:600, marginLeft:'auto' }}>
                    {item.badge.text}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop:24 }}>
            <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase',
                          letterSpacing:'0.08em', color:'rgba(255,255,255,0.30)', marginBottom:14 }}>
              What you'll have access to
            </div>
            <div className="hero-features">
              {roleFeatures.map((f,i) => (
                <div key={i} className="hero-feature">
                  <div className="hero-feature-dot">{f.icon}</div>
                  <span style={{ fontSize:13, color:'rgba(255,255,255,0.58)', lineHeight:1.5 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-logo">R</div>
        <h1>Complete your account</h1>
        <p className="tagline">
          Joining <strong style={{ color:'rgba(255,255,255,0.85)' }}>{invite?.workspace_name}</strong> as{' '}
          <strong style={{ color: invite?.role==='admin' ? '#a78bfa' : '#28e98c' }}>{roleLabel}</strong>
        </p>

        {error && <div className="notice notice-error">⚠ {error}</div>}

        {isExpiringSoon && (
          <div style={{
            background:'rgba(251,191,36,0.10)', border:'1px solid rgba(251,191,36,0.30)',
            color:'#fbbf24', borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:16,
          }}>
            ⚡ This invite expires {expiresIn<=0?'today':'tomorrow'} — complete your account now!
          </div>
        )}

        <div style={{
          display:'flex', alignItems:'center', gap:10,
          background:'rgba(40,233,140,0.07)', borderRadius:9,
          padding:'11px 14px', marginBottom:20,
          border:'1px solid rgba(40,233,140,0.18)',
        }}>
          <span style={{ fontSize:18 }}>📧</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.32)', textTransform:'uppercase',
                          letterSpacing:'0.07em', marginBottom:2 }}>
              Your email (pre-set, cannot be changed)
            </div>
            <div style={{ fontWeight:700, color:'#fff', fontSize:13 }}>{invite?.email}</div>
          </div>
          <span style={{ fontSize:10, padding:'3px 8px', borderRadius:6,
                         background:'rgba(40,233,140,0.15)', color:'#28e98c', fontWeight:600 }}>
            Locked
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Your Full Name <span className="form-required">*</span></label>
            <input className="form-input" placeholder="e.g. Dr. Tariqul Islam"
              value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              required autoFocus />
            <div className="form-hint">Visible to all members of this workspace.</div>
          </div>
          <div className="form-group">
            <label className="form-label">Your Position / Designation</label>
            <input className="form-input"
              placeholder="e.g. PhD Student, Research Assistant, Co-PI, Lecturer"
              value={form.position} onChange={e=>setForm(f=>({...f,position:e.target.value}))} />
            <div className="form-hint">Optional — helps your team understand your role.</div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Create Password <span className="form-required">*</span></label>
              <div style={{ position:'relative' }}>
                <input type={showPw?'text':'password'} className="form-input"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                  required style={{ paddingRight:40 }} />
                <button type="button" onClick={()=>setShowPw(s=>!s)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                            background:'none', border:'none', cursor:'pointer',
                            fontSize:14, color:'rgba(255,255,255,0.35)' }}>
                  {showPw?'🙈':'👁'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password <span className="form-required">*</span></label>
              <div style={{ position:'relative' }}>
                <input type={showCf?'text':'password'} className="form-input"
                  placeholder="Repeat password"
                  value={form.confirm}
                  onChange={e=>setForm(f=>({...f,confirm:e.target.value}))}
                  required style={{ paddingRight:40 }} />
                <button type="button" onClick={()=>setShowCf(s=>!s)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                            background:'none', border:'none', cursor:'pointer',
                            fontSize:14, color:'rgba(255,255,255,0.35)' }}>
                  {showCf?'🙈':'👁'}
                </button>
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary"
            style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:14, marginTop:4 }}
            disabled={saving}>
            {saving ? '⏳ Creating your account…' : '✓ Create Account & Join →'}
          </button>
        </form>

        <div style={{
          marginTop:20, padding:'12px 14px', borderRadius:9,
          background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
          fontSize:12, color:'rgba(255,255,255,0.30)', lineHeight:1.7,
        }}>
          🔒 Your account is private to this workspace. All activity is logged for audit purposes.
        </div>
        <div className="login-footer-text" style={{ marginTop:14, fontSize:11 }}>
          Already have an account? <a href="/login" style={{ color:'var(--accent)' }}>Sign in instead</a>
        </div>
      </div>
    </div>
  );
}
