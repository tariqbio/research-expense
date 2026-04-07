import { useState, useEffect, useCallback } from 'react';
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

const activityStatus = d => {
  if (!d) return { color:'#6b7280', label:'Never used', bg:'rgba(107,114,128,0.12)' };
  const days = (Date.now() - new Date(d)) / 86400000;
  if (days < 1)  return { color:'#16a34a', label:'Active today',      bg:'rgba(22,163,74,0.12)' };
  if (days < 7)  return { color:'#16a34a', label:'Active this week',  bg:'rgba(22,163,74,0.10)' };
  if (days < 30) return { color:'#d97706', label:'Active this month', bg:'rgba(217,119,6,0.12)' };
  return           { color:'#6b7280', label:'Inactive 30+ days',      bg:'rgba(107,114,128,0.10)' };
};

const BAR_COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2','#7c3aed','#db2777'];

function MiniBarChart({ data, color = '#7c3aed' }) {
  if (!data || data.length === 0) return <div style={{ fontSize:11, color:'var(--text-tertiary)' }}>No data yet</div>;
  const max = Math.max(...data.map(d => parseInt(d.count)), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:48 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, gap:3 }}>
          <div style={{
            width:'100%', borderRadius:'3px 3px 0 0',
            background: color,
            height: `${Math.max(4, (parseInt(d.count)/max)*44)}px`,
            opacity: 0.7 + (i/data.length)*0.3,
            transition: 'height 0.3s ease',
          }} title={`${d.label||d.month}: ${d.count}`} />
          <span style={{ fontSize:8, color:'var(--text-tertiary)', whiteSpace:'nowrap', overflow:'hidden',
                         textOverflow:'ellipsis', maxWidth:'100%', textAlign:'center' }}>
            {d.label||d.month}
          </span>
        </div>
      ))}
    </div>
  );
}

function HorizBars({ data, total, color }) {
  if (!data || data.length === 0) return <div style={{ fontSize:11, color:'var(--text-tertiary)' }}>No data yet</div>;
  const max = Math.max(...data.map(d => parseInt(d.count)), 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {data.slice(0,6).map((d, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:110, fontSize:11, color:'var(--text-secondary)', overflow:'hidden',
                        textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}
               title={d.label}>{d.label}</div>
          <div style={{ flex:1, height:8, borderRadius:4,
                        background:'var(--bg-secondary)', overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:4,
              background: BAR_COLORS[i % BAR_COLORS.length],
              width:`${(parseInt(d.count)/max)*100}%`,
              transition:'width 0.4s ease',
            }} />
          </div>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text-primary)', minWidth:18, textAlign:'right' }}>
            {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SuperAdmin() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme]     = useState(() => localStorage.getItem('rt-theme') || 'light');
  const [tab, setTab]         = useState('pending');
  const [stats, setStats]     = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [pending, setPending]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [sortBy, setSortBy]         = useState('last_active');
  const [expanded, setExpanded]     = useState(null);
  const [members, setMembers]       = useState({});   // wsId -> members array
  const [membersLoading, setMembersLoading] = useState({});
  const [approving, setApproving]   = useState(null);
  const [rejecting, setRejecting]   = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

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

  const load = useCallback(async () => {
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
      if (p.data.length > 0) setTab('pending');
      else setTab('workspaces');
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadMembers = async (wsId) => {
    if (members[wsId]) return; // cached
    setMembersLoading(m => ({ ...m, [wsId]: true }));
    try {
      const { data } = await api.get(`/super/workspaces/${wsId}/members`);
      setMembers(m => ({ ...m, [wsId]: data }));
    } catch(e) { console.error(e); }
    finally { setMembersLoading(m => ({ ...m, [wsId]: false })); }
  };

  const handleExpand = (wsId) => {
    const opening = expanded !== wsId;
    setExpanded(opening ? wsId : null);
    if (opening) loadMembers(wsId);
  };

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
      (w.report_header||'').toLowerCase().includes(search.toLowerCase()) ||
      (w.institution||'').toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      if (sortBy==='last_active') return new Date(b.last_active||0)-new Date(a.last_active||0);
      if (sortBy==='newest')      return new Date(b.created_at)-new Date(a.created_at);
      if (sortBy==='name')        return a.name.localeCompare(b.name);
      if (sortBy==='users')       return (parseInt(b.admin_count)+parseInt(b.member_count))-(parseInt(a.admin_count)+parseInt(a.member_count));
      if (sortBy==='projects')    return parseInt(b.project_count)-parseInt(a.project_count);
      return 0;
    });

  const initials = user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || 'SA';

  const S = {
    topbar: {
      position:'sticky', top:0, zIndex:100,
      background: theme==='dark' ? 'rgba(20,22,20,0.88)' : 'rgba(255,255,255,0.82)',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      borderBottom:`1px solid ${theme==='dark'?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.09)'}`,
      padding:'0 24px', height:56,
      display:'flex', alignItems:'center', justifyContent:'space-between',
    },
    page: { flex:1, padding:'24px', maxWidth:1100, margin:'0 auto', width:'100%' },
    card: {
      background: theme==='dark' ? 'rgba(28,30,26,0.78)' : 'rgba(255,255,255,0.85)',
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
    tabBtn: (active) => ({
      background:'none', border:'none',
      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      color: active ? 'var(--accent)' : 'var(--text-secondary)',
      padding:'10px 16px', fontSize:13, fontWeight: active ? 600 : 500, cursor:'pointer',
    }),
    sectionTitle: {
      fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em',
      color:'var(--text-tertiary)', marginBottom:12,
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

  // ── Platform summary numbers for quick-glance stat cards ──
  const statCards = stats ? [
    {
      label:'Workspaces (PIs)',
      value: stats.total_workspaces,
      sub: `${stats.new_workspaces_7d} new this week`,
      icon:'🏛️', color:'#7c3aed',
    },
    {
      label:'Total Researchers',
      value: stats.total_members,
      sub: `${stats.active_users_7d} active this week`,
      icon:'🔬', color:'#2563eb',
    },
    {
      label:'Active Projects',
      value: stats.active_projects,
      sub: `${stats.completed_projects} completed`,
      icon:'📁', color:'#059669',
    },
    {
      label:'Pending Approvals',
      value: pending.length,
      icon: pending.length > 0 ? '⏳' : '✅',
      color: pending.length > 0 ? '#ef4444' : '#16a34a',
      sub: pending.length > 0 ? 'Need your review' : 'All clear',
      action: pending.length > 0 ? () => setTab('pending') : null,
    },
    {
      label:'Online Today',
      value: stats.active_users_24h,
      sub: `Avg team: ${stats.avg_team_size} members`,
      icon:'🟢', color:'#059669',
    },
    {
      label:'Total Expenses Filed',
      value: stats.total_expenses,
      sub: `Across ${stats.total_projects} projects`,
      icon:'📋', color:'#d97706',
    },
  ] : [];

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)', display:'flex', flexDirection:'column' }}>

      {/* ── Topbar ─────────────────────────────────────── */}
      <header style={S.topbar}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8,
                        background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
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
          <button onClick={() => setAnalyticsOpen(true)} style={{
            padding:'5px 12px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600,
            background: theme==='dark'?'rgba(124,58,237,0.15)':'rgba(124,58,237,0.08)',
            border:'1px solid rgba(124,58,237,0.25)', color:'#7c3aed',
          }}>📊 Analytics</button>
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

      <div style={S.page}>

        {/* ── Stat Cards Row ─────────────────────────── */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
                        gap:12, marginBottom:20 }}>
            {statCards.map((s,i) => (
              <div key={i}
                onClick={s.action}
                style={{
                  ...S.card, padding:'16px',
                  cursor: s.action ? 'pointer' : 'default',
                  transition:'transform 0.15s',
                }}
                onMouseEnter={e => s.action && (e.currentTarget.style.transform='translateY(-2px)')}
                onMouseLeave={e => s.action && (e.currentTarget.style.transform='none')}
              >
                <div style={{ fontSize:20, marginBottom:6 }}>{s.icon}</div>
                <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginTop:4 }}>{s.label}</div>
                <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Platform Growth + Quick Analytics ──────── */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
            {/* Monthly growth */}
            <div style={{ ...S.card, padding:'18px' }}>
              <div style={S.sectionTitle}>📈 New Workspaces / Month</div>
              <MiniBarChart data={stats.monthly_growth} color="#7c3aed" />
              <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:8 }}>
                {stats.new_workspaces_30d} new in last 30 days
              </div>
            </div>

            {/* Top institutions */}
            <div style={{ ...S.card, padding:'18px' }}>
              <div style={S.sectionTitle}>🏛️ Top Institutions</div>
              {stats.top_institutions.length > 0
                ? <HorizBars data={stats.top_institutions} />
                : <div style={{ fontSize:12, color:'var(--text-tertiary)', paddingTop:8 }}>
                    Fills in as users register with institution data
                  </div>}
            </div>

            {/* Top granting agencies */}
            <div style={{ ...S.card, padding:'18px' }}>
              <div style={S.sectionTitle}>💰 Top Granting Agencies</div>
              {stats.top_agencies.length > 0
                ? <HorizBars data={stats.top_agencies} />
                : <div style={{ fontSize:12, color:'var(--text-tertiary)', paddingTop:8 }}>
                    Fills in as PIs register with funding source data
                  </div>}
            </div>
          </div>
        )}

        {/* ── Second analytics row ─────────────────── */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
            {/* Degree breakdown */}
            <div style={{ ...S.card, padding:'18px' }}>
              <div style={S.sectionTitle}>🎓 PI Academic Qualifications</div>
              {stats.degree_breakdown.length > 0
                ? <HorizBars data={stats.degree_breakdown} />
                : <div style={{ fontSize:12, color:'var(--text-tertiary)', paddingTop:4 }}>
                    Populates after PIs complete the qualification field at registration
                  </div>}
            </div>

            {/* Research areas */}
            <div style={{ ...S.card, padding:'18px' }}>
              <div style={S.sectionTitle}>🔬 Research Areas</div>
              {stats.top_research_areas.length > 0
                ? <HorizBars data={stats.top_research_areas} />
                : <div style={{ fontSize:12, color:'var(--text-tertiary)', paddingTop:4 }}>
                    Shows top research domains once PIs register with area data
                  </div>}
            </div>
          </div>
        )}

        {/* ── Tabs ─────────────────────────────────── */}
        <div style={{ display:'flex', borderBottom:`1px solid ${theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}`,
                      marginBottom:20 }}>
          <button style={S.tabBtn(tab==='pending')} onClick={() => setTab('pending')}>
            Pending Requests
            {pending.length > 0 && (
              <span style={{ marginLeft:6, background:'#ef4444', color:'#fff',
                             borderRadius:10, padding:'1px 6px', fontSize:10, fontWeight:700 }}>
                {pending.length}
              </span>
            )}
          </button>
          <button style={S.tabBtn(tab==='workspaces')} onClick={() => setTab('workspaces')}>
            Workspaces ({workspaces.length})
          </button>
        </div>

        {/* ── PENDING TAB ─────────────────────────── */}
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
                        width:52, height:52, borderRadius:'50%',
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
                          {p.academic_degree && (
                            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                                           background:'rgba(124,58,237,0.10)', color:'#7c3aed',
                                           border:'1px solid rgba(124,58,237,0.20)' }}>
                              {p.academic_degree}
                            </span>
                          )}
                          {p.position && (
                            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                                           background:'rgba(0,0,0,0.06)', color:'var(--text-secondary)',
                                           border:`1px solid ${theme==='dark'?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.08)'}` }}>
                              {p.position}
                            </span>
                          )}
                          {p.publication_count > 0 && (
                            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                                           background:'rgba(5,150,105,0.10)', color:'#059669',
                                           border:'1px solid rgba(5,150,105,0.20)' }}>
                              {p.publication_count} publications
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:6 }}>{p.email}</div>

                        {/* Institution + Department */}
                        {(p.institution || p.department) && (
                          <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:4 }}>
                            🏛️ {[p.department, p.institution].filter(Boolean).join(', ')}
                          </div>
                        )}

                        {/* Research area */}
                        {p.research_area && (
                          <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:4 }}>
                            🔬 Research: <strong>{p.research_area}</strong>
                          </div>
                        )}

                        {/* Workspace + granting agency */}
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:4 }}>
                          <span style={{ fontSize:12, color:'var(--text-tertiary)' }}>Workspace:</span>
                          <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>
                            {p.workspace_name}
                          </span>
                        </div>

                        {p.granting_agency && (
                          <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:4 }}>
                            💰 Funded by: <strong>{p.granting_agency}</strong>
                            {p.expected_fund_amt && (
                              <span style={{ color:'var(--text-tertiary)' }}> · Est. {p.expected_fund_amt}</span>
                            )}
                          </div>
                        )}

                        {p.orcid_id && (
                          <div style={{ fontSize:12, color:'var(--text-tertiary)', marginBottom:4 }}>
                            🪪 ORCID: {p.orcid_id}
                          </div>
                        )}

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
                          disabled={approving===p.id} style={{ minWidth:110 }}
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

        {/* ── WORKSPACES TAB ─────────────────────────── */}
        {tab==='workspaces' && (
          <div style={S.card}>
            <div style={{ padding:'14px 18px',
                          borderBottom:`1px solid ${theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.07)'}`,
                          display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <input placeholder="Search workspaces, institution…"
                value={search} onChange={e=>setSearch(e.target.value)}
                style={{ ...S.input, flex:1, minWidth:160, marginBottom:0, width:'auto' }} />
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{
                ...S.input, marginBottom:0, width:'auto', cursor:'pointer',
              }}>
                <option value="last_active">Last active</option>
                <option value="newest">Newest first</option>
                <option value="name">Name A–Z</option>
                <option value="users">Most users</option>
                <option value="projects">Most projects</option>
              </select>
              <span style={{ fontSize:12, color:'var(--text-tertiary)', whiteSpace:'nowrap' }}>
                {filtered.length} workspace{filtered.length!==1?'s':''}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding:48, textAlign:'center', color:'var(--text-tertiary)', fontSize:14 }}>
                {search ? 'No workspaces match' : 'No workspaces yet'}
              </div>
            ) : filtered.map((w, i) => {
              const status  = activityStatus(w.last_active);
              const isOpen  = expanded === w.id;
              const total   = parseInt(w.admin_count||0) + parseInt(w.member_count||0);
              const wsMembers = members[w.id];
              const loadingM  = membersLoading[w.id];

              return (
                <div key={w.id} style={{
                  borderBottom: i < filtered.length-1
                    ? `1px solid ${theme==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.05)'}` : 'none'
                }}>
                  {/* Main row */}
                  <div
                    onClick={() => handleExpand(w.id)}
                    style={{
                      padding:'14px 18px', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
                      background: isOpen
                        ? (theme==='dark'?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.02)')
                        : 'transparent',
                      transition:'background 0.12s',
                    }}
                    onMouseEnter={e => !isOpen && (e.currentTarget.style.background = theme==='dark'?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.015)')}
                    onMouseLeave={e => !isOpen && (e.currentTarget.style.background = 'transparent')}
                  >
                    <div title={status.label} style={{
                      width:9, height:9, borderRadius:'50%',
                      background:status.color, flexShrink:0,
                      boxShadow: status.color==='#16a34a' ? `0 0 8px ${status.color}88` : 'none',
                    }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:'var(--text-primary)',
                                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {w.name}
                      </div>
                      {(w.institution || w.pi_position) && (
                        <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:1 }}>
                          {[w.pi_position, w.institution].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize:10, padding:'3px 8px', borderRadius:20, flexShrink:0,
                      background:status.bg, color:status.color,
                      border:`1px solid ${status.color}33`, fontWeight:600,
                    }}>{status.label}</div>
                    <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                      {[
                        { icon:'👥', val:`${total} user${total!==1?'s':''}` },
                        { icon:'📁', val:`${w.project_count} proj${w.project_count!==1?'s':''}` },
                      ].map(({icon,val}) => (
                        <span key={val} style={{
                          fontSize:11, padding:'3px 8px', borderRadius:20,
                          background: theme==='dark'?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)',
                          color:'var(--text-secondary)',
                          border:`1px solid ${theme==='dark'?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.08)'}`,
                        }}>{icon} {val}</span>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-tertiary)', minWidth:60, textAlign:'right', flexShrink:0 }}>
                      {timeAgo(w.last_active)}
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-tertiary)', flexShrink:0,
                                  transition:'transform 0.2s',
                                  transform: isOpen?'rotate(180deg)':'rotate(0)' }}>▼</div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{
                      padding:'16px 20px 20px 40px',
                      background: theme==='dark'?'rgba(0,0,0,0.25)':'rgba(0,0,0,0.015)',
                      borderTop:`1px solid ${theme==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'}`,
                    }}>
                      {/* Metadata row */}
                      <div style={{ display:'flex', gap:24, flexWrap:'wrap', marginBottom:14 }}>
                        {[
                          ['Created',     new Date(w.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})],
                          ['PI Role',     w.pi_position || '—'],
                          ['Degree',      w.academic_degree || '—'],
                          ['Research',    w.research_area ? w.research_area.substring(0,30)+(w.research_area.length>30?'…':'') : '—'],
                          ['Funded by',   w.granting_agency || '—'],
                          ['Admins',      w.admin_count],
                          ['Researchers', w.member_count],
                          ['Projects',    `${w.active_project_count} active / ${w.project_count} total`],
                          ['Last active', timeAgo(w.last_active)],
                        ].map(([k,v]) => (
                          <div key={k}>
                            <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase',
                                          letterSpacing:'0.06em', color:'var(--text-tertiary)', marginBottom:3 }}>{k}</div>
                            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Members list */}
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
                                      letterSpacing:'0.06em', color:'var(--text-tertiary)', marginBottom:8 }}>
                          Team Members ({total})
                        </div>
                        {loadingM ? (
                          <div style={{ fontSize:12, color:'var(--text-tertiary)' }}>Loading…</div>
                        ) : wsMembers && wsMembers.length > 0 ? (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                            {wsMembers.map(m => (
                              <div key={m.id} style={{
                                display:'flex', alignItems:'center', gap:6, padding:'5px 10px',
                                borderRadius:20, fontSize:12,
                                background: m.role==='admin'
                                  ? 'rgba(124,58,237,0.10)' : 'rgba(0,0,0,0.05)',
                                border: m.role==='admin'
                                  ? '1px solid rgba(124,58,237,0.20)'
                                  : `1px solid ${theme==='dark'?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.08)'}`,
                                color: m.role==='admin' ? '#7c3aed' : 'var(--text-secondary)',
                              }}>
                                <div style={{
                                  width:18, height:18, borderRadius:'50%',
                                  background: m.role==='admin' ? '#7c3aed' : '#6b7280',
                                  display:'flex', alignItems:'center', justifyContent:'center',
                                  fontSize:8, fontWeight:700, color:'#fff', flexShrink:0,
                                }}>
                                  {m.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                                </div>
                                <span style={{ fontWeight: m.role==='admin'?600:400 }}>{m.name}</span>
                                {m.position && <span style={{ opacity:0.6, fontSize:10 }}>· {m.position}</span>}
                                <span style={{ fontSize:9, opacity:0.5 }}>
                                  {activityStatus(m.last_active).label}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize:12, color:'var(--text-tertiary)' }}>No members yet</div>
                        )}
                      </div>

                      {/* Delete */}
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

        {/* Legend */}
        <div style={{ marginTop:14, display:'flex', gap:18, fontSize:11, color:'var(--text-tertiary)', flexWrap:'wrap' }}>
          {[['#16a34a','Active this week'],['#d97706','Active this month'],['#6b7280','Inactive / never']].map(([c,l]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:c }} />{l}
            </div>
          ))}
        </div>
      </div>

      {/* ── Analytics Panel ─────────────────────────── */}
      {analyticsOpen && (
        <>
          <div onClick={() => setAnalyticsOpen(false)} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.40)',
            zIndex:200, backdropFilter:'blur(4px)',
          }} />
          <div style={{
            position:'fixed', top:0, right:0, bottom:0, width:420,
            background: theme==='dark' ? '#1c1c1e' : '#ffffff',
            zIndex:201, boxShadow:'-8px 0 40px rgba(0,0,0,0.20)',
            display:'flex', flexDirection:'column', overflowY:'auto',
          }}>
            <div style={{
              padding:'16px 20px', position:'sticky', top:0, zIndex:1,
              background: theme==='dark' ? '#1c1c1e' : '#ffffff',
              borderBottom:`1px solid ${theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}`,
              display:'flex', justifyContent:'space-between', alignItems:'center',
            }}>
              <span style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>📊 Platform Analytics</span>
              <button onClick={() => setAnalyticsOpen(false)} style={{
                background:'none', border:'none', cursor:'pointer', fontSize:22,
                color:'var(--text-tertiary)', lineHeight:1,
              }}>×</button>
            </div>

            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:20 }}>

              {/* Platform Summary */}
              <div>
                <div style={S.sectionTitle}>Platform Summary</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {stats && [
                    ['Total Workspaces', stats.total_workspaces, '#7c3aed'],
                    ['Total Admins (PIs)', stats.total_admins, '#2563eb'],
                    ['Total Researchers', stats.total_members, '#059669'],
                    ['Active Projects', stats.active_projects, '#d97706'],
                    ['Completed Projects', stats.completed_projects, '#6b7280'],
                    ['Total Expenses Filed', stats.total_expenses, '#0891b2'],
                    ['Users active (7d)', stats.active_users_7d, '#16a34a'],
                    ['Users active (24h)', stats.active_users_24h, '#16a34a'],
                    ['Avg team size', stats.avg_team_size, '#7c3aed'],
                    ['New workspaces (30d)', stats.new_workspaces_30d, '#7c3aed'],
                  ].map(([k,v,c]) => (
                    <div key={k} style={{
                      padding:'10px 12px', borderRadius:10,
                      background: theme==='dark'?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)',
                      border:`1px solid ${theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.07)'}`,
                    }}>
                      <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
                      <div style={{ fontSize:10, color:'var(--text-tertiary)', marginTop:2 }}>{k}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Growth chart */}
              {stats?.monthly_growth?.length > 0 && (
                <div>
                  <div style={S.sectionTitle}>Workspace Growth (6 months)</div>
                  <MiniBarChart data={stats.monthly_growth} color="#7c3aed" />
                </div>
              )}

              {/* Degree breakdown */}
              {stats?.degree_breakdown?.length > 0 && (
                <div>
                  <div style={S.sectionTitle}>PI Qualifications</div>
                  <HorizBars data={stats.degree_breakdown} />
                </div>
              )}

              {/* Agencies */}
              {stats?.top_agencies?.length > 0 && (
                <div>
                  <div style={S.sectionTitle}>Granting Agencies</div>
                  <HorizBars data={stats.top_agencies} />
                </div>
              )}

              {/* Research areas */}
              {stats?.top_research_areas?.length > 0 && (
                <div>
                  <div style={S.sectionTitle}>Research Domains</div>
                  <HorizBars data={stats.top_research_areas} />
                </div>
              )}

              {/* Institutions */}
              {stats?.top_institutions?.length > 0 && (
                <div>
                  <div style={S.sectionTitle}>Top Institutions</div>
                  <HorizBars data={stats.top_institutions} />
                </div>
              )}

              <div style={{ fontSize:11, color:'var(--text-tertiary)', padding:'12px', borderRadius:8,
                             background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.15)' }}>
                💡 <strong>Monetization insight:</strong> These analytics show your platform's PI demographics,
                funding patterns, and research domains. Use this data to target grant agencies,
                institutional partnerships, and premium feature offerings.
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Profile Panel ─────────────────────────── */}
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
            <div style={{
              padding:'16px 20px', position:'sticky', top:0, zIndex:1,
              background: theme==='dark' ? '#1c1c1e' : '#ffffff',
              borderBottom:`1px solid ${theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}`,
              display:'flex', justifyContent:'space-between', alignItems:'center',
            }}>
              <span style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>My Account</span>
              <button onClick={() => setProfileOpen(false)} style={{
                background:'none', border:'none', cursor:'pointer', fontSize:22,
                color:'var(--text-tertiary)', lineHeight:1,
              }}>×</button>
            </div>

            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:22 }}>
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
                <input type="file" accept="image/*" id="sa-avatar"
                  style={{ display:'none' }} onChange={handleAvatarFile} />
                <label htmlFor="sa-avatar" style={{
                  padding:'6px 14px',
                  border:`1px solid ${theme==='dark'?'rgba(255,255,255,0.16)':'rgba(0,0,0,0.15)'}`,
                  borderRadius:8, cursor:'pointer', fontSize:12, color:'var(--text-secondary)',
                  background: theme==='dark'?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.03)',
                }}>📁 Upload photo</label>
                <div style={{ display:'flex', gap:6, width:'100%' }}>
                  <input placeholder="Or paste image URL…"
                    value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && setAP(urlInput.trim())}
                    style={{ ...S.input, flex:1, marginBottom:0, fontSize:12 }} />
                  <button className="btn btn-outline btn-sm"
                    onClick={() => { setAP(urlInput.trim()); setUrlInput(''); }}>Use</button>
                </div>
                {avatarPreview && (
                  <button className="btn btn-ghost btn-sm"
                    style={{ color:'var(--danger)', fontSize:11 }}
                    onClick={() => setAP('')}>Remove photo</button>
                )}
              </div>

              <div>
                <label style={S.label}>Display Name</label>
                <input value={pName} onChange={e=>setPName(e.target.value)} style={S.input} />
                <button className="btn btn-primary btn-sm" onClick={saveProfile}
                  style={{ width:'100%', justifyContent:'center' }}>
                  Save Name & Photo
                </button>
                <Msg m={pMsg} />
              </div>

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
                  style={{ width:'100%', justifyContent:'center' }}>Change Password</button>
                <Msg m={pwMsg} />
              </div>

              <div style={{ borderTop:`1px solid ${theme==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.07)'}`, paddingTop:18 }}>
                <label style={S.label}>Change Email</label>
                <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:8 }}>
                  Current: <strong>{user?.email}</strong><br />You will be signed out after changing.
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
                  style={{ width:'100%', justifyContent:'center' }}>Change Email</button>
                <Msg m={emailMsg} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
