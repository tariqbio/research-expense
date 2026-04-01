import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';

// ── helpers ──────────────────────────────────────────────────────
const timeAgo = d => {
  if (!d) return 'Never';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)      return 'Just now';
  if (s < 3600)    return `${Math.floor(s/60)}m ago`;
  if (s < 86400)   return `${Math.floor(s/3600)}h ago`;
  if (s < 604800)  return `${Math.floor(s/86400)}d ago`;
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
};

const activityStatus = d => {
  if (!d) return { color:'#6b7280', label:'Never used', bg:'rgba(107,114,128,0.12)' };
  const days = (Date.now() - new Date(d)) / 86400000;
  if (days < 1)  return { color:'#16a34a', label:'Active today',       bg:'rgba(22,163,74,0.12)' };
  if (days < 7)  return { color:'#16a34a', label:'Active this week',   bg:'rgba(22,163,74,0.10)' };
  if (days < 30) return { color:'#d97706', label:'Active this month',  bg:'rgba(217,119,6,0.12)' };
  return           { color:'#6b7280', label:'Inactive 30+ days',       bg:'rgba(107,114,128,0.10)' };
};

// ── component ─────────────────────────────────────────────────────
export default function SuperAdmin() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme]   = useState(() => localStorage.getItem('rt-theme') || 'light');
  const [tab, setTab]       = useState('pending'); // pending | workspaces
  const [stats, setStats]   = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [pending, setPending]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [sortBy, setSortBy]         = useState('last_active');
  const [expanded, setExpanded]     = useState(null);
  const [approving, setApproving]   = useState(null);
  const [rejecting, setRejecting]   = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Profile state
  const [pName, setPName]         = useState(user?.name || '');
  const [avatarPreview, setAP]    = useState(user?.avatar_url || '');
  const [urlInput, setUrlInput]   = useState('');
  const [pw, setPw]               = useState({ current:'', newpw:'', confirm:'' });
  const [emailF, setEmailF]       = useState({ new_email:'', password:'' });
  const [pMsg, setPMsg]           = useState({ type:'', text:'' });
  const [pwMsg, setPwMsg]         = useState({ type:'', text:'' });
  const [emailMsg, setEmailMsg]   = useState({ type:'', text:'' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rt-theme', theme);
  }, [theme]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, w, p] = await Promise.all([
        api.get('/super/stats'),
        api.get('/super/workspaces'),
        api.get('/auth/pending-signups'),
      ]);
      setStats(s.data);
      setWorkspaces(w.data);
      setPending(p.data);
      // Default tab: pending if there are requests, else workspaces
      if (p.data.length > 0) setTab('pending');
      else setTab('workspaces');
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleApprove = async (id, name) => {
    setApproving(id);
    try {
      await api.post(`/auth/pending-signups/${id}/approve`);
      setPending(p => p.filter(x => x.id !== id));
      if (pending.length === 1) setTab('workspaces');
      await load();
    } catch(e) { alert(e.response?.data?.error || 'Approval failed'); }
    finally { setApproving(null); }
  };

  const handleReject = async (id, name) => {
    if (!confirm(`Reject and delete access request from ${name}?`)) return;
    setRejecting(id);
    try {
      await api.delete(`/auth/pending-signups/${id}`);
      setPending(p => p.filter(x => x.id !== id));
    } catch(e) { alert('Failed to reject'); }
    finally { setRejecting(null); }
  };

  const handleDeleteWorkspace = async (id, name) => {
    if (!confirm(`Permanently delete workspace "${name}"?\n\nThis removes ALL users, projects, and expenses. Cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/super/workspaces/${id}`);
      setWorkspaces(ws => ws.filter(w => w.id !== id));
      setExpanded(null);
    } catch(e) { alert(e.response?.data?.error || 'Delete failed'); }
    finally { setDeleting(null); }
  };

  // Avatar compression
  const handleAvatarFile = e => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX = 300;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h*MAX/w); w = MAX; }
          else       { w = Math.round(w*MAX/h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        setAP(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setPMsg({ type:'', text:'' });
    try {
      const { data } = await api.patch('/auth/profile', { name: pName, avatar_url: avatarPreview || null });
      updateUser({ name: data.name, avatar_url: data.avatar_url });
      setPMsg({ type:'ok', text:'Saved successfully' });
    } catch(e) { setPMsg({ type:'err', text: e.response?.data?.error || 'Failed' }); }
  };

  const changePassword = async () => {
    if (pw.newpw !== pw.confirm) return setPwMsg({ type:'err', text:'Passwords do not match' });
    setPwMsg({ type:'', text:'' });
    try {
      await api.patch('/auth/change-password', { current_password:pw.current, new_password:pw.newpw });
      setPwMsg({ type:'ok', text:'Password changed' });
      setPw({ current:'', newpw:'', confirm:'' });
    } catch(e) { setPwMsg({ type:'err', text: e.response?.data?.error || 'Failed' }); }
  };

  const changeEmail = async () => {
    setEmailMsg({ type:'', text:'' });
    try {
      await api.patch('/auth/change-email', emailF);
      setEmailMsg({ type:'ok', text:'Email updated — signing out…' });
      setTimeout(() => { logout(); navigate('/login'); }, 1500);
    } catch(e) { setEmailMsg({ type:'err', text: e.response?.data?.error || 'Failed' }); }
  };

  const filtered = workspaces
    .filter(w => !search ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.report_header||'').toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      if (sortBy==='last_active') return new Date(b.last_active||0)-new Date(a.last_active||0);
      if (sortBy==='newest')      return new Date(b.created_at)-new Date(a.created_at);
      if (sortBy==='name')        return a.name.localeCompare(b.name);
      if (sortBy==='users')       return (parseInt(b.admin_count)+parseInt(b.member_count))-(parseInt(a.admin_count)+parseInt(a.member_count));
      return 0;
    });

  const initials = user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || 'SA';

  // ── styles ─────────────────────────────────────────────────────
  const S = {
    topbar: {
      position:'sticky', top:0, zIndex:100,
      background: theme==='dark' ? 'rgba(20,22,20,0.88)' : 'rgba(255,255,255,0.82)',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      borderBottom:`1px solid ${theme==='dark'?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.09)'}`,
      padding:'0 24px', height:56,
      display:'flex', alignItems:'center', justifyContent:'space-between',
    },
    page: { flex:1, padding:'24px', maxWidth:1060, margin:'0 auto', width:'100%' },
    card: {
      background: theme==='dark' ? 'rgba(28,30,26,0.78)' : 'rgba(255,255,255,0.75)',
      border:`1px solid ${theme==='dark'?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.09)'}`,
      borderRadius:14,
      backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
      boxShadow: theme==='dark'
        ? '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.4)'
        : '0 0 0 1px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.06)',
      overflow:'hidden',
    },
    input: {
      width:'100%', padding:'8px 12px', fontSize:13,
      border:`1px solid ${theme==='dark'?'rgba(255,255,255,0.16)':'rgba(0,0,0,0.15)'}`,
      borderRadius:8, outline:'none', marginBottom:8,
      background: theme==='dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
      color:'var(--text-primary)',
    },
    label: {
      display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.06em',
      textTransform:'uppercase', color:'var(--text-tertiary)', marginBottom:6,
    },
    tabActive: {
      borderBottom:'2px solid var(--accent)', color:'var(--accent)',
      background:'none', border:'none', borderBottom:'2px solid var(--accent)',
      padding:'10px 16px', fontSize:13, fontWeight:600, cursor:'pointer',
    },
    tabInactive: {
      borderBottom:'2px solid transparent', color:'var(--text-secondary)',
      background:'none', border:'none', borderBottom:'2px solid transparent',
      padding:'10px 16px', fontSize:13, fontWeight:500, cursor:'pointer',
    },
  };

  const Msg = ({ m }) => m.text ? (
    <div style={{ fontSize:12, marginTop:6, color: m.type==='ok' ? '#16a34a' : '#dc2626' }}>
      {m.type==='ok' ? '✓ ' : '✗ '}{m.text}
    </div>
  ) : null;

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
                  background:'var(--bg-base)', flexDirection:'column', gap:12 }}>
      <div className="spinner" />
      <div style={{ fontSize:13, color:'var(--text-tertiary)' }}>Loading platform…</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)', display:'flex', flexDirection:'column' }}>

      {/* ── Topbar ─────────────────────────────────────── */}
      <header style={S.topbar}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:14, fontWeight:800, color:'#fff' }}>R</div>
          <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>ResearchTrack</span>
          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                         background:'rgba(124,58,237,0.12)', color:'#7c3aed',
                         border:'1px solid rgba(124,58,237,0.25)', fontWeight:600 }}>
            Super Admin
          </span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {pending.length > 0 && (
            <button onClick={() => setTab('pending')} style={{
              background:'#ef4444', color:'#fff', border:'none', borderRadius:20,
              padding:'3px 10px', fontSize:11, fontWeight:700, cursor:'pointer',
            }}>
              {pending.length} pending
            </button>
          )}
          <button onClick={() => setTheme(t => t==='light'?'dark':'light')} style={{
            width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:14,
            background: theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)',
            border:`1px solid ${theme==='dark'?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.10)'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{theme==='light'?'🌙':'☀️'}</button>
          <button onClick={() => setProfileOpen(true)} style={{
            width:32, height:32, borderRadius:'50%', cursor:'pointer', padding:0,
            border:'2px solid rgba(124,58,237,0.4)', overflow:'hidden',
            background:'#7c3aed', flexShrink:0,
          }}>
            {(avatarPreview||user?.avatar_url)
              ? <img src={avatarPreview||user?.avatar_url} alt=""
                  style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontSize:11, fontWeight:700, color:'#fff', lineHeight:'32px' }}>{initials}</span>}
          </button>
          <button className="btn btn-outline btn-sm"
            onClick={() => { logout(); navigate('/login'); }}>Sign Out</button>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────── */}
      <div style={S.page}>

        {/* Platform stats — real meaning, not just numbers */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',
                        gap:12, marginBottom:24 }}>
            {[
              {
                label:'Active this week',
                value: filtered.filter(w=>activityStatus(w.last_active).label.includes('week')||activityStatus(w.last_active).label.includes('today')).length,
                total: stats.total_workspaces,
                icon:'🟢', color:'#16a34a',
                sub: `of ${stats.total_workspaces} workspaces`,
              },
              {
                label:'New workspaces',
                value: stats.new_workspaces_30d,
                icon:'📈', color:'#7c3aed',
                sub:'last 30 days',
              },
              {
                label:'Total users',
                value: stats.total_users,
                icon:'👥', color:'#0891b2',
                sub:`${stats.active_users_7d} active this week`,
              },
              {
                label:'Pending requests',
                value: pending.length,
                icon: pending.length > 0 ? '⏳' : '✅', 
                color: pending.length > 0 ? '#ef4444' : '#16a34a',
                sub: pending.length > 0 ? 'Need your approval' : 'All clear',
                action: pending.length > 0 ? () => setTab('pending') : null,
              },
            ].map((s,i) => (
              <div key={i}
                onClick={s.action}
                style={{
                  ...S.card,
                  padding:'16px',
                  cursor: s.action ? 'pointer' : 'default',
                  transition:'transform 0.15s',
                }}
                onMouseEnter={e => s.action && (e.currentTarget.style.transform='translateY(-2px)')}
                onMouseLeave={e => s.action && (e.currentTarget.style.transform='none')}
              >
                <div style={{ fontSize:20, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontSize:26, fontWeight:800, color: s.color, lineHeight:1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginTop:4 }}>
                  {s.label}
                </div>
                <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ──────────────────────────────────────── */}
        <div style={{ display:'flex', borderBottom:`1px solid ${theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}`,
                      marginBottom:20 }}>
          <button style={tab==='pending' ? S.tabActive : S.tabInactive}
            onClick={() => setTab('pending')}>
            Pending Requests {pending.length>0 && (
              <span style={{ marginLeft:6, background:'#ef4444', color:'#fff',
                             borderRadius:10, padding:'1px 6px', fontSize:10, fontWeight:700 }}>
                {pending.length}
              </span>
            )}
          </button>
          <button style={tab==='workspaces' ? S.tabActive : S.tabInactive}
            onClick={() => setTab('workspaces')}>
            Workspaces ({workspaces.length})
          </button>
        </div>

        {/* ── PENDING TAB ───────────────────────────────── */}
        {tab==='pending' && (
          <>
            {pending.length === 0 ? (
              <div style={{ ...S.card, padding:48, textAlign:'center' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                <div style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>
                  No pending requests
                </div>
                <div style={{ fontSize:13, color:'var(--text-tertiary)' }}>
                  When someone requests access, it will appear here.
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {pending.map(p => (
                  <div key={p.id} style={{ ...S.card, padding:'20px' }}>
                    <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
                      {/* Avatar */}
                      <div style={{
                        width:48, height:48, borderRadius:'50%',
                        background:'linear-gradient(135deg,#d97706,#f59e0b)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:18, fontWeight:700, color:'#fff', flexShrink:0,
                      }}>
                        {p.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:200 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                          <span style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
                            {p.name}
                          </span>
                          {p.position && (
                            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                                           background:'rgba(0,0,0,0.06)', color:'var(--text-secondary)',
                                           border:`1px solid ${theme==='dark'?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.08)'}` }}>
                              {p.position}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:6 }}>
                          {p.email}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                          <span style={{ fontSize:12, color:'var(--text-tertiary)' }}>Workspace:</span>
                          <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>
                            {p.workspace_name}
                          </span>
                          {p.report_header && p.report_header !== p.workspace_name && (
                            <span style={{ fontSize:11, color:'var(--text-tertiary)' }}>
                              ({p.report_header})
                            </span>
                          )}
                        </div>
                        {p.message && (
                          <div style={{
                            marginTop:10, padding:'10px 14px',
                            background: theme==='dark'?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)',
                            borderRadius:8, borderLeft:'3px solid #d97706',
                            fontSize:13, color:'var(--text-secondary)', fontStyle:'italic',
                          }}>
                            "{p.message}"
                          </div>
                        )}
                        <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:8 }}>
                          Requested {timeAgo(p.created_at)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
                        <button className="btn btn-success btn-sm"
                          disabled={approving===p.id}
                          style={{ minWidth:110 }}
                          onClick={() => handleApprove(p.id, p.name)}>
                          {approving===p.id ? '…Approving' : '✓ Approve'}
                        </button>
                        <button className="btn btn-outline btn-sm"
                          disabled={rejecting===p.id}
                          style={{ minWidth:110, color:'var(--danger)', borderColor:'var(--danger)' }}
                          onClick={() => handleReject(p.id, p.name)}>
                          {rejecting===p.id ? '…' : '✕ Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── WORKSPACES TAB ────────────────────────────── */}
        {tab==='workspaces' && (
          <div style={S.card}>
            {/* Search + sort toolbar */}
            <div style={{ padding:'14px 18px',
                          borderBottom:`1px solid ${theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.07)'}`,
                          display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <input placeholder="Search workspaces…"
                value={search} onChange={e=>setSearch(e.target.value)}
                style={{ ...S.input, flex:1, minWidth:160, marginBottom:0, width:'auto' }} />
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{
                ...S.input, marginBottom:0, width:'auto', cursor:'pointer',
              }}>
                <option value="last_active">Last active</option>
                <option value="newest">Newest first</option>
                <option value="name">Name A–Z</option>
                <option value="users">Most users</option>
              </select>
              <span style={{ fontSize:12, color:'var(--text-tertiary)', whiteSpace:'nowrap' }}>
                {filtered.length} workspace{filtered.length!==1?'s':''}
              </span>
            </div>

            {/* Workspace rows */}
            {filtered.length === 0 ? (
              <div style={{ padding:48, textAlign:'center', color:'var(--text-tertiary)', fontSize:14 }}>
                {search ? 'No workspaces match' : 'No workspaces yet'}
              </div>
            ) : filtered.map((w, i) => {
              const status  = activityStatus(w.last_active);
              const isOpen  = expanded === w.id;
              const total   = parseInt(w.admin_count||0) + parseInt(w.member_count||0);

              return (
                <div key={w.id} style={{
                  borderBottom: i < filtered.length-1
                    ? `1px solid ${theme==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.05)'}` : 'none'
                }}>
                  {/* Main row */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : w.id)}
                    style={{
                      padding:'14px 18px', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:12,
                      background: isOpen
                        ? (theme==='dark'?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.02)')
                        : 'transparent',
                      transition:'background 0.12s',
                    }}
                    onMouseEnter={e => !isOpen && (e.currentTarget.style.background = theme==='dark'?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.015)')}
                    onMouseLeave={e => !isOpen && (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Activity indicator */}
                    <div title={status.label} style={{
                      width:9, height:9, borderRadius:'50%',
                      background: status.color, flexShrink:0,
                      boxShadow: status.color==='#16a34a' ? `0 0 8px ${status.color}88` : 'none',
                    }} />

                    {/* Name */}
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

                    {/* Status badge */}
                    <div style={{
                      fontSize:10, padding:'3px 8px', borderRadius:20, flexShrink:0,
                      background: status.bg, color: status.color,
                      border:`1px solid ${status.color}33`,
                      fontWeight:600, whiteSpace:'nowrap',
                    }}>
                      {status.label}
                    </div>

                    {/* Counts */}
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      {[
                        { icon:'👥', val:total,         tip:'users' },
                        { icon:'📁', val:w.project_count, tip:'projects' },
                      ].map(({icon,val,tip}) => (
                        <span key={tip} title={tip} style={{
                          fontSize:11, padding:'3px 9px', borderRadius:20, whiteSpace:'nowrap',
                          background: theme==='dark'?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)',
                          color:'var(--text-secondary)',
                          border:`1px solid ${theme==='dark'?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.08)'}`,
                        }}>
                          {icon} {val}
                        </span>
                      ))}
                    </div>

                    {/* Last active */}
                    <div style={{ fontSize:11, color:'var(--text-tertiary)',
                                  minWidth:70, textAlign:'right', flexShrink:0 }}>
                      {timeAgo(w.last_active)}
                    </div>

                    {/* Chevron */}
                    <div style={{ fontSize:10, color:'var(--text-tertiary)', flexShrink:0,
                                  transition:'transform 0.2s',
                                  transform: isOpen?'rotate(180deg)':'rotate(0)' }}>▼</div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{
                      padding:'16px 20px 20px 40px',
                      background: theme==='dark'?'rgba(0,0,0,0.25)':'rgba(0,0,0,0.02)',
                      borderTop:`1px solid ${theme==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'}`,
                    }}>
                      {/* Metrics row */}
                      <div style={{ display:'flex', gap:28, flexWrap:'wrap', marginBottom:16 }}>
                        {[
                          ['Created',    new Date(w.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})],
                          ['Admins',     w.admin_count],
                          ['Researchers',w.member_count],
                          ['Projects',   w.project_count],
                          ['Last active',timeAgo(w.last_active)],
                        ].map(([k,v]) => (
                          <div key={k}>
                            <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase',
                                          letterSpacing:'0.06em', color:'var(--text-tertiary)', marginBottom:3 }}>
                              {k}
                            </div>
                            <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Privacy note + delete */}
                      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                        <button className="btn btn-danger btn-sm"
                          disabled={deleting===w.id}
                          onClick={e => { e.stopPropagation(); handleDeleteWorkspace(w.id, w.name); }}>
                          {deleting===w.id ? '⏳ Deleting…' : '🗑 Delete Workspace'}
                        </button>
                        <span style={{ fontSize:11, color:'var(--text-tertiary)' }}>
                          Financial data is private — you cannot view expenses or budgets.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Activity legend */}
        <div style={{ marginTop:14, display:'flex', gap:18, fontSize:11, color:'var(--text-tertiary)', flexWrap:'wrap' }}>
          {[['#16a34a','Active this week'],['#d97706','Active this month'],['#6b7280','Inactive / never']].map(([c,l]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:c }} />{l}
            </div>
          ))}
        </div>
      </div>

      {/* ── Profile panel ─────────────────────────────── */}
      {profileOpen && (
        <>
          <div onClick={() => setProfileOpen(false)} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.40)',
            zIndex:200, backdropFilter:'blur(4px)',
          }} />
          <div style={{
            position:'fixed', top:0, right:0, bottom:0, width:340,
            background: theme==='dark' ? '#1c1c1e' : '#ffffff',
            zIndex:201, boxShadow:'-8px 0 40px rgba(0,0,0,0.20)',
            display:'flex', flexDirection:'column', overflowY:'auto',
          }}>
            {/* Panel header */}
            <div style={{
              padding:'16px 20px', position:'sticky', top:0, zIndex:1,
              background: theme==='dark' ? '#1c1c1e' : '#ffffff',
              borderBottom:`1px solid ${theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}`,
              display:'flex', justifyContent:'space-between', alignItems:'center',
            }}>
              <span style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
                My Account
              </span>
              <button onClick={() => setProfileOpen(false)} style={{
                background:'none', border:'none', cursor:'pointer', fontSize:22,
                color:'var(--text-tertiary)', lineHeight:1,
              }}>×</button>
            </div>

            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:22 }}>

              {/* Avatar section */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                <div style={{
                  width:76, height:76, borderRadius:'50%', background:'#7c3aed',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  overflow:'hidden', border:'3px solid rgba(124,58,237,0.30)',
                }}>
                  {(avatarPreview||user?.avatar_url)
                    ? <img src={avatarPreview||user?.avatar_url} alt=""
                        style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <span style={{ fontSize:24, fontWeight:700, color:'#fff' }}>{initials}</span>}
                </div>
                {/* File upload */}
                <input type="file" accept="image/*" id="sa-avatar"
                  style={{ display:'none' }} onChange={handleAvatarFile} />
                <label htmlFor="sa-avatar" style={{
                  padding:'6px 14px', border:`1px solid ${theme==='dark'?'rgba(255,255,255,0.16)':'rgba(0,0,0,0.15)'}`,
                  borderRadius:8, cursor:'pointer', fontSize:12, color:'var(--text-secondary)',
                  background: theme==='dark'?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.03)',
                }}>
                  📁 Upload photo (any size)
                </label>
                {/* URL input */}
                <div style={{ display:'flex', gap:6, width:'100%' }}>
                  <input placeholder="Or paste image URL…"
                    value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && setAP(urlInput.trim())}
                    style={{ ...S.input, flex:1, marginBottom:0, fontSize:12 }} />
                  <button className="btn btn-outline btn-sm"
                    onClick={() => { setAP(urlInput.trim()); setUrlInput(''); }}>
                    Use
                  </button>
                </div>
                {avatarPreview && (
                  <button className="btn btn-ghost btn-sm"
                    style={{ color:'var(--danger)', fontSize:11 }}
                    onClick={() => setAP('')}>
                    Remove photo
                  </button>
                )}
              </div>

              {/* Name */}
              <div>
                <label style={S.label}>Display Name</label>
                <input value={pName} onChange={e=>setPName(e.target.value)} style={S.input} />
                <button className="btn btn-primary btn-sm" onClick={saveProfile}
                  style={{ width:'100%', justifyContent:'center' }}>
                  Save Name & Photo
                </button>
                <Msg m={pMsg} />
              </div>

              {/* Password */}
              <div style={{ borderTop:`1px solid ${theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.07)'}`, paddingTop:18 }}>
                <label style={S.label}>Change Password</label>
                {[
                  [pw.current, v=>setPw(p=>({...p,current:v})), 'Current password'],
                  [pw.newpw,   v=>setPw(p=>({...p,newpw:v})),   'New password (min 8)'],
                  [pw.confirm, v=>setPw(p=>({...p,confirm:v})), 'Confirm new password'],
                ].map(([val,onChange,ph],i) => (
                  <input key={i} type="password" placeholder={ph}
                    value={val} onChange={e=>onChange(e.target.value)} style={S.input} />
                ))}
                <button className="btn btn-outline btn-sm" onClick={changePassword}
                  style={{ width:'100%', justifyContent:'center' }}>
                  Change Password
                </button>
                <Msg m={pwMsg} />
              </div>

              {/* Email */}
              <div style={{ borderTop:`1px solid ${theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.07)'}`, paddingTop:18 }}>
                <label style={S.label}>Change Email</label>
                <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:8 }}>
                  Current: <strong>{user?.email}</strong>
                  <br />You will be signed out after changing.
                </div>
                <input type="email" placeholder="New email"
                  value={emailF.new_email}
                  onChange={e=>setEmailF(f=>({...f,new_email:e.target.value}))}
                  style={S.input} />
                <input type="password" placeholder="Confirm with password"
                  value={emailF.password}
                  onChange={e=>setEmailF(f=>({...f,password:e.target.value}))}
                  style={S.input} />
                <button className="btn btn-outline btn-sm" onClick={changeEmail}
                  style={{ width:'100%', justifyContent:'center' }}>
                  Change Email
                </button>
                <Msg m={emailMsg} />
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
