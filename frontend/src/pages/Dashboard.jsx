import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ProjectModal from '../components/ProjectModal';

const fmt = n => '৳' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const [archiving, setArchiving] = useState(null);

  const handleArchive = async (id, name, e) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm(`Archive "${name}"? It will be hidden from the dashboard but not deleted.`)) return;
    setArchiving(id);
    try {
      await api.patch(`/projects/${id}/archive`, { archived: true });
      load();
    } catch(err) { alert('Failed to archive'); }
    finally { setArchiving(null); }
  };
  const [projects, setProjects]   = useState([]);
  const [summary, setSummary]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [now, setNow]             = useState(new Date());
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy]       = useState('newest');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const load = async () => {
    try {
      const [pRes, sRes] = await Promise.all([api.get('/projects'), api.get('/expenses/summary')]);
      setProjects(pRes.data); setSummary(sRes.data);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const totals = summary.reduce((a, p) => ({
    budget:     a.budget     + Number(p.total_budget),
    spent:      a.spent      + Number(p.total_spent),
    reimbursed: a.reimbursed + Number(p.reimbursed),
    pending:    a.pending    + Number(p.pending),
  }), { budget:0, spent:0, reimbursed:0, pending:0 });

  const pct = totals.budget > 0 ? Math.min(100, (totals.spent / totals.budget) * 100) : 0;

  // Filter + sort
  let filtered = projects.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    const matchS = !statusFilter || p.status === statusFilter;
    return matchQ && matchS;
  });
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'newest')  return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'oldest')  return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'name')    return a.name.localeCompare(b.name);
    if (sortBy === 'code')    return a.code.localeCompare(b.code);
    if (sortBy === 'budget')  return Number(b.total_budget) - Number(a.total_budget);
    if (sortBy === 'spent') {
      const sa = summary.find(s => s.project_id === a.id);
      const sb = summary.find(s => s.project_id === b.id);
      return Number(sb?.total_spent||0) - Number(sa?.total_spent||0);
    }
    return 0;
  });

  // Archive rule: show active + on_hold always, last 5 completed only
  // Admin can manually archive any project
  const completed = filtered.filter(p => p.status === 'completed');
  const others    = filtered.filter(p => p.status !== 'completed');
  // Show last 5 completed by date
  const recentCompleted = completed
    .sort((a,b) => new Date(b.created_at)-new Date(a.created_at))
    .slice(0,5);
  filtered = [...others, ...recentCompleted]
    .sort((a,b) => new Date(b.created_at)-new Date(a.created_at));
  const hiddenCount = completed.length - recentCompleted.length;

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div className="loading-label">Loading your dashboard…</div>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-eyebrow">Research Finance</div>
          <h1 className="page-title">{getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">{dateStr} · <span style={{ fontVariantNumeric: 'tabular-nums' }}>🕐 {timeStr}</span> · {projects.length} project{projects.length !== 1 ? 's' : ''} in your portfolio</p>
        </div>
        {isAdmin && (
          <div className="no-print">
            <button className="btn btn-primary" onClick={() => { setEditProject(null); setShowModal(true); }}>
              + New Project
            </button>
          </div>
        )}
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <div>
                <div className="stat-label">Total Budget</div>
                <div className="stat-value indigo">{fmt(totals.budget)}</div>
              </div>
              <div className="stat-icon si-indigo">💰</div>
            </div>
            <div className="stat-note">{projects.length} Project{projects.length !== 1 ? 's' : ''} Total</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div>
                <div className="stat-label">Total Spent</div>
                <div className="stat-value">{fmt(totals.spent)}</div>
              </div>
              <div className="stat-icon si-blue">📈</div>
            </div>
            <div className="progress">
              <div className={`progress-fill${pct > 90 ? ' danger' : pct > 70 ? ' warn' : ''}`} style={{ width: pct + '%' }} />
            </div>
            <div className="stat-note">{pct.toFixed(1)}% Of Total Budget Utilised</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div>
                <div className="stat-label">Reimbursed</div>
                <div className="stat-value green">{fmt(totals.reimbursed)}</div>
              </div>
              <div className="stat-icon si-green">✅</div>
            </div>
            <div className="stat-note">Returned To Researchers</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div>
                <div className="stat-label">Pending</div>
                <div className="stat-value amber">{fmt(totals.pending)}</div>
              </div>
              <div className="stat-icon si-amber">⏳</div>
            </div>
            <div className="stat-note">Awaiting Reimbursement</div>
          </div>
        </div>

        {/* Projects section */}
        <div className="section-header">
          <div>
            <div className="section-title">Research Projects</div>
            <div className="section-subtitle">{filtered.length} Of {projects.length} Project{projects.length !== 1 ? 's' : ''} · Click Any To View Details</div>
          </div>
          {isAdmin && (
            <button className="btn btn-outline btn-sm no-print" onClick={() => { setEditProject(null); setShowModal(true); }}>
              + New Project
            </button>
          )}
        </div>

        {/* Search + Filter bar */}
        {projects.length > 0 && (
          <div className="card no-print" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Filter & Search</span>
              {(search || statusFilter) && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>✕ Clear</button>
              )}
            </div>
            <div className="filter-bar" style={{ padding: '14px 18px' }}>
              <div className="filter-field" style={{ flex: 2 }}>
                <label className="form-label">Search</label>
                <input className="form-input" placeholder="Search by name, code, or description…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="filter-field">
                <label className="form-label">Status</label>
                <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed / Ended</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
              <div className="filter-field">
                <label className="form-label">Sort By</label>
                <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name A–Z</option>
                  <option value="code">Code A–Z</option>
                  <option value="budget">Highest budget</option>
                  <option value="spent">Most spent</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 && projects.length > 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h4>No projects match</h4>
            <p>Try adjusting your search or filter.</p>
            <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>Clear filters</button>
          </div>
        ) : hiddenCount > 0 ? (
          <div className="notice" style={{
            background:'var(--bg-subtle)', border:'1px solid var(--border)',
            borderRadius:8, padding:'10px 16px', fontSize:13,
            color:'var(--text-secondary)', marginBottom:16,
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <span>📦 {hiddenCount} older completed project{hiddenCount>1?'s':''} are in the archive</span>
            <a href="/archive" style={{ color:'var(--accent)', fontSize:12, fontWeight:600, textDecoration:'none' }}>
              View Archive →
            </a>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗂️</div>
            <h4>No projects yet</h4>
            <p>Create your first research project to start tracking expenses and managing your budget.</p>
            {isAdmin && <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create First Project</button>}
          </div>
        ) : (
          <div className="projects-grid">
            {filtered.map((p, i) => {
              const s = summary.find(s => s.project_id === p.id) || {};
              const spent = Number(s.total_spent || 0);
              const budget = Number(p.total_budget || 0);
              const spentPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="project-card" style={{ animationDelay: (i * 0.06) + 's', display: 'block' }}>
                    <div className="project-card-top">
                      <span className="project-code">{p.code}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`badge ${p.status === 'active' ? 'badge-green' : p.status === 'completed' ? 'badge-teal' : 'badge-gray'}`}>
                          {p.status === 'completed' ? 'Ended' : p.status}
                        </span>
                        {isAdmin && (
                          <button
                            className="btn btn-ghost btn-xs no-print"
                            style={{ color: 'var(--danger)', fontSize: 11, padding: '2px 7px', lineHeight: 1.4, borderColor: 'var(--danger)' }}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); setEditProject(p); setShowModal(true); }}
                          >✏</button>
                          <button
                            className="btn btn-ghost btn-xs no-print"
                            style={{ fontSize: 11, padding: '2px 7px', lineHeight: 1.4 }}
                            disabled={archiving===p.id}
                            onClick={e => handleArchive(p.id, p.name, e)}
                          >{archiving===p.id?'…':'📦'}</button>
                        )}
                      </div>
                    </div>
                    <div className="project-title">{p.name}</div>
                    <div className="project-tags">
                      <span className="badge badge-indigo">{{ upfront: 'Upfront', end: 'End Payment', installment: 'Installment' }[p.payment_type] || p.payment_type}</span>
                    </div>
                    <div className="progress" style={{ margin: '4px 0 6px' }}>
                      <div className={`progress-fill${spentPct > 90 ? ' danger' : spentPct > 70 ? ' warn' : ''}`} style={{ width: spentPct + '%' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 14 }}>{spentPct.toFixed(1)}% Of Budget Used</div>
                    <div className="project-stats">
                      <div><div className="ps-label">Budget</div><div className="ps-value">{fmt(budget)}</div></div>
                      <div><div className="ps-label">Spent</div><div className="ps-value">{fmt(spent)}</div></div>
                      <div><div className="ps-label">Reimbursed</div><div className="ps-value green">{fmt(s.reimbursed || 0)}</div></div>
                      <div><div className="ps-label">Pending</div><div className="ps-value amber">{fmt(s.pending || 0)}</div></div>
                    </div>
                  </Link>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <ProjectModal
          project={editProject}
          onClose={() => { setShowModal(false); setEditProject(null); }}
          onSaved={() => { setShowModal(false); setEditProject(null); load(); }}
        />
      )}
    </>
  );
}
