import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const FUNDING_SOURCES = [
  'University Grant', 'UGC (University Grants Commission)', 'Government Ministry',
  'World Bank / ADB', 'International NGO', 'Industry/Corporate Sponsor',
  'Self-funded', 'Other',
];
const PROJECT_NATURES = [
  'Academic Research', 'Applied Research', 'Development Project',
  'Consultancy', 'Community Outreach', 'Other',
];
// PI = Principal Investigator: the lead researcher who holds the grant
const ROLES = [
  'Principal Investigator (PI) — Lead researcher holding the grant',
  'Co-PI — Co-investigator sharing grant responsibility',
  'Research Fellow — Senior researcher working under PI',
  'Project Coordinator / Manager — Handles operations and finances',
  'Research Assistant — Junior researcher or data collector',
  'PhD Researcher — Doctoral student on the project',
  'Industry / NGO Partner',
  'Other',
];

export default function RequestAccess() {
  const [step, setStep]     = useState(1); // 1=personal, 2=workspace, 3=project
  const [form, setForm]     = useState({
    name:'', email:'', password:'', confirm:'', position:'',
    institution:'', role_in_project:'',
    workspace_name:'', report_header:'', research_area:'',
    funding_source:'', project_nature:'', message:'',
  });
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const nextStep = e => {
    e.preventDefault(); setError('');
    if (step === 1) {
      if (!form.name || !form.email || !form.password) return setError('Name, email and password are required.');
      if (form.password.length < 8) return setError('Password must be at least 8 characters.');
      if (form.password !== form.confirm) return setError('Passwords do not match.');
      if (!form.institution) return setError('Institution is required.');
      if (!form.role_in_project) return setError('Please select your role.');
      setStep(2);
    } else if (step === 2) {
      if (!form.workspace_name) return setError('Workspace name is required.');
      setStep(3);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault(); setError('');
    if (!form.funding_source) return setError('Please select a funding source.');
    if (!form.project_nature) return setError('Please select project nature.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/request-access', form);
      setSuccess(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit.');
      setStep(1);
    } finally { setLoading(false); }
  };

  const stepLabels = ['Your Identity', 'Your Workspace', 'Project Details'];

  if (success) return (
    <div className="login-page login-page--centered">
      <div className="login-panel" style={{ maxWidth:480, margin:'0 auto' }}>
        <div className="login-logo" style={{ fontSize:32 }}>⏳</div>
        <h1>Request submitted!</h1>
        <p className="tagline" style={{ textAlign:'center' }}>{success}</p>
        <div style={{
          background:'rgba(255,255,255,0.08)', borderRadius:10,
          padding:'16px', marginTop:20, fontSize:13,
          color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.10)',
        }}>
          <strong style={{ color:'rgba(255,255,255,0.85)' }}>What happens next:</strong>
          <ol style={{ margin:'8px 0 0', paddingLeft:18, lineHeight:1.9 }}>
            <li>The platform admin reviews your request</li>
            <li>They may contact you at <strong style={{ color:'rgba(255,255,255,0.85)' }}>{form.email}</strong></li>
            <li>Once approved, you'll be able to sign in</li>
          </ol>
        </div>
        <Link to="/login" className="btn btn-primary"
          style={{ width:'100%', justifyContent:'center', marginTop:20, padding:'12px', fontSize:14, display:'flex' }}>
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
            Create a private workspace to manage your research project budgets and expenses.
            The platform admin reviews all requests before granting access.
          </p>

          {/* Step progress */}
          <div style={{ marginTop:32, display:'flex', flexDirection:'column', gap:10 }}>
            {stepLabels.map((label, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{
                  width:28, height:28, borderRadius:'50%', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:12, fontWeight:700,
                  background: step > i+1 ? '#28e98c' : step === i+1 ? '#28e98c' : 'rgba(255,255,255,0.15)',
                  color: step >= i+1 ? '#0d1f17' : 'rgba(255,255,255,0.5)',
                  border: step === i+1 ? '2px solid #28e98c' : '2px solid transparent',
                  boxShadow: step === i+1 ? '0 0 12px rgba(40,233,140,0.5)' : 'none',
                  transition:'all 0.3s',
                }}>
                  {step > i+1 ? '✓' : i+1}
                </div>
                <span style={{
                  fontSize:13, fontWeight: step === i+1 ? 600 : 400,
                  color: step === i+1 ? '#fff' : 'rgba(255,255,255,0.45)',
                  transition:'color 0.3s',
                }}>{label}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop:28, fontSize:12, color:'rgba(255,255,255,0.35)', lineHeight:1.8 }}>
            🔒 Your data is private and isolated<br />
            👥 Add your own team after approval<br />
            📊 Full expense tracking and PDF reports<br />
            🎓 For universities, labs, and research orgs
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-logo">R</div>
        <h1>{stepLabels[step-1]}</h1>
        <p className="tagline">Step {step} of 3</p>

        {error && <div className="notice notice-error">⚠ {error}</div>}

        {/* Step 1 — Personal identity */}
        {step === 1 && (
          <form onSubmit={nextStep}>
            <div className="form-group">
              <label className="form-label">Full Name <span className="form-required">*</span></label>
              <input className="form-input" placeholder="e.g. Dr. Tariqul Islam"
                value={form.name} onChange={set('name')} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Institution / University <span className="form-required">*</span></label>
              <input className="form-input" placeholder="e.g. Daffodil International University"
                value={form.institution} onChange={set('institution')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Your Role in the Project <span className="form-required">*</span></label>
              <div className="form-hint" style={{ marginBottom:6 }}>
                PI (Principal Investigator) = the lead researcher who holds and is responsible for the grant funding.
              </div>
              <select className="form-select" value={form.role_in_project} onChange={set('role_in_project')} required>
                <option value="">Select your role in this project…</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Academic / Professional Title</label>
              <input className="form-input"
                placeholder="e.g. Professor, Associate Professor, PhD Candidate, Senior Engineer"
                value={form.position} onChange={set('position')} />
              <div className="form-hint">Your job title or academic rank at your institution.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address <span className="form-required">*</span></label>
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

        {/* Step 2 — Workspace */}
        {step === 2 && (
          <form onSubmit={nextStep}>
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
              <div className="form-hint">Shown at the top of all exported reports. Defaults to workspace name.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Research Area / Department</label>
              <input className="form-input" placeholder="e.g. Computer Science, Public Health, Agriculture"
                value={form.research_area} onChange={set('research_area')} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button type="submit" className="btn btn-primary"
                style={{ flex:1, justifyContent:'center', padding:'12px', fontSize:14 }}>
                Continue →
              </button>
            </div>
          </form>
        )}

        {/* Step 3 — Project details */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Funding Source <span className="form-required">*</span></label>
              <select className="form-select" value={form.funding_source} onChange={set('funding_source')} required>
                <option value="">Select funding source…</option>
                {FUNDING_SOURCES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <div className="form-hint">This helps us understand how research is funded in Bangladesh.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Nature of Project <span className="form-required">*</span></label>
              <select className="form-select" value={form.project_nature} onChange={set('project_nature')} required>
                <option value="">Select project type…</option>
                {PROJECT_NATURES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Message to Admin</label>
              <textarea className="form-input" rows={3}
                placeholder="Briefly describe your project and why you need this tool…"
                value={form.message} onChange={set('message')}
                style={{ resize:'vertical' }} />
              <div className="form-hint">Optional but helps us approve faster.</div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
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
          Have an invite link? <Link to="/join" style={{ color:'var(--accent)' }}>Join via invite</Link>
        </div>
      </div>
    </div>
  );
}
