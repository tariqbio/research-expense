import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ExpenseModal from '../components/ExpenseModal';
import InstallmentModal from '../components/InstallmentModal';

const fmt = (n) => '৳' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CAT_LABELS = {
  transportation:      'Transportation',
  printing_stationery: 'Printing & Stationery',
  field_work:          'Field Work',
  communication:       'Communication',
  miscellaneous:       'Miscellaneous',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject]           = useState(null);
  const [expenses, setExpenses]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showExpModal, setShowExpModal] = useState(false);
  const [showInstModal, setShowInstModal] = useState(false);
  const [activeTab, setActiveTab]       = useState('expenses');
  const [reimbursing, setReimbursing]   = useState(null); // expense id being processed
  const [reimburseFrom, setReimburseFrom] = useState('university');
  const [error, setError]               = useState('');

  const load = async () => {
    try {
      const [pRes, eRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/expenses?project_id=${id}`),
      ]);
      setProject(pRes.data);
      setExpenses(eRes.data);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleReimburse = async (expId) => {
    setError('');
    try {
      await api.patch(`/expenses/${expId}/reimburse`, { reimbursed_from: reimburseFrom });
      setReimbursing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark as reimbursed');
    }
  };

  const handleDeleteExpense = async (expId) => {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    try {
      await api.delete(`/expenses/${expId}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete expense');
    }
  };

  const handleMarkInstallment = async (iid) => {
    try {
      await api.patch(`/projects/${id}/installments/${iid}`, {
        status: 'received',
        received_date: new Date().toISOString().split('T')[0],
      });
      load();
    } catch (err) {
      alert('Failed to update installment');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!project) return null;

  const stats = project.stats || {};
  const budget = Number(project.total_budget || 0);
  const spent  = Number(stats.total_spent || 0);
  const pct    = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

  const receivedFunds = project.installments
    .filter(i => i.status === 'received')
    .reduce((a, i) => a + Number(i.amount), 0);

  const pendingExpenses  = expenses.filter(e => !e.reimbursed);
  const reimbursedExpenses = expenses.filter(e => e.reimbursed);

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13 }}>
              ← Back
            </button>
            <span style={{ color: 'var(--border-2)' }}>|</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)' }}>{project.code}</span>
            <span className={`badge ${project.status === 'active' ? 'badge-green' : project.status === 'completed' ? 'badge-blue' : 'badge-gray'}`}>
              {project.status}
            </span>
          </div>
          <h2>{project.name}</h2>
          {project.description && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{project.description}</div>}
        </div>
        {(isAdmin || project.members?.some(m => m.id === user?.id)) && (
          <button className="btn btn-primary" onClick={() => setShowExpModal(true)}>
            + Add Expense
          </button>
        )}
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error">{error}</div>}

        {/* Stats row */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total Budget</div>
            <div className="stat-value">{fmt(budget)}</div>
            <div className="stat-sub">{project.payment_type} payment</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Funds Received</div>
            <div className="stat-value green">{fmt(receivedFunds)}</div>
            <div className="stat-sub">
              {fmt(project.installments.reduce((a,i) => a + Number(i.amount), 0))} total scheduled
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Spent</div>
            <div className="stat-value">{fmt(spent)}</div>
            <div className="progress-bar">
              <div className={`progress-fill ${pct > 90 ? 'danger' : pct > 70 ? 'warn' : ''}`} style={{ width: pct + '%' }} />
            </div>
            <div className="stat-sub">{pct.toFixed(1)}% of budget</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Reimbursed</div>
            <div className="stat-value green">{fmt(stats.total_reimbursed)}</div>
            <div className="stat-sub">{reimbursedExpenses.length} expense{reimbursedExpenses.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Reimbursement</div>
            <div className="stat-value orange">{fmt(stats.total_pending)}</div>
            <div className="stat-sub">{pendingExpenses.length} unpaid expense{pendingExpenses.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Remaining Budget</div>
            <div className={`stat-value ${budget - spent < 0 ? 'red' : ''}`}>{fmt(budget - spent)}</div>
            <div className="stat-sub">after all expenses</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
          {['expenses', 'installments', 'members'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 18px', fontSize: 13, fontWeight: 500,
                fontFamily: 'var(--font)',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-3)',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -2, textTransform: 'capitalize',
              }}>
              {tab} {tab === 'expenses' ? `(${expenses.length})` : tab === 'installments' ? `(${project.installments.length})` : `(${project.members.length})`}
            </button>
          ))}
        </div>

        {/* ── Expenses tab ── */}
        {activeTab === 'expenses' && (
          <div className="card">
            <div className="card-header">
              <h3>All Expenses</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-orange">{pendingExpenses.length} pending</span>
                <span className="badge badge-green">{reimbursedExpenses.length} reimbursed</span>
              </div>
            </div>
            {expenses.length === 0 ? (
              <div className="empty-state"><p>No expenses yet. Add the first one.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Member</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Status</th>
                      {isAdmin && <th>Reimbursed From</th>}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td className="date-cell">{fmtDate(e.expense_date)}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{e.submitted_by_name}</div>
                          {e.reimbursed && (
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                              Paid by {e.reimbursed_by_name} on {fmtDate(e.reimbursed_at)}
                            </div>
                          )}
                        </td>
                        <td><span className="badge badge-blue">{CAT_LABELS[e.category]}</span></td>
                        <td style={{ maxWidth: 220 }}>
                          <div style={{ fontSize: 13 }}>{e.description}</div>
                          {e.receipt_note && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{e.receipt_note}</div>}
                        </td>
                        <td className="amount-cell">{fmt(e.amount)}</td>
                        <td>
                          {e.reimbursed
                            ? <span className="badge badge-green">✓ Paid</span>
                            : <span className="badge badge-orange">Pending</span>}
                        </td>
                        {isAdmin && (
                          <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                            {e.reimbursed ? (e.reimbursed_from === 'university' ? 'University' : 'Project') : '—'}
                          </td>
                        )}
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {/* Admin: reimburse button */}
                            {isAdmin && !e.reimbursed && (
                              reimbursing === e.id ? (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <select className="form-select" style={{ padding: '3px 8px', fontSize: 12, width: 'auto' }}
                                    value={reimburseFrom} onChange={ev => setReimburseFrom(ev.target.value)}>
                                    <option value="university">University</option>
                                    <option value="project">Project</option>
                                  </select>
                                  <button className="btn btn-success btn-sm" onClick={() => handleReimburse(e.id)}>Confirm</button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setReimbursing(null)}>✕</button>
                                </div>
                              ) : (
                                <button className="btn btn-success btn-sm" onClick={() => { setReimbursing(e.id); setReimburseFrom('university'); }}>
                                  Mark Paid
                                </button>
                              )
                            )}
                            {/* Delete — submitter (if not reimbursed) or admin */}
                            {!e.reimbursed && (isAdmin || e.submitted_by === user?.id) && (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleDeleteExpense(e.id)}
                                style={{ color: 'var(--red)' }}>✕</button>
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

        {/* ── Installments tab ── */}
        {activeTab === 'installments' && (
          <div className="card">
            <div className="card-header">
              <h3>Fund Installments / Payment Schedule</h3>
              {isAdmin && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowInstModal(true)}>
                  + Add Installment
                </button>
              )}
            </div>
            {project.installments.length === 0 ? (
              <div className="empty-state"><p>No installments added yet.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Expected Date</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Status</th>
                      <th>Received Date</th>
                      <th>Note</th>
                      {isAdmin && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {project.installments.map(inst => (
                      <tr key={inst.id}>
                        <td className="date-cell">{fmtDate(inst.expected_date)}</td>
                        <td className="amount-cell">{fmt(inst.amount)}</td>
                        <td>
                          {inst.status === 'received'
                            ? <span className="badge badge-green">✓ Received</span>
                            : <span className="badge badge-orange">Pending</span>}
                        </td>
                        <td className="date-cell">{fmtDate(inst.received_date)}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{inst.note || '—'}</td>
                        {isAdmin && (
                          <td>
                            {inst.status !== 'received' && (
                              <button className="btn btn-success btn-sm" onClick={() => handleMarkInstallment(inst.id)}>
                                Mark Received
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 12 }}>Total</td>
                      <td className="amount-cell" style={{ fontWeight: 700 }}>
                        {fmt(project.installments.reduce((a, i) => a + Number(i.amount), 0))}
                      </td>
                      <td colSpan={isAdmin ? 4 : 3}>
                        <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                          {fmt(receivedFunds)} received
                        </span>
                        {' · '}
                        <span style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 500 }}>
                          {fmt(project.installments.filter(i => i.status !== 'received').reduce((a,i) => a + Number(i.amount), 0))} pending
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Members tab ── */}
        {activeTab === 'members' && (
          <div className="card">
            <div className="card-header">
              <h3>Project Members</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th style={{ textAlign: 'right' }}>Their Expenses</th>
                    <th style={{ textAlign: 'right' }}>Reimbursed</th>
                    <th style={{ textAlign: 'right' }}>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {project.members.map(m => {
                    const memberExp = expenses.filter(e => e.submitted_by === m.id);
                    const mSpent  = memberExp.reduce((a, e) => a + Number(e.amount), 0);
                    const mPaid   = memberExp.filter(e => e.reimbursed).reduce((a, e) => a + Number(e.amount), 0);
                    const mPending = mSpent - mPaid;
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 500 }}>{m.name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>{m.email}</td>
                        <td><span className="badge badge-gray">{m.role}</span></td>
                        <td className="amount-cell">{fmt(mSpent)}</td>
                        <td className="amount-cell" style={{ color: 'var(--green)' }}>{fmt(mPaid)}</td>
                        <td className="amount-cell" style={{ color: mPending > 0 ? 'var(--orange)' : 'inherit' }}>
                          {fmt(mPending)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showExpModal && (
        <ExpenseModal
          projectId={id}
          onClose={() => setShowExpModal(false)}
          onSaved={() => { setShowExpModal(false); load(); }}
        />
      )}
      {showInstModal && (
        <InstallmentModal
          projectId={id}
          onClose={() => setShowInstModal(false)}
          onSaved={() => { setShowInstModal(false); load(); }}
        />
      )}
    </>
  );
}
