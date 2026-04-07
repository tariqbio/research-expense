import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo]   = useState('');
  const [loading, setLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    if (params.get('reset') === '1') setInfo('Password reset successfully. You can now sign in.');
    const t = setInterval(() => setActiveFeature(f => (f + 1) % 4), 3500);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(form.email, form.password); navigate('/'); }
    catch (err) { setError(err.response?.data?.error || 'Incorrect email or password.'); }
    finally { setLoading(false); }
  };

  const features = [
    { icon:'📁', title:'Project Budget Control', desc:'Set total budgets, receive funds by installment, and track every taka in real time.' },
    { icon:'🔬', title:'Research Expense Tracking', desc:'Categorize, submit and approve research expenses with full audit trail.' },
    { icon:'👥', title:'Team Collaboration', desc:'Add researchers via invite link or code. Role-based access keeps data secure.' },
    { icon:'📊', title:'Instant Reports', desc:'Generate formatted expense reports with your institution header in one click.' },
  ];

  const howItWorks = [
    { step:'01', title:'Register & Request', desc:'Create your workspace and submit an access request. Takes 2 minutes.' },
    { step:'02', title:'Get Approved', desc:'The platform admin reviews and approves your workspace — usually within 24 hours.' },
    { step:'03', title:'Add Your Team', desc:'Invite co-PIs and researchers via secure invite links or shareable codes.' },
    { step:'04', title:'Track Everything', desc:'Log expenses, receive funds, generate reports, stay audit-ready anytime.' },
  ];

  const testimonials = [
    { name:'Dr. Karim', role:'Professor, CSE', org:'BUET', text:'Finally a system that understands how research funding actually works — installment tracking is a lifesaver.' },
    { name:'Dr. Sultana', role:'Research Fellow', org:'DIU FGS', text:'The expense report export is exactly what our department needs for internal audits. Clean, professional.' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#080f1a', color:'#fff', fontFamily:'system-ui, sans-serif' }}>

      {/* ── Sticky Nav ─────────────────────────────── */}
      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(8,15,26,0.88)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.07)',
        padding:'0 40px', height:56,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8,
                        background:'linear-gradient(135deg,#28e98c,#1bc47d)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:14, fontWeight:800, color:'#0d1f17' }}>R</div>
          <span style={{ fontWeight:700, fontSize:14 }}>ResearchTrack</span>
          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20,
                         background:'rgba(40,233,140,0.12)', color:'#28e98c',
                         border:'1px solid rgba(40,233,140,0.25)', fontWeight:600 }}>
            Universal Edition
          </span>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <a href="#how-it-works" style={{ fontSize:13, color:'rgba(255,255,255,0.5)', textDecoration:'none' }}
             onClick={e => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth'}); }}>
            How it works
          </a>
          <a href="#security" style={{ fontSize:13, color:'rgba(255,255,255,0.5)', textDecoration:'none' }}
             onClick={e => { e.preventDefault(); document.getElementById('security')?.scrollIntoView({behavior:'smooth'}); }}>
            Security
          </a>
          <Link to="/request-access" style={{
            fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:8,
            background:'rgba(40,233,140,0.12)', border:'1px solid rgba(40,233,140,0.25)',
            color:'#28e98c', textDecoration:'none',
          }}>Request Access</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────── */}
      <section style={{
        display:'grid', gridTemplateColumns:'1fr 420px', gap:0,
        minHeight:'calc(100vh - 56px)', alignItems:'stretch',
        maxWidth:1200, margin:'0 auto', padding:'0 40px',
      }}>
        {/* Left: marketing */}
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', paddingRight:60, paddingTop:60, paddingBottom:60 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
                        color:'#28e98c', marginBottom:20 }}>
            Research Expense Management Platform
          </div>
          <h1 style={{ fontSize:58, fontWeight:900, lineHeight:1.0, letterSpacing:'-0.04em',
                       margin:'0 0 24px', color:'#fff' }}>
            Every taka,<br />
            <span style={{ background:'linear-gradient(135deg,#28e98c,#1bc47d,#34d399)',
                            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                            backgroundClip:'text' }}>
              accounted for.
            </span>
          </h1>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.50)', lineHeight:1.8,
                       maxWidth:480, margin:'0 0 40px' }}>
            ResearchTrack is built for Principal Investigators, research fellows, and their
            teams. Manage project budgets, track expense submissions, log fund installments,
            and generate audit-ready reports — all in one private workspace.
          </p>

          {/* Feature carousel */}
          <div style={{ marginBottom:40, background:'rgba(255,255,255,0.03)',
                        border:'1px solid rgba(255,255,255,0.08)',
                        borderRadius:14, padding:'20px 24px', minHeight:90 }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: activeFeature === i ? 'flex' : 'none',
                alignItems:'flex-start', gap:14,
                animation: 'fadeIn 0.4s ease',
              }}>
                <div style={{ fontSize:26 }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:'#fff', marginBottom:4 }}>{f.title}</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', lineHeight:1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
            {/* Dots */}
            <div style={{ display:'flex', gap:6, marginTop:12 }}>
              {features.map((_,i) => (
                <div key={i} onClick={() => setActiveFeature(i)} style={{
                  width: activeFeature===i ? 20 : 6,
                  height:6, borderRadius:3, cursor:'pointer',
                  background: activeFeature===i ? '#28e98c' : 'rgba(255,255,255,0.2)',
                  transition:'all 0.3s ease',
                }} />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {[
              { val:'100%', lbl:'Audit Trail' },
              { val:'Real-time', lbl:'Budget View' },
              { val:'Secure', lbl:'Role-based Access' },
              { val:'Private', lbl:'Your Data, Your Workspace' },
            ].map(({ val, lbl }) => (
              <div key={lbl} style={{
                padding:'14px 20px',
                background:'rgba(40,233,140,0.05)',
                border:'1px solid rgba(40,233,140,0.15)',
                borderRadius:12,
              }}>
                <div style={{ fontSize:20, fontWeight:800, color:'#28e98c', letterSpacing:'-0.03em' }}>{val}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.30)', textTransform:'uppercase',
                               letterSpacing:'0.08em', marginTop:3 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: login form */}
        <div style={{ display:'flex', alignItems:'center', paddingTop:40, paddingBottom:40 }}>
          <div style={{
            width:'100%', background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.10)',
            borderRadius:20, padding:'36px 32px',
            backdropFilter:'blur(24px)',
            boxShadow:'0 24px 60px rgba(0,0,0,0.40)',
          }}>
            <div style={{ width:44, height:44, borderRadius:12,
                          background:'linear-gradient(135deg,#28e98c,#1bc47d)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:20, fontWeight:800, color:'#0d1f17', marginBottom:24 }}>R</div>
            <h2 style={{ fontSize:24, fontWeight:800, color:'#fff', letterSpacing:'-0.03em',
                          margin:'0 0 6px' }}>Welcome back</h2>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.40)', margin:'0 0 28px', lineHeight:1.5 }}>
              Sign in to your ResearchTrack workspace.
            </p>

            {info  && <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(22,163,74,0.12)',
                                     border:'1px solid rgba(22,163,74,0.25)', color:'#4ade80',
                                     fontSize:13, marginBottom:16 }}>✓ {info}</div>}
            {error && <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,0.12)',
                                     border:'1px solid rgba(239,68,68,0.25)', color:'#f87171',
                                     fontSize:13, marginBottom:16 }}>⚠ {error}</div>}

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.55)',
                                  textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>
                  Email Address
                </label>
                <input type="email" placeholder="you@institution.edu" required autoFocus
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{
                    width:'100%', padding:'11px 14px', fontSize:14,
                    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                    borderRadius:10, color:'#fff', outline:'none', boxSizing:'border-box',
                  }} />
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.55)',
                                    textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    Password
                  </label>
                  <Link to="/forgot-password" style={{ fontSize:12, color:'#28e98c', textDecoration:'none' }}>
                    Forgot password?
                  </Link>
                </div>
                <input type="password" placeholder="Enter your password" required
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{
                    width:'100%', padding:'11px 14px', fontSize:14,
                    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                    borderRadius:10, color:'#fff', outline:'none', boxSizing:'border-box',
                  }} />
              </div>

              <button type="submit" disabled={loading} style={{
                width:'100%', padding:'12px', fontSize:14, fontWeight:700,
                background: loading ? 'rgba(40,233,140,0.4)' : 'linear-gradient(135deg,#28e98c,#1bc47d)',
                border:'none', borderRadius:10, color:'#0d1f17', cursor: loading ? 'not-allowed':'pointer',
                marginTop:4, transition:'opacity 0.2s',
              }}>
                {loading ? '⏳ Verifying…' : 'Sign In →'}
              </button>
            </form>

            <div style={{ marginTop:20, padding:'14px', borderRadius:10,
                          background:'rgba(40,233,140,0.04)', border:'1px solid rgba(40,233,140,0.10)',
                          fontSize:12, color:'rgba(255,255,255,0.35)', lineHeight:1.7 }}>
              Don't have an account?{' '}
              <Link to="/request-access" style={{ color:'#28e98c', textDecoration:'none', fontWeight:600 }}>
                Request Access
              </Link>
              <br />
              Have an invite link?{' '}
              <Link to="/join" style={{ color:'#28e98c', textDecoration:'none' }}>
                Join via link
              </Link>
            </div>

            <div style={{ marginTop:16, fontSize:11, color:'rgba(255,255,255,0.20)',
                           textAlign:'center', lineHeight:1.7 }}>
              🔒 All sessions are encrypted and logged.<br />
              ResearchTrack · Universal Edition · 2025<br />
              Developed by <strong style={{ color:'rgba(255,255,255,0.35)' }}>Tariqul Islam</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it Works ──────────────────────────── */}
      <section id="how-it-works" style={{
        padding:'80px 40px', maxWidth:1200, margin:'0 auto',
        borderTop:'1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
                        color:'#28e98c', marginBottom:12 }}>Simple Process</div>
          <h2 style={{ fontSize:40, fontWeight:900, letterSpacing:'-0.03em', margin:'0 0 14px' }}>
            How ResearchTrack works
          </h2>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.40)', maxWidth:500, margin:'0 auto' }}>
            From registration to your first expense report in under a day.
          </p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:24 }}>
          {howItWorks.map((h, i) => (
            <div key={i} style={{
              padding:'28px 24px',
              background:'rgba(255,255,255,0.03)',
              border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:16,
              position:'relative', overflow:'hidden',
            }}>
              <div style={{ fontSize:48, fontWeight:900, color:'rgba(40,233,140,0.08)',
                             position:'absolute', top:10, right:16, lineHeight:1 }}>{h.step}</div>
              <div style={{ fontSize:28, fontWeight:900, color:'#28e98c', marginBottom:12,
                             letterSpacing:'-0.04em' }}>{h.step}</div>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:8 }}>{h.title}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.42)', lineHeight:1.7 }}>{h.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Detail ────────────────────────── */}
      <section style={{
        padding:'60px 40px', maxWidth:1200, margin:'0 auto',
        borderTop:'1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
                        color:'#28e98c', marginBottom:12 }}>Built for Research</div>
          <h2 style={{ fontSize:36, fontWeight:900, letterSpacing:'-0.03em', margin:0 }}>
            Everything a PI needs
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}>
          {[
            { icon:'💰', title:'Fund Installment Tracking', desc:'Log expected and received fund installments per project. See exactly how much has arrived vs committed.' },
            { icon:'📋', title:'Expense Categories', desc:'Transportation, printing, field work, communication — standardized categories that match common grant reporting formats.' },
            { icon:'✅', title:'Reimbursement Workflow', desc:'Mark expenses as reimbursed (from project or personal funds). Full history of who reimbursed what and when.' },
            { icon:'👁️', title:'Role-based Access', desc:'Admins manage projects; researchers submit expenses. Members only see what they need to see.' },
            { icon:'📄', title:'Report Export', desc:'Generate expense reports with your institution name, filtered by project, date range, or category. Export to Excel.' },
            { icon:'🔑', title:'Multiple Invite Methods', desc:'Add team members via email invite link or a shareable join code — works on WhatsApp, SMS, wherever.' },
          ].map((f, i) => (
            <div key={i} style={{
              padding:'22px 20px',
              background:'rgba(255,255,255,0.025)',
              border:'1px solid rgba(255,255,255,0.06)',
              borderRadius:14,
            }}>
              <div style={{ fontSize:26, marginBottom:10 }}>{f.icon}</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:6 }}>{f.title}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.40)', lineHeight:1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────── */}
      <section style={{
        padding:'60px 40px', maxWidth:1200, margin:'0 auto',
        borderTop:'1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
                        color:'#28e98c', marginBottom:12 }}>Trusted by Researchers</div>
          <h2 style={{ fontSize:32, fontWeight:900, letterSpacing:'-0.03em', margin:0 }}>
            What PIs are saying
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
          {testimonials.map((t, i) => (
            <div key={i} style={{
              padding:'24px', borderRadius:16,
              background:'rgba(40,233,140,0.04)',
              border:'1px solid rgba(40,233,140,0.12)',
            }}>
              <div style={{ fontSize:24, marginBottom:12, color:'#28e98c' }}>"</div>
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.65)', lineHeight:1.8, margin:'0 0 16px' }}>
                {t.text}
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:36, height:36, borderRadius:'50%',
                  background:'linear-gradient(135deg,#28e98c,#1bc47d)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:700, color:'#0d1f17',
                }}>
                  {t.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{t.name}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{t.role} · {t.org}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Security ──────────────────────────────── */}
      <section id="security" style={{
        padding:'60px 40px', maxWidth:1200, margin:'0 auto',
        borderTop:'1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
                          color:'#28e98c', marginBottom:16 }}>Data Security</div>
            <h2 style={{ fontSize:36, fontWeight:900, letterSpacing:'-0.03em', margin:'0 0 20px' }}>
              Your data is private.<br />Always.
            </h2>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.45)', lineHeight:1.8, margin:'0 0 24px' }}>
              ResearchTrack is designed with workspace isolation at its core. No one — not even the platform
              administrator — can view your project names, expense data, or financial information.
              Every workspace is completely siloed.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                'Passwords hashed with bcrypt (10 rounds)',
                'JWT-based authentication with 7-day expiry',
                'Complete audit log of all data changes',
                'Workspace data isolation — admins see counts only',
                'All sessions encrypted in transit (HTTPS)',
                'Role-based access: admin / researcher separation',
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13,
                                       color:'rgba(255,255,255,0.60)' }}>
                  <div style={{ width:18, height:18, borderRadius:'50%',
                                 background:'rgba(40,233,140,0.15)', border:'1px solid rgba(40,233,140,0.30)',
                                 display:'flex', alignItems:'center', justifyContent:'center',
                                 fontSize:9, color:'#28e98c', flexShrink:0 }}>✓</div>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[
              { icon:'🔐', title:'End-to-End Privacy', desc:'Your financial data is never visible to platform operators' },
              { icon:'🛡️', title:'Audit Trail', desc:'Every expense, edit and deletion is permanently logged' },
              { icon:'🔑', title:'Access Control', desc:'Invite-only team membership with role separation' },
              { icon:'🏛️', title:'Institutional Use', desc:'Compliant with standard research grant reporting requirements' },
            ].map((s, i) => (
              <div key={i} style={{
                padding:'20px 16px', borderRadius:14,
                background:'rgba(255,255,255,0.03)',
                border:'1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:4 }}>{s.title}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', lineHeight:1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section style={{
        padding:'60px 40px', maxWidth:1200, margin:'0 auto',
        borderTop:'1px solid rgba(255,255,255,0.06)',
        textAlign:'center',
      }}>
        <h2 style={{ fontSize:40, fontWeight:900, letterSpacing:'-0.03em', margin:'0 0 16px' }}>
          Ready to track your research?
        </h2>
        <p style={{ fontSize:15, color:'rgba(255,255,255,0.40)', margin:'0 0 32px' }}>
          Request access and have your workspace ready within 24 hours.
        </p>
        <div style={{ display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap' }}>
          <Link to="/request-access" style={{
            padding:'14px 32px', borderRadius:12, fontSize:14, fontWeight:700,
            background:'linear-gradient(135deg,#28e98c,#1bc47d)', color:'#0d1f17',
            textDecoration:'none', display:'inline-flex', alignItems:'center', gap:8,
          }}>
            Request Access →
          </Link>
          <a href="#how-it-works" style={{
            padding:'14px 28px', borderRadius:12, fontSize:14, fontWeight:600,
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)',
            color:'rgba(255,255,255,0.70)', textDecoration:'none',
          }}
          onClick={e => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth'}); }}>
            Learn more
          </a>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer style={{
        borderTop:'1px solid rgba(255,255,255,0.07)',
        padding:'40px 40px', maxWidth:1200, margin:'0 auto',
      }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:40, marginBottom:40 }}>
          {/* Brand */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:28, height:28, borderRadius:8,
                             background:'linear-gradient(135deg,#28e98c,#1bc47d)',
                             display:'flex', alignItems:'center', justifyContent:'center',
                             fontSize:13, fontWeight:800, color:'#0d1f17' }}>R</div>
              <span style={{ fontWeight:700, fontSize:14 }}>ResearchTrack</span>
            </div>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.35)', lineHeight:1.8, maxWidth:260 }}>
              A unified platform for managing research project budgets, expense submissions,
              and reimbursement tracking — for any organization.
            </p>
            <div style={{ marginTop:14, fontSize:12, color:'rgba(255,255,255,0.25)' }}>
              Developed by <strong style={{ color:'rgba(255,255,255,0.45)' }}>Tariqul Islam</strong>
            </div>
          </div>

          {/* Platform */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase',
                           color:'rgba(255,255,255,0.30)', marginBottom:16 }}>Platform</div>
            {[
              { to:'/request-access', label:'Request Access' },
              { to:'/login', label:'Sign In' },
              { to:'/join', label:'Join via Invite' },
              { to:'/forgot-password', label:'Reset Password' },
            ].map(({ to, label }) => (
              <div key={to} style={{ marginBottom:8 }}>
                <Link to={to} style={{ fontSize:13, color:'rgba(255,255,255,0.45)',
                                        textDecoration:'none' }}>{label}</Link>
              </div>
            ))}
          </div>

          {/* For PIs */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase',
                           color:'rgba(255,255,255,0.30)', marginBottom:16 }}>For PIs</div>
            {['Budget Management','Expense Tracking','Fund Installments','Team Invites','Report Export'].map(item => (
              <div key={item} style={{ marginBottom:8, fontSize:13, color:'rgba(255,255,255,0.35)' }}>{item}</div>
            ))}
          </div>

          {/* Legal + Contact */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase',
                           color:'rgba(255,255,255,0.30)', marginBottom:16 }}>Legal & Contact</div>
            {['Privacy Policy','Terms of Use','Data Policy','Contact Admin'].map(item => (
              <div key={item} style={{ marginBottom:8, fontSize:13, color:'rgba(255,255,255,0.35)',
                                        cursor:'pointer' }}>{item}</div>
            ))}
            <div style={{ marginTop:14, padding:'12px', borderRadius:10,
                           background:'rgba(40,233,140,0.05)', border:'1px solid rgba(40,233,140,0.12)',
                           fontSize:12, color:'rgba(255,255,255,0.30)', lineHeight:1.7 }}>
              🏛️ Built for universities<br />
              and research institutions
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:24,
          display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12,
        }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.22)' }}>
            © 2025 ResearchTrack. All rights reserved. | Universal Edition
          </div>
          <div style={{ display:'flex', gap:16 }}>
            {['Privacy','Terms','Security'].map(item => (
              <span key={item} style={{ fontSize:12, color:'rgba(255,255,255,0.25)', cursor:'pointer' }}>{item}</span>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
        input:focus { border-color: rgba(40,233,140,0.50) !important; box-shadow: 0 0 0 3px rgba(40,233,140,0.12); }
        @media (max-width: 900px) {
          section:first-of-type { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
