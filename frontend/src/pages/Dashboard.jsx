import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ProjectModal from '../components/ProjectModal';

const fmt = n => '৳' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const [projects, setProjects]   = useState([]);
  const [summary, setSummary]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    try {
      const [pRes, sRes] = await Promise.all([api.get('/projects'), api.get('/expenses/summary')]);
      setProjects(pRes.data); setSummary(sRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const totals = summary.reduce((a, p) => ({
    budget:     a.budget     + Number(p.total_budget),
    spent:      a.spent      + Number(p.total_spent),
    reimbursed: a.reimbursed + Number(p.reimbursed),
    pending:    a.pending    + Number(p.pending),
  }), { budget:0, spent:0, reimbursed:0, pending:0 });

  const pct = totals.budget > 0 ? Math.min(100, (totals.spent / totals.budget) * 100) : 0;
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div className="loading-text">LOADING DASHBOARD...</div>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{greet()}, {user?.name?.split(' ')[0]} 👋</h2>
          <div className="page-sub">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {projects.length} active project{projects.length !== 1 ? 's' : ''}</div>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => setShowModal(true)}>＋ New Project</button>}
      </div>

      <div className="page-body">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap si-blue">💰</div>
            <div className="stat-label">Total Budget</div>
            <div className="stat-value sv-blue">{fmt(totals.budget)}</div>
            <div className="stat-sub">across {projects.length} project{projects.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap si-purple">📈</div>
            <div className="stat-label">Total Spent</div>
            <div className="stat-value">{fmt(totals.spent)}</div>
            <div className="progress-bar"><div className={`progress-fill${pct > 90 ? ' danger' : pct > 70 ? ' warn' : ''}`} style={{ width: pct + '%' }} /></div>
            <div className="stat-sub">{pct.toFixed(1)}% of total budget</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap si-green">✅</div>
            <div className="stat-label">Reimbursed</div>
            <div className="stat-value sv-green">{fmt(totals.reimbursed)}</div>
            <div className="stat-sub">paid back to researchers</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap si-orange">⏳</div>
            <div className="stat-label">Pending</div>
            <div className="stat-value sv-orange">{fmt(totals.pending)}</div>
            <div className="stat-sub">outstanding reimbursements</div>
          </div>
        </div>

        <div className="section-hdr">
          <div className="section-title">📁 Research Projects</div>
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(true)}>＋ New</button>}
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🗂️</span>
            <p>No projects yet. Create your first research project to begin tracking expenses.</p>
            {isAdmin && <button className="btn btn-primary" onClick={() => setShowModal(true)}>＋ Create First Project</button>}
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((p, i) => {
              const s = summary.find(s => s.project_id === p.id) || {};
              const spent = Number(s.total_spent || 0), budget = Number(p.total_budget || 0);
              const spentPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="project-card" style={{ animationDelay: (i * 0.06) + 's' }}>
                  <div className="project-code-tag">🔬 {p.code}</div>
                  <div className="project-name">{p.name}</div>
                  <div className="project-meta">
                    <span className={`badge ${p.status === 'active' ? 'badge-green' : p.status === 'completed' ? 'badge-blue' : 'badge-gray'}`}>{p.status}</span>
                    <span className="badge badge-purple">{p.payment_type}</span>
                  </div>
                  <div className="progress-bar"><div className={`progress-fill${spentPct > 90 ? ' danger' : spentPct > 70 ? ' warn' : ''}`} style={{ width: spentPct + '%' }} /></div>
                  <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 5, fontFamily: 'var(--mono)' }}>{spentPct.toFixed(1)}% of budget used</div>
                  <div className="project-stats">
                    <div><div className="ps-label">Budget</div><div className="ps-val">{fmt(budget)}</div></div>
                    <div><div className="ps-label">Spent</div><div className="ps-val">{fmt(spent)}</div></div>
                    <div><div className="ps-label">Reimbursed</div><div className="ps-val" style={{ color: 'var(--green)' }}>{fmt(s.reimbursed || 0)}</div></div>
                    <div><div className="ps-label">Pending</div><div className="ps-val" style={{ color: 'var(--orange)' }}>{fmt(s.pending || 0)}</div></div>
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
