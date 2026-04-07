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
          <div className="hero-eyebrow">ResearchTrack</div>
          <h1 className="hero-headline">
            Research<br /><span>Expense</span><br />Tracker
          </h1>
          <p className="hero-description">
            A private, secure workspace built exclusively for research teams — track project
            budgets, submit expenses, manage reimbursements, and generate financial reports
            with one click. Trusted by researchers at universities across Bangladesh.
          </p>

          {/* What it does */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', textTransform:'uppercase',
                          letterSpacing:'0.1em', marginBottom:12 }}>
              What ResearchTrack Does
            </div>
            <div className="hero-features">
              {[
                { icon:'🔒', title:'Completely private workspace', desc:'Your workspace is fully isolated from every other institution. No university admin, no department head, no one outside your team can ever see your project finances.' },
                { icon:'💰', title:'Full budget & fund tracking', desc:'Track grant installments as they arrive, monitor remaining budget in real time, and see exactly how much has been spent vs. allocated across every project.' },
                { icon:'📊', title:'One-click PDF & Excel reports', desc:'Generate polished financial reports for your PI, university finance office, or funding body — formatted and ready to submit, in seconds.' },
                { icon:'🧾', title:'Digital expense submission', desc:'No more paper receipts or spreadsheet chaos. Researchers submit expenses digitally; admins review and track reimbursement status instantly.' },
                { icon:'👥', title:'Role-based team access', desc:'Invite researchers and collaborators with controlled access. Each person sees only the projects they are assigned to — nothing more.' },
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
          </div>

          {/* Who it's for */}
          <div style={{
            marginBottom:18, padding:'13px 16px',
            background:'rgba(255,255,255,0.04)',
            borderRadius:10, border:'1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', textTransform:'uppercase',
                          letterSpacing:'0.08em', marginBottom:10 }}>
              Built For
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {['Principal Investigators (PIs)', 'Research Fellows', 'PhD Researchers',
                'Research Assistants', 'Grant Administrators', 'Project Coordinators'].map((r,i) => (
                <span key={i} style={{
                  fontSize:11, padding:'4px 10px', borderRadius:20,
                  background:'rgba(40,233,140,0.08)', border:'1px solid rgba(40,233,140,0.18)',
                  color:'rgba(40,233,140,0.75)', fontWeight:500,
                }}>{r}</span>
              ))}
            </div>
          </div>

          {/* Data security */}
          <div style={{
            marginBottom:18, padding:'14px 18px',
            background:'rgba(255,255,255,0.05)',
            borderRadius:10, border:'1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.40)',
                          textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
              Security & Privacy
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                '🔐 All data encrypted in transit via HTTPS — always',
                '🏠 Each workspace is fully isolated — zero cross-access between institutions',
                '📋 Complete audit trail — every login, action, and change is logged',
                '🔑 Invite-only access — no one joins without an explicit admin invitation',
                '🚫 No ads. No analytics tracking. No data selling. Ever.',
                '💾 Your data belongs to you — export or delete at any time',
              ].map((t,i) => (
                <div key={i} style={{ fontSize:12, color:'rgba(255,255,255,0.55)', display:'flex', gap:8 }}>
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div style={{
            marginBottom:16, padding:'12px 16px',
            background:'rgba(255,255,255,0.03)',
            borderRadius:10, border:'1px solid rgba(255,255,255,0.06)',
            fontSize:11, color:'rgba(255,255,255,0.28)', lineHeight:1.7,
          }}>
            By accessing ResearchTrack you agree to our{' '}
            <a href="/terms" style={{ color:'rgba(40,233,140,0.55)', textDecoration:'none' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" style={{ color:'rgba(40,233,140,0.55)', textDecoration:'none' }}>Privacy Policy</a>.
            Access is restricted to authorised users only. All sessions are logged and monitored.
            Unauthorised access attempts are recorded.
          </div>

          <div style={{ fontSize:11, color:'rgba(255,255,255,0.20)' }}>
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
          By signing in you agree to our{' '}
          <a href="/terms" style={{ color:'rgba(255,255,255,0.45)' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" style={{ color:'rgba(255,255,255,0.45)' }}>Privacy Policy</a>.<br />
          ResearchTrack · Built by Tariqul Islam · © 2025 ·{' '}
          <a href="/contact" style={{ color:'rgba(255,255,255,0.45)' }}>Contact</a>
        </div>
      </div>
    </div>
  );
}
