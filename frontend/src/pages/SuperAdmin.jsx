import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',
  { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleString('en-GB',
  { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'Never';

export default function SuperAdmin() {
  const { user, switchToWorkspace } = useAuth();
  const [stats, setStats]           = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [detail, setDetail]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  const load = async () => {
    try {
      const [sRes, wRes] = await Promise.all([
        api.get('/super/stats'),
        api.get('/super/workspaces'),
      ]);
      setStats(sRes.data);
      setWorkspaces(wRes.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadDetail = async (id) => {
    setSelected(id); setDetail(null);
    try {
      const { data } = await api.get(`/super/workspaces/${id}`);
      setDetail(data);
    } catch(e) { console.error(e); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete workspace "${name}" and ALL its data? This cannot be undone.`)) return;
    try {
      await api.delete(`/super/workspaces/${id}`);
      setSelected(null); setDetail(null); load();
    } catch(e) { alert(e.response?.data?.error || 'Failed to delete'); }
  };

  useEffect(() => { load(); }, []);

  const filtered = workspaces.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.report_header?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="loading-screen"><div className="spinner" />
      <div className="loading-label">Loading platform data…</div></div>
  );

  return (
    <div style={{ padding:'24px', maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:12, color:'var(--text-tertiary)', textTransform:'uppercase',
                      letterSpacing:'0.08em', marginBottom:6 }}>Platform Control</div>
        <h1 style={{ margin:0, fontSize:26, fontWeight:700 }}>Super Admin Panel</h1>
        <p style={{ margin:'4px 0 0', color:'var(--text-secondary)', fontSize:14 }}>
          Signed in as <strong>{user?.name}</strong> · Full platform visibility · No financial data access
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom:28 }}>
          {[
            { label:'Total Workspaces', value:stats.total_workspaces,   icon:'🏠', color:'indigo' },
            { label:'Total Users',      value:stats.total_users,        icon:'👥', color:'blue'   },
            { label:'Total Projects',   value:stats.total_projects,     icon:'📁', color:'green'  },
            { label:'Active (7 days)',  value:stats.active_users_7d,    icon:'⚡', color:'amber'  },
          ].map((s,i) => (
            <div key={i} className="stat-card">
              <div className="stat-top">
                <div>
                  <div className="stat-label">{s.label}</div>
                  <div className={`stat-value ${s.color}`}>{s.value}</div>
                </div>
                <div className={`stat-icon si-${s.color}`}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap:20 }}>
        {/* Workspace list */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">All Workspaces ({filtered.length})</span>
          </div>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
            <input className="form-input" placeholder="Search workspaces…"
              value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <div style={{ maxHeight:500, overflowY:'auto' }}>
            {filtered.map(w => (
              <div key={w.id}
                onClick={() => loadDetail(w.id)}
                style={{
                  padding:'14px 16px', cursor:'pointer', borderBottom:'1px solid var(--border)',
                  background: selected === w.id ? 'var(--bg-secondary)' : 'transparent',
                  transition:'background 0.15s',
                }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:600, color:'var(--text-primary)', fontSize:14 }}>{w.name}</div>
                    {w.report_header && w.report_header !== w.name && (
                      <div style={{ fontSize:12, color:'var(--text-tertiary)' }}>{w.report_header}</div>
                    )}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                    <span className="badge badge-gray">{w.user_count} users</span>
                    <span className="badge badge-gray" style={{ marginLeft:4 }}>{w.project_count} projects</span>
                  </div>
                </div>
                <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:4 }}>
                  Created {fmtDate(w.created_at)} · Last active {fmtTime(w.last_active)}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding:32, textAlign:'center', color:'var(--text-tertiary)' }}>
                No workspaces found
              </div>
            )}
          </div>
        </div>

        {/* Workspace detail */}
        {selected && (
          <div className="card">
            {!detail ? (
              <div style={{ padding:40, textAlign:'center' }}><div className="spinner" /></div>
            ) : (
              <>
                <div className="card-header" style={{ justifyContent:'space-between' }}>
                  <span className="card-title">{detail.workspace.name}</span>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-primary btn-sm"
                      onClick={() => switchToWorkspace(detail.workspace.id)}>
                      👁 View as Admin
                    </button>
                    <button className="btn btn-ghost btn-sm"
                      style={{ color:'var(--danger)' }}
                      onClick={() => handleDelete(detail.workspace.id, detail.workspace.name)}>
                      Delete
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div style={{ fontSize:12, color:'var(--text-tertiary)', marginBottom:16 }}>
                    Report header: <strong>{detail.workspace.report_header || '—'}</strong> ·
                    Created {fmtDate(detail.workspace.created_at)}
                  </div>

                  {/* Users */}
                  <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>
                    Users ({detail.users.length})
                  </div>
                  {detail.users.map(u => (
                    <div key={u.id} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'8px 0',
                      borderBottom:'1px solid var(--border-tertiary)',
                    }}>
                      <div style={{
                        width:32, height:32, borderRadius:'50%', background:'var(--accent)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:12, fontWeight:700, color:'#fff', flexShrink:0,
                      }}>
                        {u.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500 }}>{u.name}</div>
                        <div style={{ fontSize:11, color:'var(--text-tertiary)' }}>{u.email}</div>
                      </div>
                      <div>
                        <span className={`badge ${u.role==='admin' ? 'badge-indigo' : 'badge-gray'}`}
                          style={{ fontSize:10 }}>
                          {u.role}
                        </span>
                        <div style={{ fontSize:10, color:'var(--text-tertiary)', marginTop:2, textAlign:'right' }}>
                          {fmtTime(u.last_active)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Projects */}
                  <div style={{ fontWeight:600, fontSize:13, margin:'16px 0 8px' }}>
                    Projects ({detail.projects.length})
                  </div>
                  {detail.projects.map(p => (
                    <div key={p.id} style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'6px 0', borderBottom:'1px solid var(--border-tertiary)',
                    }}>
                      <div>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--accent)',
                                       marginRight:8 }}>{p.code}</span>
                        <span style={{ fontSize:13 }}>{p.name}</span>
                      </div>
                      <span className={`badge ${p.status==='active' ? 'badge-green' : 'badge-gray'}`}
                        style={{ fontSize:10 }}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                  {detail.projects.length === 0 && (
                    <div style={{ fontSize:13, color:'var(--text-tertiary)' }}>No projects yet</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
