import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function RequestAccess() {
  const [step, setStep]     = useState(1);
  const [form, setForm]     = useState({
    name:'', email:'', password:'', confirm:'', position:'',
    workspace_name:'', report_header:'', message:'',
  });
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const nextStep = e => {
    e.preventDefault(); setError('');
    if (!form.name||!form.email||!form.password) return setError('All fields required.');
    if (form.password.length<8) return setError('Password must be at least 8 characters.');
    if (form.password!==form.confirm) return setError('Passwords do not match.');
    setStep(2);
  };

  const handleSubmit = async e => {
    e.preventDefault(); setError('');
    if (!form.workspace_name) return setError('Workspace name required.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/request-access', form);
      setSuccess(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request.');
      setStep(1);
    } finally { setLoading(false); }
  };

  if (success) return (
    <div className="login-page" style={{ justifyContent:'center' }}>
      <div className="login-panel" style={{ maxWidth:460, margin:'0 auto' }}>
        <div className="login-logo">⏳</div>
        <h1>Request submitted!</h1>
        <p className="tagline" style={{ textAlign:'center' }}>{success}</p>
        <div style={{ background:'var(--bg-secondary)', borderRadius:10, padding:'16px',
                      marginTop:20, fontSize:13, color:'var(--text-secondary)' }}>
          <strong>What happens next:</strong>
          <ul style={{ margin:'8px 0 0', paddingLeft:18 }}>
            <li>The platform admin will review your request</li>
            <li>You'll receive approval — they may contact you directly</li>
            <li>Once approved, sign in with your email and password</li>
          </ul>
        </div>
        <Link to="/login" className="btn btn-outline"
          style={{ width:'100%', justifyContent:'center', marginTop:20,
                   padding:'11px 16px', fontSize:14, display:'flex' }}>
          Back to Sign In
        </Link>
      </div>
    </div>
  );

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-grid" />
        <div className="hero-content">
          <div className="hero-eyebrow">ResearchTrack</div>
          <h1 className="hero-headline">Request<br /><span>Access</span></h1>
          <p className="hero-description">
            Create your own private workspace to manage research projects and expenses.
            The platform admin will review and approve your request.
          </p>
          <div className="hero-features">
            {[
              { icon:'🔒', text:'Completely private workspace — only your team sees your data' },
              { icon:'⏳', text:'Admin reviews your request before granting access' },
              { icon:'📊', text:'Full expense tracking and reporting' },
              { icon:'👥', text:'Invite your own team members after approval' },
            ].map((f,i) => (
              <div key={i} className="hero-feature">
                <div className="hero-feature-dot">{f.icon}</div>{f.text}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:16, marginTop:32 }}>
            {['Your Details','Your Workspace'].map((label,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, opacity:step===i+1?1:0.4 }}>
                <div style={{
                  width:24, height:24, borderRadius:'50%', fontSize:12, fontWeight:700,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: step===i+1 ? '#28e98c' : 'rgba(255,255,255,0.2)',
                  color: step===i+1 ? '#0d1f17' : '#fff',
                }}>{i+1}</div>
                <span style={{ color:'#fff', fontSize:13 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-logo">R</div>
        <h1>{step===1 ? 'Your details' : 'Your workspace'}</h1>
        <p className="tagline">Step {step} of 2 — {step===1 ? 'Personal information' : 'Workspace setup'}</p>
        {error && <div className="notice notice-error">⚠ {error}</div>}

        {step===1 && (
          <form onSubmit={nextStep}>
            <div className="form-group">
              <label className="form-label">Full Name <span className="form-required">*</span></label>
              <input className="form-input" placeholder="e.g. Tariqul Islam"
                value={form.name} onChange={set('name')} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Position / Designation</label>
              <input className="form-input" placeholder="e.g. Research Fellow, Project Coordinator"
                value={form.position} onChange={set('position')} />
            </div>
            <div className="form-group">
              <label className="form-label">Email <span className="form-required">*</span></label>
              <input type="email" className="form-input" placeholder="you@university.edu"
                value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password <span className="form-required">*</span></label>
                <input type="password" className="form-input" placeholder="Min. 8 characters"
                  value={form.password} onChange={set('password')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password <span className="form-required">*</span></label>
                <input type="password" className="form-input" placeholder="Repeat"
                  value={form.confirm} onChange={set('confirm')} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14 }}>
              Continue →
            </button>
          </form>
        )}

        {step===2 && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Workspace Name <span className="form-required">*</span></label>
              <input className="form-input" placeholder="e.g. Dr. Karim's Research Projects"
                value={form.workspace_name} onChange={set('workspace_name')} required autoFocus />
              <div className="form-hint">Your private workspace. Only you and your team see this.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Report Header</label>
              <input className="form-input" placeholder="e.g. FGS, DIU  or  CSE Dept, BUET"
                value={form.report_header} onChange={set('report_header')} />
              <div className="form-hint">Shown at the top of your exported reports.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Message to admin (optional)</label>
              <textarea className="form-input" rows={3}
                placeholder="Brief note about your research project or why you need access…"
                value={form.message} onChange={set('message')}
                style={{ resize:'vertical' }} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button type="submit" className="btn btn-primary"
                style={{ flex:1, justifyContent:'center', padding:'12px', fontSize:14 }}
                disabled={loading}>
                {loading ? '⏳ Submitting…' : 'Submit Request →'}
              </button>
            </div>
          </form>
        )}

        <div className="login-footer-text" style={{ marginTop:16 }}>
          Already have an account? <Link to="/login" style={{ color:'var(--accent)' }}>Sign in</Link>
          <br />
          Have an invite link? <Link to="/join" style={{ color:'var(--accent)' }}>Use invite</Link>
        </div>
      </div>
    </div>
  );
}
