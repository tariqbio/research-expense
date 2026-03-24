import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ExpenseModal from '../components/ExpenseModal';
import InstallmentModal from '../components/InstallmentModal';
import ConfirmDialog from '../components/ConfirmDialog';

const fmt = n => '৳' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CAT_LABELS = { transportation:'Transportation', printing_stationery:'Printing & Stationery', field_work:'Field Work', communication:'Communication', miscellaneous:'Miscellaneous' };
const CAT_BADGE  = { transportation:'badge-teal', printing_stationery:'badge-indigo', field_work:'badge-green', communication:'badge-amber', miscellaneous:'badge-gray' };

export default function ProjectDetail() {
  const { id } = useParams();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject]   = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showExpModal, setShowExpModal]   = useState(false);
  const [showInstModal, setShowInstModal] = useState(false);
  const [activeTab, setActiveTab]     = useState('expenses');
  const [reimbursing, setReimbursing] = useState(null);
  const [reimburseFrom, setReimburseFrom] = useState('university');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const [pRes, eRes] = await Promise.all([api.get(`/projects/${id}`), api.get(`/expenses?project_id=${id}`)]);
      setProject(pRes.data); setExpenses(eRes.data);
    } catch(e) { if (e.response?.status === 403 || e.response?.status === 404) navigate('/'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const handleReimburse = async expId => {
    setError('');
    try { await api.patch(`/expenses/${expId}/reimburse`, { reimbursed_from: reimburseFrom }); setReimbursing(null); load(); }
    catch(e) { setError(e.response?.data?.error || 'Failed to reimburse.'); }
  };

  const handleDeleteExpense = async expId => {
    if (!confirm('Delete this expense? This cannot be undone.')) return;
    try { await api.delete(`/expenses/${expId}`); load(); }
    catch(e) { alert(e.response?.data?.error || 'Could not delete.'); }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      await api.delete(`/projects/${id}`);
      navigate('/');
    } catch(e) {
      setError(e.response?.data?.error || 'Failed to delete project.');
      setDeleting(false);
    }
  };

  const handleMarkInst = async iid => {
    try { await api.patch(`/projects/${id}/installments/${iid}`, { status: 'received', received_date: new Date().toISOString().split('T')[0] }); load(); }
    catch(e) { alert('Failed to update installment.'); }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Member', 'Category', 'Description', 'Amount', 'Status'];
    const rows = expenses.map(e => [fmtDate(e.expense_date), e.submitted_by_name, CAT_LABELS[e.category], `"${e.description}"`, Number(e.amount).toFixed(2), e.reimbursed ? 'Reimbursed' : 'Pending']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${project?.code}-expenses.csv`; a.click();
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /><div className="loading-label">Loading project…</div></div>;
  if (!project) return null;

  const stats = project.stats || {};
  const budget = Number(project.total_budget || 0);
  const spent  = Number(stats.total_spent || 0);
  const pct    = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const receivedFunds  = project.installments.filter(i => i.status === 'received').reduce((a, i) => a + Number(i.amount), 0);
  const totalInstalled = project.installments.reduce((a, i) => a + Number(i.amount), 0);
  const pendingExp     = expenses.filter(e => !e.reimbursed);
  const reimbursedExp  = expenses.filter(e => e.reimbursed);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className="project-code">{project.code}</span>
            <span className={`badge ${project.status === 'active' ? 'badge-green' : project.status === 'completed' ? 'badge-teal' : 'badge-gray'}`}>{project.status}</span>
            <span className="badge badge-gray">{project.payment_type}</span>
          </div>
          <h1 className="page-title" style={{ fontSize: 20 }}>{project.name}</h1>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }} className="no-print">
          <button className="btn btn-outline btn-sm" onClick={handleExportCSV}>⬇ Export CSV</button>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨 Print</button>
          <button className="btn btn-primary" onClick={() => setShowExpModal(true)}>+ Add Expense</button>
          {isAdmin && (
            <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(true)}>🗑 Delete Project</button>
          )}
        </div>
      </div>

      <div className="page-body">
        {error && <div className="notice notice-error">⚠ {error}</div>}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Total Budget</div><div className="stat-value indigo">{fmt(budget)}</div></div><div className="stat-icon si-indigo">💰</div></div>
            <div className="stat-note">{project.payment_type} payment</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Funds Received</div><div className="stat-value" style={{ color: 'var(--info)' }}>{fmt(receivedFunds)}</div></div><div className="stat-icon si-teal">🏦</div></div>
            <div className="stat-note">of {fmt(totalInstalled)} scheduled</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Total Spent</div><div className="stat-value">{fmt(spent)}</div></div><div className="stat-icon si-blue">📈</div></div>
            <div className="progress"><div className={`progress-fill${pct > 90 ? ' danger' : pct > 70 ? ' warn' : ''}`} style={{ width: pct + '%' }} /></div>
            <div className="stat-note">{pct.toFixed(1)}% of budget</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Reimbursed</div><div className="stat-value green">{fmt(stats.total_reimbursed)}</div></div><div className="stat-icon si-green">✅</div></div>
            <div className="stat-note">{reimbursedExp.length} expense{reimbursedExp.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Pending</div><div className="stat-value amber">{fmt(stats.total_pending)}</div></div><div className="stat-icon si-amber">⏳</div></div>
            <div className="stat-note">{pendingExp.length} unpaid</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Remaining</div><div className={`stat-value ${budget - spent < 0 ? 'red' : 'green'}`}>{fmt(budget - spent)}</div></div><div className="stat-icon si-green">📊</div></div>
            <div className="stat-note">budget balance</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { key: 'expenses',     label: 'Expenses',     count: expenses.length },
            { key: 'installments', label: 'Installments', count: project.installments.length },
            { key: 'members',      label: 'Members',      count: project.members.length },
          ].map(t => (
            <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label} <span className="tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Expenses tab */}
        {activeTab === 'expenses' && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Expense Records</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-amber">{pendingExp.length} pending</span>
                <span className="badge badge-green">{reimbursedExp.length} reimbursed</span>
              </div>
            </div>
            {expenses.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🧾</div><h4>No expenses yet</h4><p>Add the first expense to this project.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Date</th><th>Researcher</th><th>Category</th><th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th><th>Status</th>
                    {isAdmin && <th>Source</th>}<th className="no-print"></th>
                  </tr></thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td className="td-date">{fmtDate(e.expense_date)}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{e.submitted_by_name}</div>
                          {e.reimbursed && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Paid by {e.reimbursed_by_name}</div>}
                        </td>
                        <td><span className={`badge ${CAT_BADGE[e.category] || 'badge-gray'}`}>{CAT_LABELS[e.category]}</span></td>
                        <td style={{ maxWidth: 220 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{e.description}</div>
                          {e.receipt_note && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{e.receipt_note}</div>}
                        </td>
                        <td className="td-amount">{fmt(e.amount)}</td>
                        <td>{e.reimbursed ? <span className="badge badge-green">✓ Paid</span> : <span className="badge badge-amber">Pending</span>}</td>
                        {isAdmin && <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.reimbursed ? (e.reimbursed_from === 'university' ? 'University' : 'Project') : '—'}</td>}
                        <td className="no-print">
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {isAdmin && !e.reimbursed && (
                              reimbursing === e.id ? (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <select className="form-select" style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                                    value={reimburseFrom} onChange={ev => setReimburseFrom(ev.target.value)}>
                                    <option value="university">University</option>
                                    <option value="project">Project</option>
                                  </select>
                                  <button className="btn btn-success btn-xs" onClick={() => handleReimburse(e.id)}>✓ Confirm</button>
                                  <button className="btn btn-ghost btn-xs" onClick={() => setReimbursing(null)}>Cancel</button>
                                </div>
                              ) : (
                                <button className="btn btn-success btn-xs" onClick={() => { setReimbursing(e.id); setReimburseFrom('university'); }}>Mark Paid</button>
                              )
                            )}
                            {!e.reimbursed && (isAdmin || e.submitted_by === user?.id) && (
                              <button className="btn btn-ghost btn-xs" onClick={() => handleDeleteExpense(e.id)} style={{ color: 'var(--danger)' }}>Remove</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Installments tab */}
        {activeTab === 'installments' && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Fund Installments</span>
              {isAdmin && <button className="btn btn-outline btn-sm" onClick={() => setShowInstModal(true)}>+ Add Installment</button>}
            </div>
            {project.installments.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🏦</div><h4>No installments</h4><p>No fund installments scheduled yet.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Expected Date</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th><th>Received Date</th><th>Note</th>{isAdmin && <th></th>}
                  </tr></thead>
                  <tbody>
                    {project.installments.map(inst => (
                      <tr key={inst.id}>
                        <td className="td-date">{fmtDate(inst.expected_date)}</td>
                        <td className="td-amount">{fmt(inst.amount)}</td>
                        <td>{inst.status === 'received' ? <span className="badge badge-green">✓ Received</span> : <span className="badge badge-amber">Pending</span>}</td>
                        <td className="td-date">{fmtDate(inst.received_date)}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{inst.note || '—'}</td>
                        {isAdmin && <td>{inst.status !== 'received' && <button className="btn btn-success btn-xs" onClick={() => handleMarkInst(inst.id)}>Mark Received</button>}</td>}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr>
                    <td>Total</td>
                    <td className="td-amount">{fmt(totalInstalled)}</td>
                    <td colSpan={isAdmin ? 4 : 3}>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>{fmt(receivedFunds)} received</span>
                      <span style={{ margin: '0 8px', color: 'var(--text-tertiary)' }}>·</span>
                      <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{fmt(totalInstalled - receivedFunds)} pending</span>
                    </td>
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Members tab */}
        {activeTab === 'members' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Project Members</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Name</th><th>Email</th><th>Role</th>
                  <th style={{ textAlign: 'right' }}>Submitted</th>
                  <th style={{ textAlign: 'right' }}>Reimbursed</th>
                  <th style={{ textAlign: 'right' }}>Pending</th>
                </tr></thead>
                <tbody>
                  {project.members.map(m => {
                    const me = expenses.filter(e => e.submitted_by === m.id);
                    const mS = me.reduce((a, e) => a + Number(e.amount), 0);
                    const mP = me.filter(e => e.reimbursed).reduce((a, e) => a + Number(e.amount), 0);
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.email}</td>
                        <td><span className="badge badge-gray">{m.role}</span></td>
                        <td className="td-amount">{fmt(mS)}</td>
                        <td className="td-amount" style={{ color: 'var(--success)' }}>{fmt(mP)}</td>
                        <td className="td-amount" style={{ color: mS - mP > 0 ? 'var(--warning)' : 'inherit' }}>{fmt(mS - mP)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showExpModal && <ExpenseModal projectId={id} onClose={() => setShowExpModal(false)} onSaved={() => { setShowExpModal(false); load(); }} />}
      {showInstModal && <InstallmentModal projectId={id} onClose={() => setShowInstModal(false)} onSaved={() => { setShowInstModal(false); load(); }} />}
      <ConfirmDialog
        isOpen={deleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete project "${project?.code}"? This will also delete all associated expenses and cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        requiresTyping={true}
        typingPrompt={project?.code || '}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteConfirm(false)}
        isLoading={deleting}
      />
    </>
  );
}
