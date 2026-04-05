import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const [form, setForm]   = useState({ email:'', password:'' });
  const [error, setError] = useState('');
  const [info, setInfo]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

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
      {/* ── Left: Marketing hero ──────────────────────────── */}
      <div className="login-hero">
        <div className="login-hero-grid" />
        <div className="login-hero-particles">
          {[...Array(8)].map((_,i) => <div key={i} className="lp-particle" />)}
        </div>

        <div className="hero-content">
          <div className="hero-eyebrow">ResearchTrack · v15</div>
          <h1 className="hero-headline">
            Research<br /><span>Expense</span><br />Tracker
          </h1>
          <p className="hero-description">
            A private, secure workspace for research teams to track project budgets,
            submit expenses, manage reimbursements, and generate financial reports —
            without the university seeing your data.
          </p>

          {/* Feature list */}
          <div className="hero-features">
            {[
              { icon:'🔒', title:'Completely private', desc:'Your workspace is isolated. No university, no department, no one else can access your data.' },
              { icon:'💰', title:'Full budget tracking', desc:'Fund installments, expense categories, reimbursement status — all in one place.' },
              { icon:'📊', title:'One-click reports', desc:'Generate PDF and Excel reports for your PI, university, or funding body instantly.' },
              { icon:'👥', title:'Team collaboration', desc:'Add researchers, assign them to projects. Each person sees only what they need.' },
            ].map((f,i) => (
              <div key={i} className="hero-feature">
                <div className="hero-feature-dot">{f.icon}</div>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:'rgba(255,255,255,0.9)', marginBottom:2 }}>
                    {f.title}
                  </div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.5 }}>
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust signals */}
          <div style={{
            marginTop:28, padding:'14px 18px',
            background:'rgba(255,255,255,0.05)',
            borderRadius:10, border:'1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.40)',
                          textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
              Data & Privacy
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                '🔐 All data encrypted in transit via HTTPS',
                '🏠 Each workspace is fully isolated — zero cross-access',
                '📋 Complete audit trail — every action is logged',
                '🚫 No ads. No data selling. Ever.',
              ].map((t,i) => (
                <div key={i} style={{ fontSize:12, color:'rgba(255,255,255,0.55)', display:'flex', gap:8 }}>
                  {t}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop:16, fontSize:11, color:'rgba(255,255,255,0.25)' }}>
            Built for researchers at DIU, BUET, DU, BRAC University and beyond.<br />
            Developed by Tariqul Islam · Faculty of Graduate Studies, DIU
          </div>
        </div>
      </div>

      {/* ── Right: Login form ─────────────────────────────── */}
      <div className="login-panel">
        <div className="mobile-login-hero-strip">
          <div className="m-eyebrow">ResearchTrack</div>
          <div className="m-headline">Research<br /><span>Expense</span><br />Tracker</div>
          <p className="m-desc">Private workspace for research project budgets and expense tracking.</p>
          <div className="m-stats">
            <div className="m-stat"><div className="m-stat-val">🔒</div><div className="m-stat-lbl">Private</div></div>
            <div className="m-stat"><div className="m-stat-val">📊</div><div className="m-stat-lbl">Reports</div></div>
            <div className="m-stat"><div className="m-stat-val">👥</div><div className="m-stat-lbl">Teams</div></div>
          </div>
        </div>

        <div className="login-logo">R</div>
        <h1>Welcome back</h1>
        <p className="tagline">Sign in to your ResearchTrack workspace.</p>

        {info  && <div className="notice notice-success">✓ {info}</div>}
        {error && <div className="notice notice-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address <span className="form-required">*</span></label>
            <input type="email" className="form-input" placeholder="you@university.edu"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email:e.target.value }))}
              required autoFocus />
          </div>

          <div className="form-group" style={{ marginBottom:8 }}>
            <label className="form-label">
              Password <span className="form-required">*</span>
              <Link to="/forgot-password"
                style={{ float:'right', fontSize:12, color:'var(--accent)', fontWeight:400 }}>
                Forgot password?
              </Link>
            </label>
            <div style={{ position:'relative' }}>
              <input type={showPw ? 'text' : 'password'} className="form-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password:e.target.value }))}
                required style={{ paddingRight:44 }} />
              <button type="button" onClick={() => setShowPw(s=>!s)}
                style={{
                  position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer',
                  fontSize:14, color:'rgba(255,255,255,0.40)',
                }}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary"
            style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14, marginTop:16 }}
            disabled={loading}>
            {loading ? '⏳ Signing in…' : 'Sign In →'}
          </button>
        </form>

        <div style={{
          margin:'24px 0', border:'none', borderTop:'1px solid rgba(255,255,255,0.08)',
        }} />

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <Link to="/request-access" style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            padding:'11px 16px', borderRadius:10, fontSize:13, fontWeight:600,
            border:'1px solid rgba(255,255,255,0.14)',
            background:'rgba(255,255,255,0.05)',
            color:'rgba(255,255,255,0.80)', textDecoration:'none',
            transition:'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.10)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
            🆕 Request Access — Create Workspace
          </Link>
          <Link to="/join" style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            padding:'11px 16px', borderRadius:10, fontSize:13, fontWeight:600,
            border:'1px solid rgba(255,255,255,0.14)',
            background:'rgba(255,255,255,0.05)',
            color:'rgba(255,255,255,0.80)', textDecoration:'none',
            transition:'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.10)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
            ✉️ Join via Invite Link
          </Link>
        </div>

        <div className="login-footer-text" style={{ marginTop:24, fontSize:11 }}>
          🔒 Authorized users only. All access is logged and monitored.<br />
          By signing in you agree to our Terms of Service and Privacy Policy.<br />
          ResearchTrack · Built by Tariqul Islam · © 2025
        </div>
      </div>
    </div>
  );
}
