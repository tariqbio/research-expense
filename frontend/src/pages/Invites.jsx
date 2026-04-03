import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',
  { day:'2-digit', month:'short', year:'numeric' }) : '—';
const isExpired = d => new Date() > new Date(d);
const daysLeft  = d => Math.max(0, Math.ceil((new Date(d)-new Date())/86400000));

export default function Invites() {
  const { user } = useAuth();
  const [tab, setTab]         = useState('links');
  const [links, setLinks]     = useState([]);
  const [codes, setCodes]     = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState({ type:'', text:'' });

  // Link form
  const [linkForm, setLinkForm] = useState({ email:'', role:'member', project_id:'' });
  const [newLink, setNewLink]   = useState(null);
  const [linkSaving, setLinkSaving] = useState(false);

  // Code form
  const [codeForm, setCodeForm] = useState({ project_id:'', max_uses:20 });
  const [newCode, setNewCode]   = useState(null);
  const [codeSaving, setCodeSaving] = useState(false);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type:'', text:'' }), 4000);
  };

  const load = async () => {
    try {
      const [lRes, cRes, pRes] = await Promise.all([
        api.get('/auth/invites'),
        api.get('/auth/invite-codes'),
        api.get('/projects'),
      ]);
      setLinks(lRes.data); setCodes(cRes.data); setProjects(pRes.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const createLink = async e => {
    e.preventDefault(); setNewLink(null);
    if (!linkForm.email) return showMsg('error', 'Email required.');
    setLinkSaving(true);
    try {
      const { data } = await api.post('/auth/invites', {
        email: linkForm.email,
        role: linkForm.role,
        project_id: linkForm.project_id || undefined,
      });
      setNewLink(data);
      setLinkForm({ email:'', role:'member', project_id:'' });
      load();
    } catch(err) { showMsg('error', err.response?.data?.error || 'Failed.'); }
    finally { setLinkSaving(false); }
  };

  const revokeLink = async id => {
    try { await api.delete(`/auth/invites/${id}`); load(); showMsg('success', 'Invite revoked.'); }
    catch(e) { showMsg('error', e.response?.data?.error || 'Failed.'); }
  };

  const createCode = async e => {
    e.preventDefault(); setNewCode(null);
    if (!codeForm.project_id) return showMsg('error', 'Select a project.');
    setCodeSaving(true);
    try {
      const { data } = await api.post('/auth/invite-codes', {
        project_id: parseInt(codeForm.project_id),
        max_uses: parseInt(codeForm.max_uses) || 20,
      });
      setNewCode(data);
      setCodeForm({ project_id:'', max_uses:20 });
      load();
    } catch(err) { showMsg('error', err.response?.data?.error || 'Failed.'); }
    finally { setCodeSaving(false); }
  };

  const deactivateCode = async id => {
    try { await api.delete(`/auth/invite-codes/${id}`); load(); showMsg('success', 'Code deactivated.'); }
    catch(e) { showMsg('error', 'Failed.'); }
  };

  const copy = text => {
    navigator.clipboard.writeText(text).then(() => showMsg('success', 'Copied to clipboard!'));
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-eyebrow">Administration</div>
          <h1 className="page-title">Invitations</h1>
          <p className="page-subtitle">Generate invite links and codes to add team members</p>
        </div>
      </div>

      <div className="page-body">
        {msg.text && (
          <div className={`notice notice-${msg.type==='success'?'success':'error'}`}
            style={{ marginBottom:16 }}>
            {msg.type==='success'?'✓':'⚠'} {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, borderBottom:'1px solid var(--border)',
                      marginBottom:24, paddingBottom:0 }}>
          {[
            { key:'links', label:'Invite Links (by email)' },
            { key:'codes', label:'Invite Codes (by project)' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:'10px 16px', fontSize:13, fontWeight:500, border:'none',
              cursor:'pointer', background:'none',
              borderBottom: tab===t.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab===t.key ? 'var(--accent)' : 'var(--text-secondary)',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── INVITE LINKS TAB ── */}
        {tab==='links' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:20, marginBottom:24 }}>
              {/* Generate link */}
              <div className="card">
                <div className="card-header"><span className="card-title">Generate Invite Link</span></div>
                <div className="card-body">
                  <div className="notice" style={{
                    background:'var(--bg-info)', color:'var(--text-info)',
                    border:'1px solid var(--border-info)', borderRadius:8,
                    padding:'10px 14px', fontSize:13, marginBottom:16,
                  }}>
                    ℹ Enter their email, copy the link, and send it yourself via Gmail or WhatsApp.
                    No email is sent automatically.
                  </div>
                  <form onSubmit={createLink}>
                    <div className="form-group">
                      <label className="form-label">Their Email Address <span className="form-required">*</span></label>
                      <input type="email" className="form-input" placeholder="researcher@university.edu"
                        value={linkForm.email}
                        onChange={e=>setLinkForm(f=>({...f,email:e.target.value}))} required />
                      <div className="form-hint">
                        🔒 This email will be <strong>locked</strong> to the invite — the recipient cannot change it when they sign up.
                        Make sure it's the email they check regularly.
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Role</label>
                        <select className="form-select" value={linkForm.role}
                          onChange={e=>setLinkForm(f=>({...f,role:e.target.value}))}>
                          <option value="member">Researcher</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Auto-join Project</label>
                        <select className="form-select" value={linkForm.project_id}
                          onChange={e=>setLinkForm(f=>({...f,project_id:e.target.value}))}>
                          <option value="">None (workspace only)</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={linkSaving}>
                      {linkSaving ? 'Generating…' : 'Generate Link'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Generated link display */}
              {newLink && (
                <div className="card" style={{ border:'2px solid var(--accent)' }}>
                  <div className="card-header"><span className="card-title">✅ Link Generated!</span></div>
                  <div className="card-body">
                    <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:12 }}>
                      For: <strong>{newLink.email}</strong> · Expires in 7 days
                    </div>
                    <div style={{
                      background:'var(--bg-secondary)', borderRadius:8, padding:'10px 12px',
                      fontSize:12, fontFamily:'monospace', wordBreak:'break-all',
                      color:'var(--text-primary)', marginBottom:12, border:'1px solid var(--border)',
                    }}>
                      {`${window.location.origin}/join?token=${newLink.token}`}
                    </div>
                    <button className="btn btn-primary" onClick={() => copy(`${window.location.origin}/join?token=${newLink.token}`)}>
                      📋 Copy Link
                    </button>
                    <div style={{ fontSize:12, color:'var(--text-tertiary)', marginTop:10 }}>
                      Copy this link and send it manually via Gmail, WhatsApp, or any other way.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Active links */}
            <div className="card">
              <div className="card-header"><span className="card-title">Active Invite Links ({links.filter(l=>!l.used_at&&!isExpired(l.expires_at)).length})</span></div>
              {loading ? (
                <div style={{ padding:32, textAlign:'center' }}><div className="spinner" /></div>
              ) : links.length===0 ? (
                <div style={{ padding:32, textAlign:'center', color:'var(--text-tertiary)', fontSize:13 }}>
                  No invite links yet
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'var(--bg-secondary)' }}>
                      {['Email','Role','Project','Expires','Status',''].map((h,i) => (
                        <th key={i} style={{ padding:'9px 14px', textAlign:'left', fontSize:11,
                          fontWeight:600, color:'var(--text-tertiary)', textTransform:'uppercase',
                          letterSpacing:'0.06em', borderBottom:'1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {links.map(l => {
                      const expired = isExpired(l.expires_at);
                      const used    = !!l.used_at;
                      return (
                        <tr key={l.id} style={{ borderBottom:'1px solid var(--border-tertiary)',
                          opacity: (expired||used) ? 0.5 : 1 }}>
                          <td style={{ padding:'10px 14px', fontSize:13 }}>{l.email}</td>
                          <td style={{ padding:'10px 14px' }}>
                            <span className={`badge ${l.role==='admin'?'badge-indigo':'badge-gray'}`}
                              style={{ fontSize:10 }}>{l.role}</span>
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-secondary)' }}>
                            {l.project_name || '—'}
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-tertiary)' }}>
                            {expired ? 'Expired' : `${daysLeft(l.expires_at)}d left`}
                          </td>
                          <td style={{ padding:'10px 14px' }}>
                            {used ? <span className="badge badge-green" style={{fontSize:10}}>Used</span>
                            : expired ? <span className="badge badge-gray" style={{fontSize:10}}>Expired</span>
                            : <span className="badge badge-teal" style={{fontSize:10}}>Active</span>}
                          </td>
                          <td style={{ padding:'10px 14px' }}>
                            {!used && !expired && (
                              <button className="btn btn-ghost btn-xs" style={{ color:'var(--danger)' }}
                                onClick={() => revokeLink(l.id)}>Revoke</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── INVITE CODES TAB ── */}
        {tab==='codes' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:20, marginBottom:24 }}>
              <div className="card">
                <div className="card-header"><span className="card-title">Generate Project Code</span></div>
                <div className="card-body">
                  <div className="notice" style={{
                    background:'var(--bg-info)', color:'var(--text-info)',
                    border:'1px solid var(--border-info)', borderRadius:8,
                    padding:'10px 14px', fontSize:13, marginBottom:16,
                  }}>
                    ℹ Share the code or link in your WhatsApp group or email thread.
                    Anyone with it can join the selected project.
                  </div>
                  <form onSubmit={createCode}>
                    <div className="form-group">
                      <label className="form-label">Project <span className="form-required">*</span></label>
                      <select className="form-select" value={codeForm.project_id}
                        onChange={e=>setCodeForm(f=>({...f,project_id:e.target.value}))} required>
                        <option value="">Select project…</option>
                        {projects.filter(p=>p.status==='active').map(p => (
                          <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max uses</label>
                      <input type="number" className="form-input" min={1} max={100}
                        value={codeForm.max_uses}
                        onChange={e=>setCodeForm(f=>({...f,max_uses:e.target.value}))} />
                      <div className="form-hint">How many people can use this code. Default: 20.</div>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={codeSaving}>
                      {codeSaving ? 'Generating…' : 'Generate Code'}
                    </button>
                  </form>
                </div>
              </div>

              {newCode && (
                <div className="card" style={{ border:'2px solid var(--accent)' }}>
                  <div className="card-header"><span className="card-title">✅ Code Generated!</span></div>
                  <div className="card-body">
                    <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:12 }}>
                      Project: <strong>{newCode.project_name}</strong> · Max {newCode.max_uses} uses · 7 days
                    </div>
                    <div style={{
                      background:'var(--bg-secondary)', borderRadius:10,
                      padding:'16px', marginBottom:12, textAlign:'center',
                    }}>
                      <div style={{ fontSize:11, color:'var(--text-tertiary)',
                                    textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
                        Invite Code
                      </div>
                      <div style={{ fontSize:32, fontWeight:800, letterSpacing:'0.15em',
                                    fontFamily:'monospace', color:'var(--accent)' }}>
                        {newCode.code}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn btn-primary" style={{ flex:1 }}
                        onClick={() => copy(newCode.code)}>
                        📋 Copy Code
                      </button>
                      <button className="btn btn-outline" style={{ flex:1 }}
                        onClick={() => copy(`${window.location.origin}/code/${newCode.code}`)}>
                        🔗 Copy Link
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Active Codes</span></div>
              {loading ? (
                <div style={{ padding:32, textAlign:'center' }}><div className="spinner" /></div>
              ) : codes.length===0 ? (
                <div style={{ padding:32, textAlign:'center', color:'var(--text-tertiary)', fontSize:13 }}>
                  No codes yet
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'var(--bg-secondary)' }}>
                      {['Code','Project','Uses','Expires','Status',''].map((h,i) => (
                        <th key={i} style={{ padding:'9px 14px', textAlign:'left', fontSize:11,
                          fontWeight:600, color:'var(--text-tertiary)', textTransform:'uppercase',
                          letterSpacing:'0.06em', borderBottom:'1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map(c => {
                      const expired  = isExpired(c.expires_at);
                      const maxed    = c.use_count >= c.max_uses;
                      const inactive = !c.active || expired || maxed;
                      return (
                        <tr key={c.id} style={{ borderBottom:'1px solid var(--border-tertiary)',
                          opacity: inactive ? 0.5 : 1 }}>
                          <td style={{ padding:'10px 14px', fontFamily:'monospace',
                                       fontWeight:700, fontSize:14, color:'var(--accent)' }}>
                            {c.code}
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:13 }}>{c.project_name}</td>
                          <td style={{ padding:'10px 14px', fontSize:13 }}>
                            {c.use_count} / {c.max_uses}
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-tertiary)' }}>
                            {expired ? 'Expired' : `${daysLeft(c.expires_at)}d left`}
                          </td>
                          <td style={{ padding:'10px 14px' }}>
                            {!c.active ? <span className="badge badge-gray" style={{fontSize:10}}>Deactivated</span>
                            : expired   ? <span className="badge badge-gray" style={{fontSize:10}}>Expired</span>
                            : maxed     ? <span className="badge badge-gray" style={{fontSize:10}}>Max reached</span>
                            : <span className="badge badge-green" style={{fontSize:10}}>Active</span>}
                          </td>
                          <td style={{ padding:'10px 14px' }}>
                            {c.active && !expired && (
                              <button className="btn btn-ghost btn-xs" style={{ color:'var(--danger)' }}
                                onClick={() => deactivateCode(c.id)}>Deactivate</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
