import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';

function CountdownTimer({ expiresAt }) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt) - Date.now();
      if (diff <= 0) { setLeft('Expired'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000)  / 60000);
      if (d > 0) setLeft(`${d}d ${h}h remaining`);
      else if (h > 0) setLeft(`${h}h ${m}m remaining`);
      else setLeft(`${m} minutes remaining`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return <span>{left}</span>;
}

export default function JoinViaLink() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const token     = params.get('token');

  const [invite, setInvite]   = useState(null);
  const [status, setStatus]   = useState('loading'); // loading | valid | error | success
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm]       = useState({ name:'', password:'', confirm:'', position:'' });
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('No invite token found in this link. Please ask for a new one.'); return; }
    api.get(`/auth/join?token=${token}`)
      .then(r => { setInvite(r.data); setStatus('valid'); })
      .catch(e => {
        setStatus('error');
        setErrorMsg(e.response?.data?.error || 'This invite link is invalid or has expired.');
      });
  }, [token]);

  const handleSubmit = async e => {
    e.preventDefault(); setFormError('');
    if (!form.name.trim()) return setFormError('Please enter your full name.');
    if (form.password.length < 8) return setFormError('Password must be at least 8 characters.');
    if (form.password !== form.confirm) return setFormError('Passwords do not match.');
    setSaving(true);
    try {
      const { data } = await api.post('/auth/join', {
        token, name: form.name.trim(),
        password: form.password,
        position: form.position.trim(),
      });
      localStorage.setItem('rt_token', data.token);
      localStorage.setItem('rt_user',  JSON.stringify(data.user));
      setStatus('success');
      setTimeout(() => { navigate('/'); window.location.reload(); }, 1500);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally { setSaving(false); }
  };

  // ── Loading state ──────────────────────────────────────────────
  if (status === 'loading') return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#020c07', flexDirection:'column', gap:16,
    }}>
      <div className="spinner" />
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:14 }}>Validating your invite…</p>
    </div>
  );

  // ── Error state ────────────────────────────────────────────────
  if (status === 'error') return (
    <div style={{
      minHeight:'100vh', background:'#020c07',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'24px',
    }}>
      <div style={{
        maxWidth:420, width:'100%', textAlign:'center',
        background:'rgba(255,255,255,0.05)', borderRadius:20,
        border:'1px solid rgba(255,255,255,0.10)', padding:'48px 32px',
        backdropFilter:'blur(20px)',
      }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔗</div>
        <h2 style={{ color:'#fff', margin:'0 0 12px', fontSize:22, fontWeight:700 }}>
          Link Problem
        </h2>
        <p style={{ color:'rgba(255,255,255,0.55)', fontSize:14, lineHeight:1.7, marginBottom:28 }}>
          {errorMsg}
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <a href="/login" style={{
            display:'block', padding:'12px', borderRadius:10, textDecoration:'none',
            background:'rgba(40,233,140,1)', color:'#0d1f17',
            fontWeight:700, fontSize:14,
          }}>Sign In Instead</a>
          <a href="/request-access" style={{
            display:'block', padding:'12px', borderRadius:10, textDecoration:'none',
            background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.80)',
            fontWeight:600, fontSize:14, border:'1px solid rgba(255,255,255,0.12)',
          }}>Request Access</a>
        </div>
        <p style={{ color:'rgba(255,255,255,0.25)', fontSize:12, marginTop:20 }}>
          If you believe this is a mistake, ask your admin to generate a new invite link for you.
        </p>
      </div>
    </div>
  );

  // ── Success state ──────────────────────────────────────────────
  if (status === 'success') return (
    <div style={{
      minHeight:'100vh', background:'#020c07',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'24px',
    }}>
      <div style={{ maxWidth:420, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
        <h2 style={{ color:'#fff', margin:'0 0 12px', fontSize:24, fontWeight:800 }}>
          Welcome aboard!
        </h2>
        <p style={{ color:'rgba(255,255,255,0.55)', fontSize:14 }}>
          Your account is ready. Taking you to your dashboard…
        </p>
        <div className="spinner" style={{ margin:'24px auto 0' }} />
      </div>
    </div>
  );

  // ── Valid invite — main join page ──────────────────────────────
  const expiresUrgent = new Date(invite.expires_at) - Date.now() < 86400000; // < 1 day

  return (
    <div style={{ minHeight:'100vh', background:'#020c07', position:'relative', overflow:'hidden' }}>
      {/* Background */}
      <div style={{
        position:'fixed', inset:0, zIndex:0,
        background:`
          radial-gradient(ellipse 80% 60% at 20% 10%, rgba(40,233,140,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 80% 80%, rgba(124,58,237,0.10) 0%, transparent 55%),
          #020c07`,
      }} />

      <div style={{
        position:'relative', zIndex:1,
        minHeight:'100vh', display:'flex', alignItems:'center',
        justifyContent:'center', padding:'24px',
      }}>
        <div style={{ maxWidth:880, width:'100%' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)',
              borderRadius:20, padding:'6px 14px', marginBottom:20,
            }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#28e98c',
                             boxShadow:'0 0 8px rgba(40,233,140,0.6)', display:'inline-block' }} />
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.60)', fontWeight:500 }}>
                Private Invite
              </span>
            </div>
            <h1 style={{ color:'#fff', fontSize:32, fontWeight:800, margin:'0 0 12px',
                         letterSpacing:'-0.03em' }}>
              You've been invited to join
            </h1>
            <div style={{
              fontSize:28, fontWeight:800, color:'#28e98c', margin:'0 0 8px',
              letterSpacing:'-0.02em',
            }}>
              {invite.workspace_name}
            </div>
            {invite.report_header && invite.report_header !== invite.workspace_name && (
              <div style={{ fontSize:14, color:'rgba(255,255,255,0.40)', marginBottom:8 }}>
                {invite.report_header}
              </div>
            )}
          </div>

          {/* Info cards row */}
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',
            gap:12, marginBottom:36,
          }}>
            {[
              {
                icon:'📧',
                label:'Invited Email',
                value: invite.email,
                note: 'This account will be tied to this email address',
              },
              {
                icon:'👤',
                label:'Your Role',
                value: invite.role === 'admin' ? 'Administrator' : 'Researcher',
                note: invite.role === 'admin'
                  ? 'Full access to manage projects and team'
                  : 'Access to assigned projects only',
              },
              invite.project_name && {
                icon:'📁',
                label:'Auto-joined Project',
                value: invite.project_name,
                note: "You'll be added to this project immediately",
              },
              {
                icon:'⏰',
                label:'Invite Expires',
                value: <CountdownTimer expiresAt={invite.expires_at} />,
                note: 'Complete registration before it expires',
                warn: expiresUrgent,
              },
            ].filter(Boolean).map((item, i) => (
              <div key={i} style={{
                background: item.warn
                  ? 'rgba(239,68,68,0.10)'
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${item.warn ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.10)'}`,
                borderRadius:12, padding:'14px 16px',
                backdropFilter:'blur(10px)',
              }}>
                <div style={{ fontSize:20, marginBottom:8 }}>{item.icon}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.40)',
                              textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
                  {item.label}
                </div>
                <div style={{ fontSize:14, fontWeight:600,
                              color: item.warn ? '#f87171' : '#fff',
                              marginBottom:4 }}>
                  {item.value}
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.30)', lineHeight:1.5 }}>
                  {item.note}
                </div>
              </div>
            ))}
          </div>

          {/* Main content: explanation + form side by side */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>

            {/* Left: What you're joining */}
            <div style={{
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:16, padding:'28px',
              backdropFilter:'blur(16px)',
            }}>
              <h3 style={{ color:'#fff', margin:'0 0 20px', fontSize:16, fontWeight:700 }}>
                What is ResearchTrack?
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {[
                  {
                    icon:'💰',
                    title:'Budget Management',
                    desc:'Track your project budget, fund installments received, and remaining balance in real time.',
                  },
                  {
                    icon:'🧾',
                    title:'Expense Submission',
                    desc:'Submit your field expenses, transportation, printing and other costs digitally — no paper receipts.',
                  },
                  {
                    icon:'✅',
                    title:'Reimbursement Tracking',
                    desc:'Know exactly which of your expenses have been reimbursed and which are still pending.',
                  },
                  {
                    icon:'📊',
                    title:'Financial Reports',
                    desc:'Download PDF and Excel reports for your PI or funding body with one click.',
                  },
                  {
                    icon:'🔒',
                    title:'Private & Secure',
                    desc:"Your workspace data is completely private. Nobody outside your team can see your project finances.",
                  },
                ].map((f,i) => (
                  <div key={i} style={{ display:'flex', gap:12 }}>
                    <div style={{
                      width:36, height:36, borderRadius:8, flexShrink:0,
                      background:'rgba(40,233,140,0.12)',
                      border:'1px solid rgba(40,233,140,0.20)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:16,
                    }}>{f.icon}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.85)',
                                    marginBottom:3 }}>
                        {f.title}
                      </div>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,0.40)', lineHeight:1.6 }}>
                        {f.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Registration form */}
            <div style={{
              background:'rgba(255,255,255,0.06)',
              border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:16, padding:'28px',
              backdropFilter:'blur(20px)',
            }}>
              <h3 style={{ color:'#fff', margin:'0 0 6px', fontSize:18, fontWeight:700 }}>
                Complete your account
              </h3>
              <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13, margin:'0 0 20px', lineHeight:1.6 }}>
                Your email <strong style={{ color:'rgba(255,255,255,0.80)' }}>{invite.email}</strong> is
                pre-confirmed. Just set your name and password.
              </p>

              {formError && (
                <div style={{
                  background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)',
                  borderRadius:8, padding:'10px 14px', fontSize:13, color:'#f87171', marginBottom:16,
                }}>
                  ⚠ {formError}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Email — locked */}
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, color:'rgba(255,255,255,0.50)',
                                  fontWeight:600, textTransform:'uppercase',
                                  letterSpacing:'0.06em', marginBottom:6 }}>
                    Email Address
                  </label>
                  <div style={{
                    padding:'10px 12px', borderRadius:8, fontSize:13,
                    background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(255,255,255,0.10)',
                    color:'rgba(255,255,255,0.40)',
                    display:'flex', alignItems:'center', gap:8,
                  }}>
                    <span style={{ fontSize:14 }}>🔒</span>
                    <span>{invite.email}</span>
                    <span style={{ marginLeft:'auto', fontSize:11,
                                   color:'rgba(40,233,140,0.7)', fontWeight:600 }}>
                      Pre-confirmed
                    </span>
                  </div>
                </div>

                {/* Name */}
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, color:'rgba(255,255,255,0.55)',
                                  fontWeight:600, textTransform:'uppercase',
                                  letterSpacing:'0.06em', marginBottom:6 }}>
                    Your Full Name <span style={{ color:'#ef4444' }}>*</span>
                  </label>
                  <input
                    style={{
                      width:'100%', padding:'10px 12px', borderRadius:8, fontSize:13,
                      background:'rgba(255,255,255,0.06)', color:'#fff',
                      border:'1px solid rgba(255,255,255,0.14)', outline:'none',
                      boxSizing:'border-box',
                    }}
                    placeholder="e.g. Tariqul Islam"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name:e.target.value }))}
                    required autoFocus
                  />
                </div>

                {/* Position */}
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, color:'rgba(255,255,255,0.55)',
                                  fontWeight:600, textTransform:'uppercase',
                                  letterSpacing:'0.06em', marginBottom:6 }}>
                    Your Role / Position
                  </label>
                  <input
                    style={{
                      width:'100%', padding:'10px 12px', borderRadius:8, fontSize:13,
                      background:'rgba(255,255,255,0.06)', color:'#fff',
                      border:'1px solid rgba(255,255,255,0.14)', outline:'none',
                      boxSizing:'border-box',
                    }}
                    placeholder="e.g. Research Assistant, PhD Researcher"
                    value={form.position}
                    onChange={e => setForm(f => ({ ...f, position:e.target.value }))}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, color:'rgba(255,255,255,0.55)',
                                  fontWeight:600, textTransform:'uppercase',
                                  letterSpacing:'0.06em', marginBottom:6 }}>
                    Password <span style={{ color:'#ef4444' }}>*</span>
                  </label>
                  <input type="password"
                    style={{
                      width:'100%', padding:'10px 12px', borderRadius:8, fontSize:13,
                      background:'rgba(255,255,255,0.06)', color:'#fff',
                      border:'1px solid rgba(255,255,255,0.14)', outline:'none',
                      boxSizing:'border-box',
                    }}
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password:e.target.value }))}
                    required
                  />
                </div>

                <div style={{ marginBottom:20 }}>
                  <label style={{ display:'block', fontSize:12, color:'rgba(255,255,255,0.55)',
                                  fontWeight:600, textTransform:'uppercase',
                                  letterSpacing:'0.06em', marginBottom:6 }}>
                    Confirm Password <span style={{ color:'#ef4444' }}>*</span>
                  </label>
                  <input type="password"
                    style={{
                      width:'100%', padding:'10px 12px', borderRadius:8, fontSize:13,
                      background:'rgba(255,255,255,0.06)', color:'#fff',
                      border:'1px solid rgba(255,255,255,0.14)', outline:'none',
                      boxSizing:'border-box',
                    }}
                    placeholder="Repeat your password"
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm:e.target.value }))}
                    required
                  />
                </div>

                <button type="submit"
                  disabled={saving}
                  style={{
                    width:'100%', padding:'13px', borderRadius:10, fontSize:14,
                    fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer',
                    background: saving ? 'rgba(40,233,140,0.5)' : '#28e98c',
                    color:'#0d1f17', border:'none',
                    transition:'all 0.2s',
                    boxShadow: saving ? 'none' : '0 4px 20px rgba(40,233,140,0.35)',
                  }}>
                  {saving ? '⏳ Creating account…' : 'Create Account & Join →'}
                </button>
              </form>

              <div style={{ marginTop:16, padding:'12px 14px', borderRadius:8,
                            background:'rgba(255,255,255,0.03)',
                            border:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.30)', lineHeight:1.7 }}>
                  🔒 By creating an account you agree to use this platform responsibly.<br />
                  This invite is single-use and tied to <strong style={{ color:'rgba(255,255,255,0.45)' }}>{invite.email}</strong>.
                  It cannot be transferred.
                </div>
              </div>

              <div style={{ marginTop:12, textAlign:'center' }}>
                <a href="/login" style={{ fontSize:12, color:'rgba(255,255,255,0.30)',
                                         textDecoration:'none' }}>
                  Already have an account? Sign in
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign:'center', marginTop:32,
                        fontSize:12, color:'rgba(255,255,255,0.20)' }}>
            ResearchTrack · Built by Tariqul Islam · © 2025<br />
            Your data is private and encrypted in transit.
          </div>
        </div>
      </div>
    </div>
  );
}
