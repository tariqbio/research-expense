import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const timeAgo = d => {
  if (!d) return 'Never';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)     return 'Just now';
  if (s < 3600)   return `${Math.floor(s/60)}m ago`;
  if (s < 86400)  return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',
  { day:'2-digit', month:'short', year:'numeric' }) : '—';

const activityStatus = d => {
  if (!d) return { color:'#6b7280', label:'Never active', dot:'#6b7280' };
  const days = (Date.now() - new Date(d)) / 86400000;
  if (days < 1)  return { color:'#16a34a', label:'Active today',      dot:'#16a34a' };
  if (days < 7)  return { color:'#16a34a', label:'This week',         dot:'#16a34a' };
  if (days < 30) return { color:'#d97706', label:'This month',        dot:'#d97706' };
  return           { color:'#6b7280', label:'Inactive 30+ days',      dot:'#6b7280' };
};

export default function SuperAdmin() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('rt-theme') || 'light');

  const [tab, setTab]       = useState('pending');
  const [stats, setStats]   = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [pending, setPending]       = useState([]);
  const [growth, setGrowth]         = useState([]);
  const [loading, setLoading]       = useState(true);

  // Workspace drill-down
  const [drillId, setDrillId]     = useState(null);
  const [drillData, setDrillData] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('last_active');
  const [filterType, setFilterType] = useState('all'); // all | active | ghost

  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Profile
  const [pName, setPName]   = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar_url || '');
  const [urlIn, setUrlIn]   = useState('');
  const [pw, setPw]         = useState({ cur:'', nw:'', cf:'' });
  const [emailF, setEmailF] = useState({ new_email:'', password:'' });
  const [pMsg, setPMsg]     = useState({ t:'', m:'' });
  const [pwMsg, setPwMsg]   = useState({ t:'', m:'' });
  const [emMsg, setEmMsg]   = useState({ t:'', m:'' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rt-theme', theme);
  }, [theme]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, w, p, g] = await Promise.all([
        api.get('/super/stats'),
        api.get('/super/workspaces'),
        api.get('/auth/pending-signups'),
        api.get('/super/growth'),
      ]);
      setStats(s.data);
      setWorkspaces(w.data);
      setPending(p.data);
      setGrowth(g.data);
      setTab(p.data.length > 0 ? 'pending' : 'workspaces');
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const loadDrill = async id => {
    if (drillId === id) { setDrillId(null); setDrillData(null); return; }
    setDrillId(id); setDrillLoading(true);
    try {
      const { data } = await api.get(`/super/workspaces/${id}`);
      setDrillData(data);
    } catch(e) { console.error(e); }
    finally { setDrillLoading(false); }
  };

  const handleApprove = async (id, name) => {
    setApproving(id);
    try { await api.post(`/auth/pending-signups/${id}/approve`); await load(); }
    catch(e) { alert(e.response?.data?.error || 'Failed'); }
    finally { setApproving(null); }
  };

  const handleReject = async (id, name) => {
    if (!confirm(`Reject request from ${name}?`)) return;
    setRejecting(id);
    try { await api.delete(`/auth/pending-signups/${id}`); setPending(p=>p.filter(x=>x.id!==id)); }
    catch(e) { alert('Failed'); }
    finally { setRejecting(null); }
  };



  const compressAvatar = file => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX=300; let w=img.width, h=img.height;
        if (w>MAX||h>MAX) { if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;} }
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        setAvatar(c.toDataURL('image/jpeg',0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setPMsg({ t:'', m:'' });
    try {
      const { data } = await api.patch('/auth/profile', { name:pName, avatar_url:avatar||null });
      updateUser({ name:data.name, avatar_url:data.avatar_url });
      setPMsg({ t:'ok', m:'Saved' });
    } catch(e) { setPMsg({ t:'err', m:e.response?.data?.error||'Failed' }); }
  };

  const changePassword = async () => {
    if (pw.nw!==pw.cf) return setPwMsg({ t:'err', m:'Passwords do not match' });
    try {
      await api.patch('/auth/change-password', { current_password:pw.cur, new_password:pw.nw });
      setPwMsg({ t:'ok', m:'Password changed' });
      setPw({ cur:'', nw:'', cf:'' });
    } catch(e) { setPwMsg({ t:'err', m:e.response?.data?.error||'Failed' }); }
  };

  const changeEmail = async () => {
    try {
      await api.patch('/auth/change-email', emailF);
      setEmMsg({ t:'ok', m:'Email updated — signing out…' });
      setTimeout(() => { logout(); navigate('/login'); }, 1500);
    } catch(e) { setEmMsg({ t:'err', m:e.response?.data?.error||'Failed' }); }
  };

  // Filter + sort workspaces
  const filtered = workspaces
    .filter(w => {
      if (filterType==='active') return parseInt(w.active_project_count)>0;
      if (filterType==='ghost')  return parseInt(w.total_project_count)===0;
      return true;
    })
    .filter(w => !search ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.admin_email||'').toLowerCase().includes(search.toLowerCase()) ||
      (w.admin_name||'').toLowerCase().includes(search.toLowerCase()) ||
      (w.admin_institution||'').toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      if (sortBy==='last_active') return new Date(b.last_active||0)-new Date(a.last_active||0);
      if (sortBy==='newest')      return new Date(b.created_at)-new Date(a.created_at);
      if (sortBy==='name')        return a.name.localeCompare(b.name);
      if (sortBy==='users')       return (parseInt(b.admin_count)+parseInt(b.member_count))-(parseInt(a.admin_count)+parseInt(a.member_count));
      if (sortBy==='projects')    return parseInt(b.active_project_count)-parseInt(a.active_project_count);
      return 0;
    });

  const initials = user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'SA';

  const dark = theme==='dark';
  const border = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)';
  const surfBg = dark ? 'rgba(28,30,26,0.95)' : '#fff';
  const hoverBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';

  const Msg = ({ m }) => m.m ? (
    <div style={{ fontSize:12, marginTop:5, color:m.t==='ok'?'#16a34a':'#dc2626' }}>
      {m.t==='ok'?'✓ ':'✗ '}{m.m}
    </div>
  ) : null;

  const Input = ({ ...props }) => (
    <input {...props} style={{
      width:'100%', padding:'8px 12px', fontSize:13, marginBottom:8, borderRadius:8,
      border:`1px solid ${border}`, outline:'none',
      background: dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.03)',
      color:'var(--text-primary)', ...props.style,
    }} />
  );

  const cardStyle = {
    background: dark?'rgba(28,30,26,0.90)':'rgba(255,255,255,0.85)',
    border:`1px solid ${border}`, borderRadius:14,
    backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
    boxShadow: dark
      ? '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.4)'
      : '0 0 0 1px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.07)',
    overflow:'hidden',
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
                  background:'var(--bg-base)', flexDirection:'column', gap:12 }}>
      <div className="spinner" />
      <div style={{ fontSize:13, color:'var(--text-tertiary)' }}>Loading platform…</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)', display:'flex', flexDirection:'column' }}>

      {/* ── Topbar ──────────────────────────────────────── */}
      <header style={{
        position:'sticky', top:0, zIndex:100,
        background: dark?'rgba(20,22,20,0.90)':'rgba(255,255,255,0.88)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        borderBottom:`1px solid ${border}`,
        padding:'0 24px', height:56,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        boxShadow: dark?'0 1px 12px rgba(0,0,0,0.3)':'0 1px 6px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <a href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
            <div style={{ width:30, height:30, borderRadius:8,
                          background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:14, fontWeight:800, color:'#fff' }}>R</div>
            <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>ResearchTrack</span>
          </a>
          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
                         background:'rgba(124,58,237,0.12)', color:'#7c3aed',
                         border:'1px solid rgba(124,58,237,0.25)' }}>Super Admin</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {pending.length > 0 && (
            <button onClick={() => setTab('pending')} style={{
              background:'#ef4444', color:'#fff', border:'none', borderRadius:20,
              padding:'3px 10px', fontSize:11, fontWeight:700, cursor:'pointer',
            }}>{pending.length} pending</button>
          )}
          <button onClick={() => setTheme(t=>t==='light'?'dark':'light')} style={{
            width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:15,
            background:dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)',
            border:`1px solid ${border}`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{theme==='light'?'🌙':'☀️'}</button>
          <button onClick={() => setProfileOpen(true)} style={{
            width:32, height:32, borderRadius:'50%', cursor:'pointer', padding:0,
            border:'2px solid rgba(124,58,237,0.4)', overflow:'hidden',
            background:'#7c3aed', flexShrink:0,
          }}>
            {(avatar||user?.avatar_url)
              ? <img src={avatar||user?.avatar_url} alt=""
                  style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontSize:11, fontWeight:700, color:'#fff' }}>{initials}</span>}
          </button>
          <button className="btn btn-outline btn-sm"
            onClick={() => { logout(); navigate('/login'); }}>Sign Out</button>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────── */}
      <div style={{ flex:1, padding:'24px', maxWidth:1080, margin:'0 auto', width:'100%' }}>

        {/* Page header */}
        <div style={{ marginBottom:20 }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'var(--text-primary)' }}>
            Platform Control
          </h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--text-tertiary)' }}>
            {user?.email} · Financial data is private and not visible to you
          </p>
        </div>

        {/* ── Stats ───────────────────────────────────────── */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
                        gap:12, marginBottom:24 }}>
            {[
              {
                icon:'🏠', label:'Total Workspaces',
                value: stats.total_workspaces,
                sub: `${stats.workspaces_with_projects} with projects`,
                note: parseInt(stats.ghost_workspaces)>0 ? `⚠ ${stats.ghost_workspaces} ghost` : null,
                color:'#7c3aed',
                action: () => { setFilterType('all'); setTab('workspaces'); },
              },
              {
                icon:'👤', label:'Workspace Owners',
                value: stats.total_admins,
                sub: 'Your real customers',
                color:'#0891b2',
                action: () => setTab('workspaces'),
              },
              {
                icon:'👥', label:'Researchers',
                value: stats.total_members,
                sub: `${stats.active_users_7d} active this week`,
                color:'#16a34a',
              },
              {
                icon:'📁', label:'Active Projects',
                value: stats.active_projects,
                sub: `${stats.total_projects} total including archived`,
                color:'#d97706',
              },
              {
                icon:'🆕', label:'New This Month',
                value: stats.new_workspaces_30d,
                sub: 'Workspace signups',
                color:'#ec4899',
                action: () => { setFilterType('all'); setSortBy('newest'); setTab('workspaces'); },
              },
              {
                icon:'👻', label:'Ghost Workspaces',
                value: stats.ghost_workspaces,
                sub: 'Registered, no projects',
                color: parseInt(stats.ghost_workspaces)>0 ? '#ef4444' : '#6b7280',
                action: () => { setFilterType('ghost'); setTab('workspaces'); },
              },
            ].map((s,i) => (
              <div key={i} style={{
                ...cardStyle, padding:'14px 16px',
                cursor: s.action ? 'pointer' : 'default',
                transition:'transform 0.15s, box-shadow 0.15s',
              }}
                onClick={s.action}
                onMouseEnter={e => s.action && (e.currentTarget.style.transform='translateY(-2px)')}
                onMouseLeave={e => s.action && (e.currentTarget.style.transform='none')}>
                <div style={{ fontSize:18, marginBottom:6 }}>{s.icon}</div>
                <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginTop:4 }}>{s.label}</div>
                <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:2 }}>{s.sub}</div>
                {s.note && <div style={{ fontSize:10, color:'#ef4444', marginTop:3, fontWeight:600 }}>{s.note}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Growth sparkline — monthly new workspaces */}
        {growth.length > 0 && (
          <div style={{ ...cardStyle, padding:'16px 20px', marginBottom:24 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)',
                          textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
              New Workspaces — Last 12 Months
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:50 }}>
              {growth.map((g,i) => {
                const max = Math.max(...growth.map(x=>parseInt(x.count)), 1);
                const h = Math.max(4, (parseInt(g.count)/max)*46);
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column',
                                        alignItems:'center', gap:3 }}>
                    <div style={{ fontSize:9, color:'var(--text-tertiary)', fontWeight:600 }}>
                      {g.count}
                    </div>
                    <div style={{
                      width:'100%', height:`${h}px`, borderRadius:3,
                      background: i===growth.length-1 ? '#7c3aed' : (dark?'rgba(124,58,237,0.35)':'rgba(124,58,237,0.20)'),
                      transition:'height 0.3s',
                    }} />
                    <div style={{ fontSize:9, color:'var(--text-tertiary)', whiteSpace:'nowrap' }}>
                      {g.month}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tabs ─────────────────────────────────────────── */}
        <div style={{ display:'flex', borderBottom:`1px solid ${border}`, marginBottom:20 }}>
          {[
            { key:'pending',    label:'Pending Requests', badge: pending.length },
            { key:'workspaces', label:`Workspaces (${workspaces.length})` },
          ].map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding:'10px 16px', fontSize:13, fontWeight: tab===t.key ? 600 : 500,
                cursor:'pointer', background:'none', border:'none',
                borderBottom: tab===t.key ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab===t.key ? 'var(--accent)' : 'var(--text-secondary)',
                display:'flex', alignItems:'center', gap:6,
              }}>
              {t.label}
              {t.badge > 0 && (
                <span style={{ background:'#ef4444', color:'#fff', borderRadius:10,
                               padding:'1px 6px', fontSize:10, fontWeight:700 }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── PENDING TAB ──────────────────────────────────── */}
        {tab==='pending' && (
          pending.length === 0 ? (
            <div style={{ ...cardStyle, padding:48, textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>
                No pending requests
              </div>
              <div style={{ fontSize:13, color:'var(--text-tertiary)' }}>
                New access requests will appear here for your review.
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {pending.map(p => (
                <div key={p.id} style={{ ...cardStyle, padding:'20px' }}>
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                    <div style={{
                      width:46, height:46, borderRadius:'50%',
                      background:'linear-gradient(135deg,#d97706,#f59e0b)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:16, fontWeight:700, color:'#fff', flexShrink:0,
                    }}>
                      {p.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                    </div>
                    <div style={{ flex:1, minWidth:200 }}>
                      {/* Identity */}
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                        <span style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>{p.name}</span>
                        {p.role_in_project && (
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                                         background:'rgba(124,58,237,0.10)', color:'#7c3aed',
                                         border:'1px solid rgba(124,58,237,0.20)', fontWeight:600 }}>
                            {p.role_in_project}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:2 }}>{p.email}</div>
                      {p.institution && (
                        <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:2 }}>
                          🏛 {p.institution}
                          {p.position && <span style={{ color:'var(--text-tertiary)' }}> · {p.position}</span>}
                        </div>
                      )}

                      {/* Project details grid */}
                      <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginTop:8,
                                    padding:'10px 14px', borderRadius:8,
                                    background: dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)',
                                    border:`1px solid ${border}` }}>
                        {[
                          ['Workspace', p.workspace_name + (p.report_header&&p.report_header!==p.workspace_name ? ` (${p.report_header})` : '')],
                          p.research_area && ['Research Area', p.research_area],
                          p.funding_source && ['Funding', p.funding_source],
                          p.project_nature && ['Project Type', p.project_nature],
                        ].filter(Boolean).map(([k,v]) => (
                          <div key={k}>
                            <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase',
                                          letterSpacing:'0.06em', color:'var(--text-tertiary)', marginBottom:2 }}>
                              {k}
                            </div>
                            <div style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500 }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {p.message && (
                        <div style={{
                          marginTop:10, padding:'10px 14px', borderRadius:8,
                          borderLeft:'3px solid #d97706', fontSize:13,
                          background: dark?'rgba(217,119,6,0.08)':'rgba(217,119,6,0.05)',
                          color:'var(--text-secondary)', fontStyle:'italic',
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
                        disabled={approving===p.id} style={{ minWidth:110 }}
                        onClick={() => handleApprove(p.id, p.name)}>
                        {approving===p.id ? '…' : '✓ Approve'}
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
          )
        )}

        {/* ── WORKSPACES TAB ───────────────────────────────── */}
        {tab==='workspaces' && (
          <div style={{ display:'grid', gridTemplateColumns: drillId ? '1fr 1fr' : '1fr', gap:16 }}>

            {/* Workspace list */}
            <div style={cardStyle}>
              {/* Toolbar */}
              <div style={{ padding:'12px 16px',
                            borderBottom:`1px solid ${border}`,
                            display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <input placeholder="Search by name, admin, institution…"
                  value={search} onChange={e=>setSearch(e.target.value)}
                  style={{
                    flex:1, minWidth:140, padding:'7px 12px', fontSize:13, borderRadius:8,
                    border:`1px solid ${border}`, outline:'none',
                    background: dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.03)',
                    color:'var(--text-primary)',
                  }} />
                <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{
                  padding:'7px 10px', fontSize:12, borderRadius:8, cursor:'pointer',
                  border:`1px solid ${border}`,
                  background: dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.03)',
                  color:'var(--text-primary)',
                }}>
                  <option value="all">All</option>
                  <option value="active">With projects</option>
                  <option value="ghost">Ghost (no projects)</option>
                </select>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{
                  padding:'7px 10px', fontSize:12, borderRadius:8, cursor:'pointer',
                  border:`1px solid ${border}`,
                  background: dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.03)',
                  color:'var(--text-primary)',
                }}>
                  <option value="last_active">Last active</option>
                  <option value="newest">Newest</option>
                  <option value="name">Name A–Z</option>
                  <option value="users">Most users</option>
                  <option value="projects">Most projects</option>
                </select>
              </div>

              {/* Rows */}
              {filtered.length === 0 ? (
                <div style={{ padding:40, textAlign:'center', color:'var(--text-tertiary)', fontSize:13 }}>
                  {search || filterType!=='all' ? 'No workspaces match' : 'No workspaces yet'}
                </div>
              ) : filtered.map((w, i) => {
                const st   = activityStatus(w.last_active);
                const open = drillId === w.id;
                const total = parseInt(w.admin_count||0)+parseInt(w.member_count||0);
                return (
                  <div key={w.id} style={{
                    borderBottom: i<filtered.length-1 ? `1px solid ${border}` : 'none',
                    background: open ? hoverBg : 'transparent',
                  }}>
                    <div onClick={() => loadDrill(w.id)} style={{
                      padding:'12px 16px', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:10,
                      transition:'background 0.12s',
                    }}
                      onMouseEnter={e => !open && (e.currentTarget.style.background=hoverBg)}
                      onMouseLeave={e => !open && (e.currentTarget.style.background='transparent')}>

                      {/* Activity dot */}
                      <div title={st.label} style={{
                        width:8, height:8, borderRadius:'50%', background:st.dot, flexShrink:0,
                        boxShadow: st.dot==='#16a34a'?`0 0 6px ${st.dot}88`:'none',
                      }} />

                      {/* Name + admin */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:'var(--text-primary)',
                                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {w.name}
                        </div>
                        {w.admin_name && (
                          <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:1,
                                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {w.admin_name}
                            {w.admin_institution && ` · ${w.admin_institution}`}
                          </div>
                        )}
                      </div>

                      {/* Counts */}
                      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                        {[
                          { v:total, icon:'👥', title:'users' },
                          { v:w.active_project_count, icon:'📁', title:'projects' },
                          { v:w.expense_count, icon:'🧾', title:'expenses' },
                        ].map(({v,icon,title}) => (
                          <span key={title} title={title} style={{
                            fontSize:10, padding:'2px 7px', borderRadius:12,
                            background: dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)',
                            color:'var(--text-secondary)',
                            border:`1px solid ${border}`,
                          }}>{icon} {v}</span>
                        ))}
                      </div>

                      {/* Time */}
                      <div style={{ fontSize:10, color:'var(--text-tertiary)',
                                    minWidth:60, textAlign:'right', flexShrink:0 }}>
                        {timeAgo(w.last_active)}
                      </div>

                      <div style={{ fontSize:9, color:'var(--text-tertiary)', flexShrink:0,
                                    transition:'transform 0.2s',
                                    transform: open?'rotate(180deg)':'rotate(0)' }}>▼</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drill-down panel */}
            {drillId && (
              <div style={cardStyle}>
                {drillLoading ? (
                  <div style={{ padding:48, textAlign:'center' }}><div className="spinner" /></div>
                ) : drillData ? (
                  <>
                    {/* Drill header */}
                    <div style={{ padding:'14px 18px', borderBottom:`1px solid ${border}`,
                                  display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
                          {drillData.workspace.name}
                        </div>
                        {drillData.workspace.report_header && drillData.workspace.report_header !== drillData.workspace.name && (
                          <div style={{ fontSize:11, color:'var(--text-tertiary)' }}>
                            {drillData.workspace.report_header}
                          </div>
                        )}
                        <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:3 }}>
                          Created {fmtDate(drillData.workspace.created_at)}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <span style={{ fontSize:11, color:'var(--text-tertiary)',
                                              fontStyle:'italic' }}>
                          Read-only view
                        </span>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => { setDrillId(null); setDrillData(null); }}>
                          ✕
                        </button>
                      </div>
                    </div>

                    <div style={{ padding:'16px 18px', overflowY:'auto', maxHeight:'calc(100vh - 280px)' }}>

                      {/* Admin contacts */}
                      <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase',
                                    letterSpacing:'0.06em', color:'var(--text-tertiary)', marginBottom:8 }}>
                        Team ({drillData.members.length})
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
                        {drillData.members.map(m => (
                          <div key={m.id} style={{
                            display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                            borderRadius:8,
                            background: dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.02)',
                            border:`1px solid ${border}`,
                          }}>
                            <div style={{
                              width:30, height:30, borderRadius:'50%', flexShrink:0,
                              background: m.role==='admin'?'#7c3aed':'#6b7280',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:11, fontWeight:700, color:'#fff',
                            }}>
                              {m.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>
                                {m.name}
                                {m.role==='admin' && (
                                  <span style={{ marginLeft:6, fontSize:10, color:'#7c3aed',
                                                 fontWeight:600 }}>⭐ admin</span>
                                )}
                              </div>
                              <div style={{ fontSize:11, color:'var(--text-tertiary)',
                                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {m.email}
                                {m.institution && ` · ${m.institution}`}
                              </div>
                              {(m.designation||m.position||m.role_in_project) && (
                                <div style={{ fontSize:10, color:'var(--text-tertiary)', marginTop:1 }}>
                                  {[m.role_in_project, m.designation||m.position].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize:10, color:'var(--text-tertiary)', flexShrink:0 }}>
                              {timeAgo(m.last_active)}
                            </div>
                          </div>
                        ))}
                        {drillData.members.length === 0 && (
                          <div style={{ fontSize:13, color:'var(--text-tertiary)' }}>No members yet</div>
                        )}
                      </div>

                      {/* Projects list */}
                      <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase',
                                    letterSpacing:'0.06em', color:'var(--text-tertiary)', marginBottom:8 }}>
                        Recent Projects ({drillData.projects.length})
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        {drillData.projects.map(p => (
                          <div key={p.id} style={{
                            display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
                            borderRadius:6,
                            background: dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)',
                          }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'var(--accent)',
                                           minWidth:60 }}>{p.code}</span>
                            <span style={{ flex:1, fontSize:12, color:'var(--text-primary)',
                                           overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {p.name}
                            </span>
                            <span className={`badge ${p.status==='active'?'badge-green':p.archived?'badge-gray':'badge-teal'}`}
                              style={{ fontSize:9 }}>
                              {p.archived ? 'archived' : p.status}
                            </span>
                          </div>
                        ))}
                        {drillData.projects.length === 0 && (
                          <div style={{ fontSize:13, color:'var(--text-tertiary)' }}>
                            No projects — this is a ghost workspace
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Activity legend */}
        <div style={{ marginTop:14, display:'flex', gap:18, fontSize:11,
                      color:'var(--text-tertiary)', flexWrap:'wrap' }}>
          {[['#16a34a','Active this week'],['#d97706','Active this month'],['#6b7280','Inactive / never']].map(([c,l]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:c }} />{l}
            </div>
          ))}
        </div>
      </div>

      {/* ── Profile panel ──────────────────────────────── */}
      {profileOpen && (
        <>
          <div onClick={() => setProfileOpen(false)} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.40)',
            zIndex:200, backdropFilter:'blur(4px)',
          }} />
          <div style={{
            position:'fixed', top:0, right:0, bottom:0, width:340,
            background: dark?'#1c1c1e':'#fff',
            zIndex:201, boxShadow:'-8px 0 40px rgba(0,0,0,0.20)',
            display:'flex', flexDirection:'column', overflowY:'auto',
          }}>
            <div style={{
              padding:'16px 20px', position:'sticky', top:0, zIndex:1,
              background: dark?'#1c1c1e':'#fff',
              borderBottom:`1px solid ${border}`,
              display:'flex', justifyContent:'space-between', alignItems:'center',
            }}>
              <span style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>My Account</span>
              <button onClick={() => setProfileOpen(false)} style={{
                background:'none', border:'none', cursor:'pointer',
                fontSize:22, color:'var(--text-tertiary)', lineHeight:1,
              }}>×</button>
            </div>

            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:20 }}>
              {/* Avatar */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                <div style={{
                  width:72, height:72, borderRadius:'50%', background:'#7c3aed',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  overflow:'hidden', border:'3px solid rgba(124,58,237,0.3)',
                }}>
                  {(avatar||user?.avatar_url)
                    ? <img src={avatar||user?.avatar_url} alt=""
                        style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <span style={{ fontSize:22, fontWeight:700, color:'#fff' }}>{initials}</span>}
                </div>
                <input type="file" accept="image/*" id="sa-av" style={{ display:'none' }}
                  onChange={e => compressAvatar(e.target.files[0])} />
                <label htmlFor="sa-av" style={{
                  padding:'6px 14px', border:`1px solid ${border}`, borderRadius:8,
                  cursor:'pointer', fontSize:12, color:'var(--text-secondary)',
                  background: dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.03)',
                }}>📁 Upload photo</label>
                <div style={{ display:'flex', gap:6, width:'100%' }}>
                  <Input placeholder="Or paste image URL…" value={urlIn}
                    onChange={e=>setUrlIn(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&setAvatar(urlIn.trim())}
                    style={{ marginBottom:0, fontSize:12 }} />
                  <button className="btn btn-outline btn-sm"
                    onClick={() => { setAvatar(urlIn.trim()); setUrlIn(''); }}>Use</button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.06em',
                                textTransform:'uppercase', color:'var(--text-tertiary)', marginBottom:6 }}>
                  Display Name
                </label>
                <Input value={pName} onChange={e=>setPName(e.target.value)} />
                <button className="btn btn-primary btn-sm" onClick={saveProfile}
                  style={{ width:'100%', justifyContent:'center' }}>
                  Save Name & Photo
                </button>
                <Msg m={pMsg} />
              </div>

              {/* Password */}
              <div style={{ borderTop:`1px solid ${border}`, paddingTop:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.06em',
                                textTransform:'uppercase', color:'var(--text-tertiary)', marginBottom:8 }}>
                  Change Password
                </label>
                {[['cur','Current password'],['nw','New password (min 8)'],['cf','Confirm new']].map(([k,ph]) => (
                  <Input key={k} type="password" placeholder={ph}
                    value={pw[k]} onChange={e=>setPw(p=>({...p,[k]:e.target.value}))} />
                ))}
                <button className="btn btn-outline btn-sm" onClick={changePassword}
                  style={{ width:'100%', justifyContent:'center' }}>
                  Change Password
                </button>
                <Msg m={pwMsg} />
              </div>

              {/* Email */}
              <div style={{ borderTop:`1px solid ${border}`, paddingTop:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.06em',
                                textTransform:'uppercase', color:'var(--text-tertiary)', marginBottom:4 }}>
                  Change Email
                </label>
                <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:8 }}>
                  Current: <strong>{user?.email}</strong><br/>Signing out required after change.
                </div>
                <Input type="email" placeholder="New email"
                  value={emailF.new_email} onChange={e=>setEmailF(f=>({...f,new_email:e.target.value}))} />
                <Input type="password" placeholder="Confirm with your password"
                  value={emailF.password} onChange={e=>setEmailF(f=>({...f,password:e.target.value}))} />
                <button className="btn btn-outline btn-sm" onClick={changeEmail}
                  style={{ width:'100%', justifyContent:'center' }}>
                  Change Email
                </button>
                <Msg m={emMsg} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
