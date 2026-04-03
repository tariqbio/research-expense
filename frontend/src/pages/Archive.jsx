import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const fmt = n => '৳' + Number(n||0).toLocaleString('en-BD', { minimumFractionDigits:2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',
  { day:'2-digit', month:'short', year:'numeric' }) : '—';

export default function Archive() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [unarchiving, setUnarchiving] = useState(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/projects/archived');
      setProjects(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleUnarchive = async (id, name) => {
    setUnarchiving(id);
    try {
      await api.patch(`/projects/${id}/archive`, { archived: false });
      setMsg(`"${name}" restored to dashboard.`);
      setTimeout(() => setMsg(''), 3000);
      load();
    } catch(e) { setMsg('Failed to restore.'); }
    finally { setUnarchiving(null); }
  };

  const filtered = projects.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-eyebrow">Projects</div>
          <h1 className="page-title">Archive</h1>
          <p className="page-subtitle">
            {projects.length} archived project{projects.length!==1?'s':''} ·
            Archived projects are not deleted — they're just hidden from the dashboard
          </p>
        </div>
      </div>

      <div className="page-body">
        {msg && <div className="notice notice-success" style={{ marginBottom:16 }}>✓ {msg}</div>}

        {projects.length === 0 && !loading ? (
          <div className="empty-state">
            <div className="empty-icon">🗂️</div>
            <h4>No archived projects</h4>
            <p>Projects you archive from the dashboard will appear here.</p>
            <Link to="/" className="btn btn-outline btn-sm">← Back to Dashboard</Link>
          </div>
        ) : (
          <>
            {projects.length > 0 && (
              <div className="card" style={{ marginBottom:20 }}>
                <div style={{ padding:'12px 16px' }}>
                  <input className="form-input" placeholder="Search archived projects…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ padding:48, display:'flex', justifyContent:'center' }}>
                <div className="spinner" />
              </div>
            ) : (
              <div className="projects-grid">
                {filtered.map((p, i) => {
                  const spent  = Number(p.total_spent||0);
                  const budget = Number(p.total_budget||0);
                  const pct    = budget > 0 ? Math.min(100, (spent/budget)*100) : 0;
                  return (
                    <div key={p.id} className="project-card"
                      style={{ animationDelay:(i*0.04)+'s', opacity:0.75 }}>
                      <div className="project-card-top">
                        <span className="project-code">{p.code}</span>
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <span className={`badge ${p.status==='active'?'badge-green':p.status==='completed'?'badge-teal':'badge-gray'}`}>
                            {p.status}
                          </span>
                          <span className="badge badge-gray" style={{ fontSize:10 }}>
                            🗂 Archived
                          </span>
                        </div>
                      </div>
                      <div className="project-title">{p.name}</div>
                      {p.archived_at && (
                        <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:8 }}>
                          Archived {fmtDate(p.archived_at)}
                        </div>
                      )}
                      <div className="progress" style={{ margin:'4px 0 6px' }}>
                        <div className="progress-fill" style={{ width:pct+'%' }} />
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:12 }}>
                        {pct.toFixed(1)}% of budget used
                      </div>
                      <div className="project-stats">
                        <div><div className="ps-label">Budget</div><div className="ps-value">{fmt(budget)}</div></div>
                        <div><div className="ps-label">Spent</div><div className="ps-value">{fmt(spent)}</div></div>
                        <div><div className="ps-label">Pending</div><div className="ps-value amber">{fmt(p.total_pending||0)}</div></div>
                      </div>
                      <div style={{ marginTop:12, display:'flex', gap:8 }}>
                        <Link to={`/projects/${p.id}`} className="btn btn-outline btn-sm" style={{ flex:1, justifyContent:'center' }}>
                          View
                        </Link>
                        {isAdmin && (
                          <button className="btn btn-ghost btn-sm"
                            style={{ flex:1, justifyContent:'center' }}
                            disabled={unarchiving===p.id}
                            onClick={() => handleUnarchive(p.id, p.name)}>
                            {unarchiving===p.id ? '…' : '↩ Restore'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
