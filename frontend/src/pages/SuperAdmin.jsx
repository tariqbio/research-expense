import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',
  { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleString('en-GB',
  { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : 'Never';

export default function SuperAdmin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]         = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [deleting, setDeleting]   = useState(null);
  const [pending, setPending]   = useState([]);
  const [pendingTab, setPendingTab] = useState(false);
  const [approving, setApproving] = useState(null);

  const load = () => {
    Promise.all([
      api.get('/super/stats'),
      api.get('/super/workspaces'),
      api.get('/auth/pending-signups'),
    ])
      .then(([s, w, p]) => { setStats(s.data); setWorkspaces(w.data); setPending(p.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleApprove = async (id, name) => {
    setApproving(id);
    try { await api.post(`/auth/pending-signups/${id}/approve`); load(); }
    catch(e) { alert(e.response?.data?.error || 'Failed'); }
    finally { setApproving(null); }
  };

  const handleReject = async (id, name) => {
    if (!confirm(`Reject and remove access request from ${name}?`)) return;
    try { await api.delete(`/auth/pending-signups/${id}`); load(); }
    catch(e) { alert('Failed'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Permanently delete workspace "${name}" and ALL its data?\n\nThis cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/super/workspaces/${id}`);
      setWorkspaces(ws => ws.filter(w => w.id !== id));
    } catch(e) { alert(e.response?.data?.error || 'Failed to delete'); }
    finally { setDeleting(null); }
  };

  const filtered = workspaces.filter(w =>
    !search ||
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.report_header||'').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div className="loading-label">Loading platform data…</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)' }}>
      {/* Top bar */}
      <div style={{
        background:'var(--bg-surface)', borderBottom:'1px solid var(--border)',
        padding:'0 28px', display:'flex', alignItems:'center',
        justifyContent:'space-between', height:60,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{
            width:36, height:36, borderRadius:8, background:'#7c3aed',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18, fontWeight:800, color:'#fff',
          }}>R</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>ResearchTrack</div>
            <div style={{ fontSize:11, color:'var(--text-tertiary)' }}>Super Admin Panel</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, color:'var(--text-secondary)' }}>
            Signed in as <strong>{user?.name}</strong>
          </span>
          <button className="btn btn-outline btn-sm"
            onClick={() => { logout(); navigate('/login'); }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding:'28px', maxWidth:1000, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:11, color:'var(--text-tertiary)', textTransform:'uppercase',
                        letterSpacing:'0.1em', marginBottom:6 }}>Platform Overview</div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>All Workspaces</h1>
          <p style={{ margin:'6px 0 0', color:'var(--text-secondary)', fontSize:13 }}>
            You can see workspace names and activity counts only.
            Project contents, expense data, and member details are private to each workspace.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="stats-grid" style={{ marginBottom:28 }}>
            {[
              { label:'Workspaces',       value:stats.total_workspaces,   icon:'🏠', color:'indigo' },
              { label:'Total Users',      value:stats.total_users,        icon:'👥', color:'blue'   },
              { label:'Total Projects',   value:stats.total_projects,     icon:'📁', color:'green'  },
              { label:'Active (7 days)',  value:stats.active_users_7d,    icon:'⚡', color:'amber'  },
              { label:'New (30 days)',    value:stats.new_workspaces_30d, icon:'🆕', color:'teal'   },
              { label:'Total Expenses',  value:stats.total_expenses,     icon:'🧾', color:'gray'   },
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

        {/* Pending signups tab toggle */}
        {pending.length > 0 && (
          <div className="card" style={{ marginBottom:20, border:'2px solid var(--warning)' }}>
            <div className="card-header" style={{ cursor:'pointer' }}
              onClick={() => setPendingTab(t=>!t)}>
              <span className="card-title">
                ⏳ Pending Access Requests ({pending.length})
              </span>
              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>
                {pendingTab ? '▲ Hide' : '▼ Review'}
              </span>
            </div>
            {pendingTab && (
              <div>
                {pending.map(p => (
                  <div key={p.id} style={{
                    padding:'16px', borderBottom:'1px solid var(--border)',
                    display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap',
                  }}>
                    <div style={{ flex:1, minWidth:200 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{p.name}</div>
                      <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{p.email}</div>
                      {p.position && <div style={{ fontSize:12, color:'var(--text-tertiary)' }}>{p.position}</div>}
                      <div style={{ fontSize:12, color:'var(--text-tertiary)', marginTop:4 }}>
                        Wants workspace: <strong>{p.workspace_name}</strong>
                        {p.report_header && p.report_header !== p.workspace_name &&
                          <span> · {p.report_header}</span>}
                      </div>
                      {p.message && (
                        <div style={{
                          marginTop:8, padding:'8px 10px', background:'var(--bg-secondary)',
                          borderRadius:6, fontSize:12, color:'var(--text-secondary)',
                          borderLeft:'3px solid var(--accent)',
                        }}>
                          "{p.message}"
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                      <button className="btn btn-primary btn-sm"
                        disabled={approving===p.id}
                        onClick={() => handleApprove(p.id, p.name)}>
                        {approving===p.id ? '…' : '✓ Approve'}
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        style={{ color:'var(--danger)' }}
                        onClick={() => handleReject(p.id, p.name)}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Workspace list */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Workspaces ({filtered.length})</span>
          </div>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
            <input className="form-input" placeholder="Search by name…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--text-tertiary)' }}>
              No workspaces found
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--bg-secondary)' }}>
                  {['Workspace','Report Header','Admins','Members','Projects','Last Active',''].map((h,i) => (
                    <th key={i} style={{
                      padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600,
                      color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em',
                      borderBottom:'1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((w, i) => (
                  <tr key={w.id} style={{
                    borderBottom:'1px solid var(--border-tertiary)',
                    background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                  }}>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ fontWeight:600, fontSize:14, color:'var(--text-primary)' }}>{w.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-tertiary)' }}>{fmtDate(w.created_at)}</div>
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:'var(--text-secondary)' }}>
                      {w.report_header || '—'}
                    </td>
                    <td style={{ padding:'12px 14px', textAlign:'center' }}>
                      <span className="badge badge-indigo">{w.admin_count}</span>
                    </td>
                    <td style={{ padding:'12px 14px', textAlign:'center' }}>
                      <span className="badge badge-gray">{w.member_count}</span>
                    </td>
                    <td style={{ padding:'12px 14px', textAlign:'center' }}>
                      <span className="badge badge-green">{w.project_count}</span>
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:12, color:'var(--text-tertiary)' }}>
                      {fmtTime(w.last_active)}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <button
                        className="btn btn-ghost btn-xs"
                        style={{ color:'var(--danger)' }}
                        disabled={deleting === w.id}
                        onClick={() => handleDelete(w.id, w.name)}>
                        {deleting === w.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Super profile */}
        <div className="card" style={{ marginTop:24 }}>
          <div className="card-header"><span className="card-title">Your Account</span></div>
          <div className="card-body">
            <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16 }}>
              <div style={{
                width:48, height:48, borderRadius:'50%', background:'#7c3aed',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:18, fontWeight:700, color:'#fff',
              }}>
                {user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:15 }}>{user?.name}</div>
                <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{user?.email}</div>
                <span className="badge badge-indigo" style={{ marginTop:4 }}>🌐 Super Admin</span>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/super/profile')}>
                Edit Profile & Change Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
