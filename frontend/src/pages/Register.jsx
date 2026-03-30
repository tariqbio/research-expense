import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep]     = useState(1); // 1 = account, 2 = workspace
  const [form, setForm]     = useState({
    name: '', email: '', password: '', confirm: '',
    position: '', workspace_name: '', report_header: '',
  });
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const nextStep = e => {
    e.preventDefault(); setError('');
    if (!form.name || !form.email || !form.password)
      return setError('All fields are required.');
    if (form.password.length < 8)
      return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirm)
      return setError('Passwords do not match.');
    setStep(2);
  };

  const handleSubmit = async e => {
    e.preventDefault(); setError('');
    if (!form.workspace_name) return setError('Workspace name is required.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name:           form.name,
        email:          form.email,
        password:       form.password,
        position:       form.position,
        workspace_name: form.workspace_name,
        report_header:  form.report_header || form.workspace_name,
      });
      setSuccess(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
      setStep(1);
    } finally { setLoading(false); }
  };

  if (success) return (
    <div className="login-page" style={{ justifyContent: 'center' }}>
      <div className="login-panel" style={{ maxWidth: 460, margin: '0 auto' }}>
        <div className="login-logo">✅</div>
        <h1>You're all set</h1>
        <p className="tagline" style={{ textAlign: 'center' }}>{success}</p>
        <Link to="/login" className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 24,
                   padding: '12px 16px', fontSize: 14, display: 'flex' }}>
          Go to Sign In →
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
          <h1 className="hero-headline">Create your<br /><span>Workspace</span></h1>
          <p className="hero-description">
            Your own private space to manage research projects, track expenses,
            and generate reports — completely separate from anyone else.
          </p>
          <div className="hero-features">
            {[
              { icon: '🔒', text: 'Completely private — nobody else can see your data' },
              { icon: '👥', text: 'You add your own team members' },
              { icon: '📊', text: 'Reports use your own header, not a hardcoded name' },
              { icon: '🌐', text: 'Works for any university, lab, or organization' },
            ].map((f, i) => (
              <div key={i} className="hero-feature">
                <div className="hero-feature-dot">{f.icon}</div>
                {f.text}
              </div>
            ))}
          </div>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            {['Your Account', 'Your Workspace'].map((label, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                opacity: step === i + 1 ? 1 : 0.5,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step === i + 1 ? '#28e98c' : 'rgba(255,255,255,0.2)',
                  color: step === i + 1 ? '#0d1f17' : '#fff',
                }}>{i + 1}</div>
                <span style={{ color: '#fff', fontSize: 13 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-logo">R</div>
        <h1>{step === 1 ? 'Create account' : 'Set up your workspace'}</h1>
        <p className="tagline">
          {step === 1
            ? 'Step 1 of 2 — Your personal details'
            : 'Step 2 of 2 — Name your workspace'}
        </p>

        {error && <div className="notice notice-error">⚠ {error}</div>}

        {step === 1 && (
          <form onSubmit={nextStep}>
            <div className="form-group">
              <label className="form-label">Your Full Name <span className="form-required">*</span></label>
              <input className="form-input" placeholder="e.g. Tariqul Islam"
                value={form.name} onChange={set('name')} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Your Position / Designation</label>
              <input className="form-input" placeholder="e.g. Research Fellow, Project Coordinator"
                value={form.position} onChange={set('position')} />
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
                <input type="password" className="form-input" placeholder="Repeat password"
                  value={form.confirm} onChange={set('confirm')} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontSize: 14 }}>
              Continue →
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Workspace Name <span className="form-required">*</span></label>
              <input className="form-input"
                placeholder="e.g. Dr. Karim's Research Projects"
                value={form.workspace_name} onChange={set('workspace_name')} required autoFocus />
              <div className="form-hint">This is your private workspace name. Only you and your team see it.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Report Header</label>
              <input className="form-input"
                placeholder="e.g. FGS, DIU  or  CSE Department, BUET"
                value={form.report_header} onChange={set('report_header')} />
              <div className="form-hint">
                This appears at the top of your expense reports and exports.
                If left blank, the workspace name is used.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button type="submit" className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '12px 16px', fontSize: 14 }}
                disabled={loading}>
                {loading ? '⏳ Creating workspace…' : 'Create Workspace →'}
              </button>
            </div>
          </form>
        )}

        <div className="login-footer-text" style={{ marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
