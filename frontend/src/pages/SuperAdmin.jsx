import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const timeAgo = d => {
  if (!d) return 'Never';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
};

const activityDot = d => {
  if (!d) return { color:'#9ca3af', label:'Never active' };
  const days = (Date.now() - new Date(d)) / 86400000;
  if (days < 7)  return { color:'#16a34a', label:'Active this week' };
  if (days < 30) return { color:'#d97706', label:'Active this month' };
  return { color:'#9ca3af', label:'Inactive' };
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',
  { day:'2-digit', month:'short', year:'numeric' }) : '—';

export default function SuperAdmin() {
  const { user, logout, updateUser } = useAuth();
  const navigate  = useNavigate();
  const [theme, setTheme]   = useState(() => localStorage.getItem('rt-theme') || 'light');
  const [stats, setStats]   = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [sortBy, setSortBy]   = useState('last_active');
  const [expanded, setExpanded] = useState(null);
  const [approving, setApproving] = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Profile panel state
  const [profile, setProfile] = useState({ name: user?.name || '' });
  const [pw, setPw]   = useState({ current:'', newpw:'', confirm:'' });
  const [emailForm, setEmailForm] = useState({ new_email:'', password:'' });
  const [profileMsg, setProfileMsg] = useState('');
  const [pwMsg, setPwMsg]         = useState('');
  const [emailMsg, setEmailMsg]   = useState('');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [urlInput, setUrlInput]   = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rt-theme', theme);
  }, [theme]);

  const load = async () => {
    try {
      const [s, w, p] = await Promise.all([
        api.get('/super/stats'),
        api.get('/super/workspaces'),
        api.get('/auth/pending-signups'),
      ]);
      setStats(s.data);
      setWorkspaces(w.data);
      setPending(p.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleApprove = async (id, name) => {
    setApproving(id);
    try { await api.post(`/auth/pending-signups/${id}/approve`); load(); }
    catch(e) { alert(e.response?.data?.error || 'Approval failed'); }
    finally { setApproving(null); }
  };

  const handleReject = async (id, name) => {
    if (!confirm(`Reject access request from ${name}?`)) return;
    try { await api.delete(`/auth/pending-signups/${id}`); load(); }
    catch(e) { alert('Failed'); }
  };

  const handleDeleteWorkspace = async (id, name) => {
    if (!confirm(`Permanently delete "${name}" and ALL its data?\n\nThis CANNOT be undone.`)) return;
    setDeleting(id);
    try { await api.delete(`/super/workspaces/${id}`); setExpanded(null); load(); }
    catch(e) { alert(e.response?.data?.error || 'Failed'); }
    finally { setDeleting(null); }
  };

  const handleAvatarFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Select an image file.');
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX = 300;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else       { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        setAvatarPreview(compressed);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUrl = () => {
    if (!urlInput.trim()) return;
    setAvatarPreview(urlInput.trim());
    setUrlInput('');
  };

  const saveProfile = async () => {
    setProfileMsg('');
    try {
      const { data } = await api.patch('/auth/profile', {
        name: profile.name,
        avatar_url: avatarPreview || null,
      });
      updateUser({ name: data.name, avatar_url: data.avatar_url });
      setProfileMsg('✓ Saved');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch(e) { setProfileMsg('✗ ' + (e.response?.data?.error || 'Failed')); }
  };

  const changePassword = async () => {
    setPwMsg('');
    if (pw.newpw !== pw.confirm) return setPwMsg('✗ Passwords do not match');
    try {
      await api.patch('/auth/change-password', { current_password:pw.current, new_password:pw.newpw });
      setPwMsg('✓ Password changed');
      setPw({ current:'', newpw:'', confirm:'' });
      setTimeout(() => setPwMsg(''), 3000);
    } catch(e) { setPwMsg('✗ ' + (e.response?.data?.error || 'Failed')); }
  };

  const changeEmail = async () => {
    setEmailMsg('');
    try {
      await api.patch('/auth/change-email', emailForm);
      setEmailMsg('✓ Email updated — signing out');
      setTimeout(() => { logout(); navigate('/login'); }, 1500);
    } catch(e) { setEmailMsg('✗ ' + (e.response?.data?.error || 'Failed')); }
  };

  // Sort + filter workspaces
  const filtered = workspaces
    .filter(w => !search ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.report_header||'').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'last_active') return new Date(b.last_active||0) - new Date(a.last_active||0);
      if (sortBy === 'newest')      return new Date(b.created_at)     - new Date(a.created_at);
      if (sortBy === 'name')        return a.name.localeCompare(b.name);
      if (sortBy === 'users')       return (parseInt(b.admin_count)+parseInt(b.member_count)) - (parseInt(a.admin_count)+parseInt(a.member_count));
      return 0;
    });

  const initials = user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || 'SA';

  if (loading) return (
    <div className="loading-screen"><div className="spinner" />
      <div className="loading-label">Loading platform…</div></div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex', flexDirection:'column' }}>

      {/* ── Fixed topbar ────────────────────────────────── */}
      <header style={{
        position:'sticky', top:0, zIndex:100,
        background:'var(--bg-surface)', borderBottom:'1px solid rgba(0,0,0,0.10)',
        padding:'0 24px', height:56,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:32, height:32, borderRadius:8, background:'#7c3aed',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:15, fontWeight:800, color:'#fff', flexShrink:0,
          }}>R</div>
          <div>
            <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>ResearchTrack</span>
            <span style={{ marginLeft:8, fontSize:11, color:'var(--text-tertiary)',
                           background:'var(--bg-secondary)', padding:'2px 7px',
                           borderRadius:4, border:'1px solid rgba(0,0,0,0.08)' }}>
              Super Admin
            </span>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Pending badge */}
          {pending.length > 0 && (
            <div style={{
              background:'#ef4444', color:'#fff', borderRadius:12,
              padding:'2px 9px', fontSize:11, fontWeight:700,
              animation: 'pulse 2s infinite',
            }}>
              {pending.length} pending
            </div>
          )}

          {/* Theme toggle */}
          <button onClick={() => setTheme(t => t==='light'?'dark':'light')}
            style={{
              width:34, height:34, borderRadius:8, border:'1px solid rgba(0,0,0,0.12)',
              background:'var(--bg-secondary)', cursor:'pointer', fontSize:15,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
            {theme==='light' ? '🌙' : '☀️'}
          </button>

          {/* Profile avatar button */}
          <button onClick={() => setProfileOpen(true)}
            style={{
              width:34, height:34, borderRadius:'50%',
              border:'2px solid rgba(124,58,237,0.4)',
              background:'#7c3aed', cursor:'pointer', padding:0,
              overflow:'hidden', flexShrink:0,
            }}>
            {(avatarPreview || user?.avatar_url)
              ? <img src={avatarPreview || user?.avatar_url} alt="avatar"
                  style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{initials}</span>}
          </button>

          <button className="btn btn-outline btn-sm"
            onClick={() => { logout(); navigate('/login'); }}>
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────── */}
      <div style={{ flex:1, padding:'24px', maxWidth:1080, margin:'0 auto', width:'100%' }}>

        {/* Page title */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'var(--text-primary)' }}>
            Platform Overview
          </h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--text-tertiary)' }}>
            Signed in as {user?.name} · {user?.email}
          </p>
        </div>

        {/* ── Pending requests — always on top if any ─── */}
        {pending.length > 0 && (
          <div style={{
            marginBottom:24, border:'2px solid #f59e0b',
            borderRadius:12, overflow:'hidden',
            background:'var(--bg-surface)',
          }}>
            <div style={{
              background:'#fffbeb', padding:'12px 20px',
              display:'flex', alignItems:'center', gap:10,
              borderBottom:'1px solid #fde68a',
            }}>
              <span style={{ fontSize:16 }}>⏳</span>
              <span style={{ fontWeight:700, fontSize:14, color:'#92400e' }}>
                {pending.length} Access Request{pending.length>1?'s':''} Awaiting Your Decision
              </span>
            </div>
            {pending.map((p, i) => (
              <div key={p.id} style={{
                padding:'16px 20px',
                borderBottom: i < pending.length-1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                display:'flex', gap:16, alignItems:'flex-start',
                flexWrap:'wrap', background:'var(--bg-surface)',
              }}>
                <div style={{
                  width:40, height:40, borderRadius:'50%', background:'#d97706',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:15, fontWeight:700, color:'#fff', flexShrink:0,
                }}>
                  {p.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                </div>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:'var(--text-primary)' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>
                    {p.email}
                    {p.position && <span style={{ marginLeft:8, color:'var(--text-tertiary)' }}>· {p.position}</span>}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:4 }}>
                    Workspace: <strong>{p.workspace_name}</strong>
                    {p.report_header && p.report_header !== p.workspace_name &&
                      <span style={{ color:'var(--text-tertiary)' }}> ({p.report_header})</span>}
                  </div>
                  {p.message && (
                    <div style={{
                      marginTop:8, padding:'8px 12px',
                      background:'rgba(0,0,0,0.03)', borderRadius:6,
                      borderLeft:'3px solid #d97706', fontSize:12,
                      color:'var(--text-secondary)', fontStyle:'italic',
                    }}>
                      "{p.message}"
                    </div>
                  )}
                  <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:6 }}>
                    Requested {timeAgo(p.created_at)}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button className="btn btn-success btn-sm"
                    disabled={approving===p.id}
                    onClick={() => handleApprove(p.id, p.name)}>
                    {approving===p.id ? '…' : '✓ Approve'}
                  </button>
                  <button className="btn btn-outline btn-sm"
                    style={{ color:'var(--danger)', borderColor:'var(--danger)' }}
                    onClick={() => handleReject(p.id, p.name)}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Stats row ─────────────────────────────────── */}
        {stats && (
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))',
            gap:14, marginBottom:24,
          }}>
            {[
              { label:'Active workspaces',   value: filtered.filter(w => activityDot(w.last_active).color==='#16a34a').length, icon:'🟢', sub:'this week' },
              { label:'Total workspaces',    value: stats.total_workspaces, icon:'🏠', sub:'registered' },
              { label:'Total users',         value: stats.total_users,      icon:'👥', sub:'across all' },
              { label:'New this month',      value: stats.new_workspaces_30d, icon:'🆕', sub:'workspaces' },
              { label:'Active users (7d)',   value: stats.active_users_7d,  icon:'⚡', sub:'past week' },
            ].map((s, i) => (
              <div key={i} style={{
                background:'var(--bg-surface)', borderRadius:10,
                border:'1px solid rgba(0,0,0,0.09)',
                padding:'14px 16px',
                boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{ fontSize:18, marginBottom:6 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize:12, color:'var(--text-tertiary)', marginTop:4 }}>
                  {s.label}
                </div>
                <div style={{ fontSize:11, color:'var(--text-tertiary)', opacity:0.7 }}>
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Workspace directory ───────────────────────── */}
        <div style={{
          background:'var(--bg-surface)', borderRadius:12,
          border:'1px solid rgba(0,0,0,0.09)',
          boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
          overflow:'hidden',
        }}>
          {/* Toolbar */}
          <div style={{
            padding:'14px 18px', borderBottom:'1px solid rgba(0,0,0,0.08)',
            display:'flex', gap:10, alignItems:'center', flexWrap:'wrap',
          }}>
            <div style={{ flex:1, minWidth:200 }}>
              <input
                style={{
                  width:'100%', padding:'7px 12px', fontSize:13,
                  border:'1px solid rgba(0,0,0,0.15)', borderRadius:8,
                  background:'var(--bg-primary)', color:'var(--text-primary)',
                  outline:'none',
                }}
                placeholder="Search workspaces…"
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{
                padding:'7px 12px', fontSize:13, border:'1px solid rgba(0,0,0,0.15)',
                borderRadius:8, background:'var(--bg-primary)', color:'var(--text-primary)',
                cursor:'pointer',
              }}>
              <option value="last_active">Sort: Last active</option>
              <option value="newest">Sort: Newest first</option>
              <option value="name">Sort: Name A–Z</option>
              <option value="users">Sort: Most users</option>
            </select>
            <div style={{ fontSize:12, color:'var(--text-tertiary)', whiteSpace:'nowrap' }}>
              {filtered.length} workspace{filtered.length!==1?'s':''}
            </div>
          </div>

          {/* Workspace rows */}
          {filtered.length === 0 ? (
            <div style={{ padding:48, textAlign:'center', color:'var(--text-tertiary)', fontSize:14 }}>
              {search ? 'No workspaces match your search' : 'No workspaces yet'}
            </div>
          ) : (
            filtered.map((w, i) => {
              const dot     = activityDot(w.last_active);
              const isOpen  = expanded === w.id;
              const total   = parseInt(w.admin_count||0) + parseInt(w.member_count||0);

              return (
                <div key={w.id} style={{ borderBottom: i < filtered.length-1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                  {/* Row */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : w.id)}
                    style={{
                      padding:'14px 18px', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:14,
                      background: isOpen ? 'var(--bg-secondary)' : 'transparent',
                      transition:'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background='var(--bg-secondary)'; }}
                    onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background='transparent'; }}
                  >
                    {/* Activity dot */}
                    <div title={dot.label} style={{
                      width:10, height:10, borderRadius:'50%',
                      background:dot.color, flexShrink:0,
                      boxShadow: dot.color==='#16a34a' ? '0 0 6px rgba(22,163,74,0.5)' : 'none',
                    }} />

                    {/* Workspace name + header */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:'var(--text-primary)',
                                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {w.name}
                      </div>
                      {w.report_header && w.report_header !== w.name && (
                        <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:1 }}>
                          {w.report_header}
                        </div>
                      )}
                    </div>

                    {/* Counts */}
                    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                      <span style={{
                        fontSize:11, padding:'2px 8px', borderRadius:10,
                        background:'rgba(0,0,0,0.05)', color:'var(--text-secondary)',
                        border:'1px solid rgba(0,0,0,0.08)',
                      }}>
                        👥 {total}
                      </span>
                      <span style={{
                        fontSize:11, padding:'2px 8px', borderRadius:10,
                        background:'rgba(0,0,0,0.05)', color:'var(--text-secondary)',
                        border:'1px solid rgba(0,0,0,0.08)',
                      }}>
                        📁 {w.project_count}
                      </span>
                    </div>

                    {/* Last active */}
                    <div style={{
                      fontSize:11, color:'var(--text-tertiary)',
                      minWidth:80, textAlign:'right', flexShrink:0,
                    }}>
                      {timeAgo(w.last_active)}
                    </div>

                    {/* Expand arrow */}
                    <div style={{
                      fontSize:12, color:'var(--text-tertiary)',
                      transition:'transform 0.2s',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>▼</div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{
                      padding:'14px 18px 18px 42px',
                      background:'var(--bg-secondary)',
                      borderTop:'1px solid rgba(0,0,0,0.06)',
                    }}>
                      <div style={{ display:'flex', gap:24, flexWrap:'wrap', marginBottom:14 }}>
                        <div>
                          <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:2 }}>CREATED</div>
                          <div style={{ fontSize:13, color:'var(--text-primary)' }}>{fmtDate(w.created_at)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:2 }}>ADMINS</div>
                          <div style={{ fontSize:13, color:'var(--text-primary)' }}>{w.admin_count}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:2 }}>MEMBERS</div>
                          <div style={{ fontSize:13, color:'var(--text-primary)' }}>{w.member_count}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:2 }}>PROJECTS</div>
                          <div style={{ fontSize:13, color:'var(--text-primary)' }}>{w.project_count}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:2 }}>LAST ACTIVE</div>
                          <div style={{ fontSize:13, color:'var(--text-primary)' }}>
                            {w.last_active ? timeAgo(w.last_active) : 'Never'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display:'flex', gap:8 }}>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={deleting===w.id}
                          onClick={e => { e.stopPropagation(); handleDeleteWorkspace(w.id, w.name); }}>
                          {deleting===w.id ? 'Deleting…' : '🗑 Delete Workspace'}
                        </button>
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:8 }}>
                        Deleting removes the workspace, all users, projects, and expense data permanently.
                        Financial data is never visible to you.
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div style={{ marginTop:14, display:'flex', gap:20, fontSize:11, color:'var(--text-tertiary)' }}>
          {[['#16a34a','Active this week'],['#d97706','Active this month'],['#9ca3af','Inactive / never']].map(([c,l]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:c }} />{l}
            </div>
          ))}
        </div>
      </div>

      {/* ── Profile slide-out panel ───────────────────── */}
      {profileOpen && (
        <>
          <div
            onClick={() => setProfileOpen(false)}
            style={{
              position:'fixed', inset:0, background:'rgba(0,0,0,0.35)',
              zIndex:200, backdropFilter:'blur(2px)',
            }}
          />
          <div style={{
            position:'fixed', top:0, right:0, bottom:0, width:360,
            background:'var(--bg-surface)', zIndex:201,
            boxShadow:'-4px 0 24px rgba(0,0,0,0.15)',
            display:'flex', flexDirection:'column',
            overflowY:'auto',
          }}>
            {/* Panel header */}
            <div style={{
              padding:'16px 20px', borderBottom:'1px solid rgba(0,0,0,0.09)',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              position:'sticky', top:0, background:'var(--bg-surface)', zIndex:1,
            }}>
              <span style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
                My Account
              </span>
              <button onClick={() => setProfileOpen(false)} style={{
                background:'none', border:'none', cursor:'pointer', fontSize:20,
                color:'var(--text-tertiary)', lineHeight:1, padding:'0 4px',
              }}>×</button>
            </div>

            <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:24 }}>

              {/* Avatar */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                <div style={{
                  width:80, height:80, borderRadius:'50%', background:'#7c3aed',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  overflow:'hidden', border:'3px solid rgba(124,58,237,0.3)',
                }}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="avatar"
                        style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <span style={{ fontSize:26, fontWeight:700, color:'#fff' }}>{initials}</span>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%' }}>
                  {/* File upload */}
                  <div>
                    <input type="file" accept="image/*" id="super-avatar-file"
                      style={{ display:'none' }} onChange={handleAvatarFile} />
                    <label htmlFor="super-avatar-file" style={{
                      display:'block', textAlign:'center', padding:'7px',
                      border:'1px dashed rgba(0,0,0,0.2)', borderRadius:8,
                      cursor:'pointer', fontSize:12, color:'var(--text-secondary)',
                    }}>
                      📁 Upload photo (any size)
                    </label>
                  </div>
                  {/* URL paste */}
                  <div style={{ display:'flex', gap:6 }}>
                    <input
                      style={{
                        flex:1, padding:'6px 10px', fontSize:12,
                        border:'1px solid rgba(0,0,0,0.15)', borderRadius:8,
                        background:'var(--bg-primary)', color:'var(--text-primary)',
                      }}
                      placeholder="Or paste image URL…"
                      value={urlInput} onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && handleAvatarUrl()}
                    />
                    <button className="btn btn-outline btn-sm" onClick={handleAvatarUrl}>Use</button>
                  </div>
                  {avatarPreview && (
                    <button className="btn btn-ghost btn-sm"
                      style={{ color:'var(--danger)', fontSize:11 }}
                      onClick={() => setAvatarPreview('')}>
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              {/* Name */}
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)',
                              textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                  Display Name
                </div>
                <input
                  style={{
                    width:'100%', padding:'8px 12px', fontSize:13,
                    border:'1px solid rgba(0,0,0,0.15)', borderRadius:8,
                    background:'var(--bg-primary)', color:'var(--text-primary)',
                    marginBottom:8,
                  }}
                  value={profile.name}
                  onChange={e => setProfile({ name:e.target.value })}
                />
                <button className="btn btn-primary btn-sm" onClick={saveProfile}
                  style={{ width:'100%', justifyContent:'center' }}>
                  Save Name & Photo
                </button>
                {profileMsg && (
                  <div style={{ fontSize:12, marginTop:6, color: profileMsg.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
                    {profileMsg}
                  </div>
                )}
              </div>

              <div style={{ borderTop:'1px solid rgba(0,0,0,0.08)', paddingTop:20 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)',
                              textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
                  Change Password
                </div>
                {['current','newpw','confirm'].map((k,i) => (
                  <input key={k} type="password"
                    style={{
                      width:'100%', padding:'8px 12px', fontSize:13, marginBottom:8,
                      border:'1px solid rgba(0,0,0,0.15)', borderRadius:8,
                      background:'var(--bg-primary)', color:'var(--text-primary)',
                    }}
                    placeholder={['Current password','New password (min 8 chars)','Confirm new password'][i]}
                    value={pw[k]}
                    onChange={e => setPw(p => ({ ...p, [k]:e.target.value }))}
                  />
                ))}
                <button className="btn btn-outline btn-sm" onClick={changePassword}
                  style={{ width:'100%', justifyContent:'center' }}>
                  Change Password
                </button>
                {pwMsg && (
                  <div style={{ fontSize:12, marginTop:6, color: pwMsg.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
                    {pwMsg}
                  </div>
                )}
              </div>

              <div style={{ borderTop:'1px solid rgba(0,0,0,0.08)', paddingTop:20 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)',
                              textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
                  Change Email
                </div>
                <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:10 }}>
                  Current: <strong>{user?.email}</strong> · You'll be signed out after changing.
                </div>
                <input type="email"
                  style={{
                    width:'100%', padding:'8px 12px', fontSize:13, marginBottom:8,
                    border:'1px solid rgba(0,0,0,0.15)', borderRadius:8,
                    background:'var(--bg-primary)', color:'var(--text-primary)',
                  }}
                  placeholder="New email address"
                  value={emailForm.new_email}
                  onChange={e => setEmailForm(f => ({ ...f, new_email:e.target.value }))}
                />
                <input type="password"
                  style={{
                    width:'100%', padding:'8px 12px', fontSize:13, marginBottom:8,
                    border:'1px solid rgba(0,0,0,0.15)', borderRadius:8,
                    background:'var(--bg-primary)', color:'var(--text-primary)',
                  }}
                  placeholder="Confirm with your password"
                  value={emailForm.password}
                  onChange={e => setEmailForm(f => ({ ...f, password:e.target.value }))}
                />
                <button className="btn btn-outline btn-sm" onClick={changeEmail}
                  style={{ width:'100%', justifyContent:'center' }}>
                  Change Email
                </button>
                {emailMsg && (
                  <div style={{ fontSize:12, marginTop:6, color: emailMsg.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
                    {emailMsg}
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
