import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ProjectModal from '../components/ProjectModal';

const fmt = n => '৳' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const [projects, setProjects]   = useState([]);
  const [summary, setSummary]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [now, setNow]             = useState(new Date());

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
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
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
            <div className="stat-note">{projects.length} project{projects.length !== 1 ? 's' : ''} total</div>
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
            <div className="stat-note">{pct.toFixed(1)}% of total budget utilised</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div>
                <div className="stat-label">Reimbursed</div>
                <div className="stat-value green">{fmt(totals.reimbursed)}</div>
              </div>
              <div className="stat-icon si-green">✅</div>
            </div>
            <div className="stat-note">Returned to researchers</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div>
                <div className="stat-label">Pending</div>
                <div className="stat-value amber">{fmt(totals.pending)}</div>
              </div>
              <div className="stat-icon si-amber">⏳</div>
            </div>
            <div className="stat-note">Awaiting reimbursement</div>
          </div>
        </div>

        {/* Projects section */}
        <div className="section-header">
          <div>
            <div className="section-title">Research Projects</div>
            <div className="section-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} · click any to view details</div>
          </div>
          {isAdmin && (
            <button className="btn btn-outline btn-sm no-print" onClick={() => setShowModal(true)}>
              + New Project
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗂️</div>
            <h4>No projects yet</h4>
            <p>Create your first research project to start tracking expenses and managing your budget.</p>
            {isAdmin && <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create First Project</button>}
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((p, i) => {
              const s = summary.find(s => s.project_id === p.id) || {};
              const spent = Number(s.total_spent || 0);
              const budget = Number(p.total_budget || 0);
              const spentPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="project-card" style={{ animationDelay: (i * 0.06) + 's' }}>
                  <div className="project-card-top">
                    <span className="project-code">{p.code}</span>
                    <span className={`badge ${p.status === 'active' ? 'badge-green' : p.status === 'completed' ? 'badge-teal' : 'badge-gray'}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="project-title">{p.name}</div>
                  <div className="project-tags">
                    <span className="badge badge-indigo">{p.payment_type}</span>
                  </div>
                  <div className="progress" style={{ margin: '4px 0 6px' }}>
                    <div className={`progress-fill${spentPct > 90 ? ' danger' : spentPct > 70 ? ' warn' : ''}`} style={{ width: spentPct + '%' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 14 }}>{spentPct.toFixed(1)}% of budget used</div>
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

      {showModal && <ProjectModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </>
  );
}
