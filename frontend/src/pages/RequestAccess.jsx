import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const DEGREES = ['Bachelor\'s', 'Master\'s (MSc/MA)', 'PhD / Doctorate', 'Post-Doctoral', 'Professor', 'Associate Professor', 'Assistant Professor', 'Other'];
const POSITIONS = ['Principal Investigator (PI)', 'Co-PI', 'Research Fellow', 'Research Associate', 'Lecturer', 'Senior Researcher', 'Project Coordinator', 'Department Head', 'Other'];
const RESEARCH_AREAS = ['Computer Science & IT', 'Biomedical & Life Sciences', 'Engineering & Technology', 'Environmental Science', 'Social Sciences', 'Economics & Finance', 'Physics & Mathematics', 'Chemistry & Materials', 'Agriculture & Food Science', 'Education & Pedagogy', 'Public Health', 'Law & Governance', 'Other'];
const AGENCIES = ['UGC (Bangladesh)', 'NSF', 'BANBEIS', 'ICT Division BD', 'World Bank', 'ADB', 'USAID', 'British Council', 'EU Horizon', 'Private Industry', 'University Internal Grant', 'Self-funded', 'Other'];

export default function RequestAccess() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    // Step 1 — Personal
    name:'', email:'', password:'', confirm:'',
    academic_degree:'', position:'',
    // Step 2 — Research & Institution
    institution:'', department:'',
    research_area:'', granting_agency:'', expected_fund_amt:'',
    publication_count:'', orcid_id:'',
    // Step 3 — Workspace
    workspace_name:'', report_header:'', message:'',
  });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const nextStep = (e, from) => {
    e.preventDefault(); setError('');
    if (from === 1) {
      if (!form.name||!form.email||!form.password) return setError('Name, email and password are required.');
      if (form.password.length < 8) return setError('Password must be at least 8 characters.');
      if (form.password !== form.confirm) return setError('Passwords do not match.');
    }
    if (from === 2) {
      if (!form.institution) return setError('Institution is required so we can verify your affiliation.');
      if (!form.research_area) return setError('Please select your primary research area.');
    }
    setStep(from + 1);
  };

  const handleSubmit = async e => {
    e.preventDefault(); setError('');
    if (!form.workspace_name) return setError('Workspace name is required.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/request-access', {
        ...form,
        publication_count: form.publication_count ? parseInt(form.publication_count) : 0,
        report_header: form.report_header || form.workspace_name,
      });
      setSuccess(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request.');
      setStep(1);
    } finally { setLoading(false); }
  };

  const stepLabels = ['Personal Details', 'Research Profile', 'Workspace Setup'];

  const inputStyle = {
    width:'100%', padding:'10px 14px', fontSize:13,
    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)',
    borderRadius:10, color:'#fff', outline:'none', boxSizing:'border-box', marginBottom:12,
  };
  const selectStyle = { ...inputStyle, cursor:'pointer' };
  const labelStyle = {
    fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.50)',
    textTransform:'uppercase', letterSpacing:'0.07em',
    display:'block', marginBottom:5,
  };
  const hintStyle = { fontSize:11, color:'rgba(255,255,255,0.30)', marginTop:-8, marginBottom:12, lineHeight:1.5 };

  if (success) return (
    <div style={{ minHeight:'100vh', background:'#080f1a', display:'flex', alignItems:'center',
                   justifyContent:'center', padding:24 }}>
      <div style={{
        maxWidth:480, width:'100%', background:'rgba(255,255,255,0.04)',
        border:'1px solid rgba(255,255,255,0.10)', borderRadius:20, padding:'40px 36px',
        textAlign:'center',
      }}>
        <div style={{ fontSize:52, marginBottom:16 }}>⏳</div>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#fff', letterSpacing:'-0.03em', margin:'0 0 12px' }}>
          Request submitted!
        </h1>
        <p style={{ fontSize:14, color:'rgba(255,255,255,0.45)', lineHeight:1.8, margin:'0 0 24px' }}>{success}</p>
        <div style={{ background:'rgba(40,233,140,0.06)', border:'1px solid rgba(40,233,140,0.15)',
                       borderRadius:12, padding:'16px', marginBottom:24, textAlign:'left' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#28e98c', marginBottom:8 }}>What happens next:</div>
          {[
            'The platform admin reviews your research profile',
            'Approval typically within 24 hours',
            'Once approved, sign in with your email and password',
            'Start adding projects and inviting your team',
          ].map((item, i) => (
            <div key={i} style={{ fontSize:13, color:'rgba(255,255,255,0.50)', marginBottom:5,
                                    display:'flex', gap:8, alignItems:'flex-start' }}>
              <span style={{ color:'#28e98c', fontWeight:700, flexShrink:0 }}>0{i+1}</span>
              {item}
            </div>
          ))}
        </div>
        <Link to="/login" style={{
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          padding:'12px', borderRadius:12, fontSize:14, fontWeight:700,
          background:'linear-gradient(135deg,#28e98c,#1bc47d)', color:'#0d1f17',
          textDecoration:'none',
        }}>
          Go to Sign In →
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#080f1a', color:'#fff',
                   fontFamily:'system-ui,sans-serif', display:'grid',
                   gridTemplateColumns:'1fr 460px', minHeight:'100vh' }}>

      {/* Left: context panel */}
      <div style={{
        background:'linear-gradient(160deg,#0d1f17 0%,#0a1628 100%)',
        borderRight:'1px solid rgba(255,255,255,0.07)',
        padding:'60px 48px', display:'flex', flexDirection:'column', justifyContent:'space-between',
      }}>
        <div>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:60 }}>
            <div style={{ width:32, height:32, borderRadius:9,
                           background:'linear-gradient(135deg,#28e98c,#1bc47d)',
                           display:'flex', alignItems:'center', justifyContent:'center',
                           fontSize:16, fontWeight:800, color:'#0d1f17' }}>R</div>
            <span style={{ fontWeight:700, fontSize:15, color:'#fff' }}>ResearchTrack</span>
          </div>

          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
                        color:'#28e98c', marginBottom:16 }}>Create Your Workspace</div>
          <h1 style={{ fontSize:44, fontWeight:900, lineHeight:1.05, letterSpacing:'-0.04em',
                       color:'#fff', margin:'0 0 20px' }}>
            Start tracking<br />
            <span style={{ color:'#28e98c' }}>your research</span><br />
            expenses today.
          </h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.40)', lineHeight:1.8, maxWidth:380, marginBottom:40 }}>
            Your workspace is private and isolated. Only you and your team see your data.
            This is not a shared system — every PI gets their own dedicated space.
          </p>

          {/* Step indicator */}
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {stepLabels.map((label, i) => {
              const num = i + 1;
              const done = step > num;
              const active = step === num;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <div style={{
                      width:32, height:32, borderRadius:'50%',
                      background: done ? '#28e98c' : active ? 'rgba(40,233,140,0.15)' : 'rgba(255,255,255,0.07)',
                      border: active ? '2px solid #28e98c' : done ? 'none' : '2px solid rgba(255,255,255,0.12)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:13, fontWeight:700,
                      color: done ? '#0d1f17' : active ? '#28e98c' : 'rgba(255,255,255,0.30)',
                      transition:'all 0.3s',
                    }}>
                      {done ? '✓' : num}
                    </div>
                    {i < 2 && <div style={{ width:2, height:28, background:'rgba(255,255,255,0.08)' }} />}
                  </div>
                  <div style={{ paddingBottom: i < 2 ? 28 : 0 }}>
                    <div style={{ fontSize:13, fontWeight: active ? 700 : 500,
                                   color: active ? '#fff' : done ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.30)',
                                   transition:'all 0.3s' }}>{label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Why we collect this */}
        <div style={{
          padding:'16px', borderRadius:12,
          background:'rgba(40,233,140,0.05)', border:'1px solid rgba(40,233,140,0.12)',
          fontSize:12, color:'rgba(255,255,255,0.35)', lineHeight:1.7,
        }}>
          <div style={{ color:'#28e98c', fontWeight:700, marginBottom:6, fontSize:12 }}>
            Why do we ask for research details?
          </div>
          Your institution, funding source, and research domain help the platform admin
          verify legitimacy and approve your request faster. This data is never shared
          and is used only for platform improvement and to match you with relevant features.
        </div>
      </div>

      {/* Right: form panel */}
      <div style={{ padding:'48px 40px', overflowY:'auto',
                     display:'flex', flexDirection:'column', justifyContent:'center' }}>
        <div style={{ maxWidth:380, width:'100%', margin:'0 auto' }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase',
                          color:'rgba(255,255,255,0.35)', marginBottom:6 }}>
              Step {step} of 3 — {stepLabels[step-1]}
            </div>
            <h2 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.03em', color:'#fff', margin:0 }}>
              {step === 1 ? 'Your details' : step === 2 ? 'Research profile' : 'Your workspace'}
            </h2>
          </div>

          {error && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,0.12)',
                           border:'1px solid rgba(239,68,68,0.25)', color:'#f87171',
                           fontSize:13, marginBottom:16 }}>⚠ {error}</div>
          )}

          {/* ── STEP 1: Personal ─────────────────── */}
          {step === 1 && (
            <form onSubmit={e => nextStep(e, 1)}>
              <label style={labelStyle}>Full Name *</label>
              <input style={inputStyle} placeholder="e.g. Dr. Tariqul Islam"
                value={form.name} onChange={set('name')} required autoFocus />

              <label style={labelStyle}>Email Address *</label>
              <input type="email" style={inputStyle} placeholder="you@university.edu"
                value={form.email} onChange={set('email')} required />

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={labelStyle}>Academic Degree</label>
                  <select style={selectStyle} value={form.academic_degree} onChange={set('academic_degree')}>
                    <option value="">Select…</option>
                    {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Your Position</label>
                  <select style={selectStyle} value={form.position} onChange={set('position')}>
                    <option value="">Select…</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={labelStyle}>Password *</label>
                  <input type="password" style={inputStyle} placeholder="Min. 8 characters"
                    value={form.password} onChange={set('password')} required />
                </div>
                <div>
                  <label style={labelStyle}>Confirm Password *</label>
                  <input type="password" style={inputStyle} placeholder="Repeat"
                    value={form.confirm} onChange={set('confirm')} required />
                </div>
              </div>

              <button type="submit" style={{
                width:'100%', padding:'12px', fontSize:14, fontWeight:700,
                background:'linear-gradient(135deg,#28e98c,#1bc47d)',
                border:'none', borderRadius:10, color:'#0d1f17', cursor:'pointer', marginTop:4,
              }}>
                Continue to Research Profile →
              </button>
            </form>
          )}

          {/* ── STEP 2: Research & Institution ────── */}
          {step === 2 && (
            <form onSubmit={e => nextStep(e, 2)}>
              <label style={labelStyle}>Institution / University *</label>
              <input style={inputStyle} placeholder="e.g. Daffodil International University"
                value={form.institution} onChange={set('institution')} required autoFocus />

              <label style={labelStyle}>Department / Faculty</label>
              <input style={inputStyle} placeholder="e.g. Faculty of Graduate Studies, CSE Dept"
                value={form.department} onChange={set('department')} />

              <label style={labelStyle}>Primary Research Area *</label>
              <select style={selectStyle} value={form.research_area} onChange={set('research_area')} required>
                <option value="">Select your domain…</option>
                {RESEARCH_AREAS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              <label style={labelStyle}>Granting Agency / Funding Source</label>
              <select style={selectStyle} value={form.granting_agency} onChange={set('granting_agency')}>
                <option value="">Select if applicable…</option>
                {AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={labelStyle}>Expected Fund Amount</label>
                  <input style={inputStyle} placeholder="e.g. 5,00,000 BDT"
                    value={form.expected_fund_amt} onChange={set('expected_fund_amt')} />
                  <div style={hintStyle}>Approximate total grant value</div>
                </div>
                <div>
                  <label style={labelStyle}>No. of Publications</label>
                  <input type="number" min="0" style={inputStyle} placeholder="0"
                    value={form.publication_count} onChange={set('publication_count')} />
                  <div style={hintStyle}>Peer-reviewed publications</div>
                </div>
              </div>

              <label style={labelStyle}>ORCID iD (optional)</label>
              <input style={inputStyle} placeholder="0000-0000-0000-0000"
                value={form.orcid_id} onChange={set('orcid_id')} />
              <div style={hintStyle}>Open Researcher and Contributor ID — helps verify your academic identity</div>

              <div style={{ display:'flex', gap:10 }}>
                <button type="button" onClick={() => setStep(1)} style={{
                  padding:'12px 18px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer',
                  background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)',
                  color:'rgba(255,255,255,0.70)',
                }}>← Back</button>
                <button type="submit" style={{
                  flex:1, padding:'12px', fontSize:14, fontWeight:700,
                  background:'linear-gradient(135deg,#28e98c,#1bc47d)',
                  border:'none', borderRadius:10, color:'#0d1f17', cursor:'pointer',
                }}>
                  Continue to Workspace →
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: Workspace ───────────────── */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>Workspace Name *</label>
              <input style={inputStyle} placeholder="e.g. Dr. Islam's Research Projects"
                value={form.workspace_name} onChange={set('workspace_name')} required autoFocus />
              <div style={hintStyle}>Your private workspace — only you and your team see this name.</div>

              <label style={labelStyle}>Report Header</label>
              <input style={inputStyle} placeholder="e.g. FGS, DIU  or  CSE Department, BUET"
                value={form.report_header} onChange={set('report_header')} />
              <div style={hintStyle}>Appears at the top of your exported expense reports. Leave blank to use workspace name.</div>

              <label style={labelStyle}>Message to Admin (optional)</label>
              <textarea style={{ ...inputStyle, resize:'vertical', minHeight:80 }} rows={3}
                placeholder="Brief note about your project, funding status, or why you need access…"
                value={form.message} onChange={set('message')} />

              {/* Summary */}
              <div style={{ padding:'14px', borderRadius:12,
                             background:'rgba(40,233,140,0.05)', border:'1px solid rgba(40,233,140,0.12)',
                             marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#28e98c', marginBottom:8,
                               textTransform:'uppercase', letterSpacing:'0.07em' }}>Your application summary</div>
                {[
                  ['Name', form.name],
                  ['Degree', form.academic_degree || '—'],
                  ['Position', form.position || '—'],
                  ['Institution', form.institution],
                  ['Research Area', form.research_area],
                  ['Funding Source', form.granting_agency || '—'],
                  ['Publications', form.publication_count || '0'],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12,
                                         color:'rgba(255,255,255,0.45)', marginBottom:4 }}>
                    <span style={{ color:'rgba(255,255,255,0.30)' }}>{k}</span>
                    <span style={{ color:'rgba(255,255,255,0.60)', maxWidth:'65%', textAlign:'right',
                                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button type="button" onClick={() => setStep(2)} style={{
                  padding:'12px 18px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer',
                  background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)',
                  color:'rgba(255,255,255,0.70)',
                }}>← Back</button>
                <button type="submit" disabled={loading} style={{
                  flex:1, padding:'12px', fontSize:14, fontWeight:700,
                  background: loading ? 'rgba(40,233,140,0.40)' : 'linear-gradient(135deg,#28e98c,#1bc47d)',
                  border:'none', borderRadius:10, color:'#0d1f17',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}>
                  {loading ? '⏳ Submitting…' : 'Submit Request →'}
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop:20, fontSize:12, color:'rgba(255,255,255,0.28)', textAlign:'center', lineHeight:1.7 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'#28e98c', textDecoration:'none' }}>Sign in</Link>
            <br />
            Have an invite link?{' '}
            <Link to="/join" style={{ color:'#28e98c', textDecoration:'none' }}>Join via invite</Link>
          </div>
        </div>
      </div>

      <style>{`
        input:focus, select:focus, textarea:focus {
          border-color: rgba(40,233,140,0.50) !important;
          box-shadow: 0 0 0 3px rgba(40,233,140,0.12);
        }
        select option { background: #1a2535; color: #fff; }
        @media (max-width: 800px) {
          div[style*="gridTemplateColumns: 1fr 460px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
