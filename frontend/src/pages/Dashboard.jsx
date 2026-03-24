import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ProjectModal from '../components/ProjectModal';

const fmt = (n) => '৳' + Number(n).toLocaleString('en-BD', { minimumFractionDigits: 2 });

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const [projects, setProjects]   = useState([]);
  const [summary, setSummary]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        api.get('/projects'),
        api.get('/expenses/summary'),
      ]);
      setProjects(pRes.data);
      setSummary(sRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totals = summary.reduce((acc, p) => ({
    budget:     acc.budget     + Number(p.total_budget),
    spent:      acc.spent      + Number(p.total_spent),
    reimbursed: acc.reimbursed + Number(p.reimbursed),
    pending:    acc.pending    + Number(p.pending),
  }), { budget: 0, spent: 0, reimbursed: 0, pending: 0 });

  const pct = totals.budget > 0 ? Math.min(100, (totals.spent / totals.budget) * 100) : 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>{greeting()}, {user?.name?.split(' ')[0]} 👋</h2>
          <div className="page-subtitle">
            {projects.length} project{projects.length !== 1 ? 's' : ''} · Overview of all research expenses
          </div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Project
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon blue">💰</div>
            <div className="stat-label">Total Budget</div>
            <div className="stat-value">{fmt(totals.budget)}</div>
            <div className="stat-sub">across {projects.length} project{projects.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">📈</div>
            <div className="stat-label">Total Spent</div>
            <div className="stat-value">{fmt(totals.spent)}</div>
            <div className="progress-bar">
              <div className={`progress-fill ${pct > 90 ? 'danger' : pct > 70 ? 'warn' : ''}`} style={{ width: pct + '%' }} />
            </div>
            <div className="stat-sub">{pct.toFixed(1)}% of budget used</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div className="stat-label">Reimbursed</div>
            <div className="stat-value green">{fmt(totals.reimbursed)}</div>
            <div className="stat-sub">paid back to researchers</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">⏳</div>
            <div className="stat-label">Pending</div>
            <div className="stat-value orange">{fmt(totals.pending)}</div>
            <div className="stat-sub">outstanding reimbursements</div>
          </div>
        </div>

        {/* Projects */}
        <div className="section-header">
          <span className="section-title">📁 Projects</span>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗂️</div>
            <p>No projects yet. Create your first research project to get started.</p>
            {isAdmin && <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create First Project</button>}
          </div>
        ) : (
          <div className="project-grid">
            {projects.map(p => {
              const s = summary.find(s => s.project_id === p.id) || {};
              const spent  = Number(s.total_spent || 0);
              const budget = Number(p.total_budget || 0);
              const spentPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
                  <span className="project-code">{p.code}</span>
                  <div className="project-name">{p.name}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    <span className={`badge ${p.status === 'active' ? 'badge-green' : p.status === 'completed' ? 'badge-blue' : 'badge-gray'}`}>
                      {p.status}
                    </span>
                    <span className="badge badge-gray">{p.payment_type}</span>
                  </div>
                  <div className="project-stats">
                    <div>
                      <div className="project-stat-label">Budget</div>
                      <div className="project-stat-value">{fmt(budget)}</div>
                    </div>
                    <div>
                      <div className="project-stat-label">Spent</div>
                      <div className="project-stat-value">{fmt(spent)}</div>
                    </div>
                    <div>
                      <div className="project-stat-label">Reimbursed</div>
                      <div className="project-stat-value" style={{ color: 'var(--green)' }}>{fmt(s.reimbursed || 0)}</div>
                    </div>
                    <div>
                      <div className="project-stat-label">Pending</div>
                      <div className="project-stat-value" style={{ color: 'var(--orange)' }}>{fmt(s.pending || 0)}</div>
                    </div>
                  </div>
                  <div className="progress-bar" style={{ marginTop: 14 }}>
                    <div className={`progress-fill ${spentPct > 90 ? 'danger' : spentPct > 70 ? 'warn' : ''}`} style={{ width: spentPct + '%' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>
                    {spentPct.toFixed(1)}% of budget used
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <ProjectModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />
      )}
    </>
  );
}
