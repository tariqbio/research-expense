import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ExpenseModal from '../components/ExpenseModal';
import InstallmentModal from '../components/InstallmentModal';

const fmt = n => '৳' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const CAT = {
  transportation: '🚌 Transport', printing_stationery: '🖨️ Printing',
  field_work: '🏕️ Field Work', communication: '📡 Comm.', miscellaneous: '📦 Misc',
};
const CAT_BADGE = {
  transportation:'badge-cyan', printing_stationery:'badge-blue', field_work:'badge-green',
  communication:'badge-purple', miscellaneous:'badge-gray',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject]         = useState(null);
  const [expenses, setExpenses]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showExpModal, setShowExpModal]   = useState(false);
  const [showInstModal, setShowInstModal] = useState(false);
  const [activeTab, setActiveTab]     = useState('expenses');
  const [reimbursing, setReimbursing] = useState(null);
  const [reimburseFrom, setReimburseFrom] = useState('university');
  const [error, setError]             = useState('');

  const load = async () => {
    try {
      const [pRes, eRes] = await Promise.all([api.get(`/projects/${id}`), api.get(`/expenses?project_id=${id}`)]);
      setProject(pRes.data); setExpenses(eRes.data);
    } catch(err) { if (err.response?.status === 403 || err.response?.status === 404) navigate('/'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const handleReimburse = async expId => {
    setError('');
    try { await api.patch(`/expenses/${expId}/reimburse`, { reimbursed_from: reimburseFrom }); setReimbursing(null); load(); }
    catch(err) { setError(err.response?.data?.error || 'Failed to reimburse'); }
  };

  const handleDeleteExpense = async expId => {
    if (!confirm('Delete this expense? This cannot be undone.')) return;
    try { await api.delete(`/expenses/${expId}`); load(); }
    catch(err) { alert(err.response?.data?.error || 'Could not delete'); }
  };

  const handleMarkInstallment = async iid => {
    try { await api.patch(`/projects/${id}/installments/${iid}`, { status:'received', received_date: new Date().toISOString().split('T')[0] }); load(); }
    catch(err) { alert('Failed to update installment'); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /><div className="loading-text">LOADING PROJECT...</div></div>;
  if (!project) return null;

  const stats = project.stats || {};
  const budget = Number(project.total_budget || 0);
  const spent  = Number(stats.total_spent || 0);
  const pct    = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const receivedFunds = project.installments.filter(i => i.status === 'received').reduce((a,i) => a + Number(i.amount), 0);
  const pendingExp     = expenses.filter(e => !e.reimbursed);
  const reimbursedExp  = expenses.filter(e => e.reimbursed);
  const totalInstalled = project.installments.reduce((a,i) => a + Number(i.amount), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span className="project-code-tag">🔬 {project.code}</span>
            <span className={`badge ${project.status==='active'?'badge-green':project.status==='completed'?'badge-blue':'badge-gray'}`}>{project.status}</span>
          </div>
          <h2 style={{ marginTop:6 }}>{project.name}</h2>
          {project.description && <div className="page-sub">{project.description}</div>}
        </div>
        <button className="btn btn-primary" onClick={() => setShowExpModal(true)}>＋ Add Expense</button>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap si-blue">💰</div>
            <div className="stat-label">Total Budget</div>
            <div className="stat-value sv-blue">{fmt(budget)}</div>
            <div className="stat-sub">{project.payment_type} payment</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap si-cyan">🏦</div>
            <div className="stat-label">Funds Received</div>
            <div className="stat-value sv-cyan">{fmt(receivedFunds)}</div>
            <div className="stat-sub">{fmt(totalInstalled)} total scheduled</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap si-purple">📈</div>
            <div className="stat-label">Total Spent</div>
            <div className="stat-value">{fmt(spent)}</div>
            <div className="progress-bar"><div className={`progress-fill${pct>90?' danger':pct>70?' warn':''}`} style={{ width:pct+'%' }} /></div>
            <div className="stat-sub">{pct.toFixed(1)}% of budget</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap si-green">✅</div>
            <div className="stat-label">Reimbursed</div>
            <div className="stat-value sv-green">{fmt(stats.total_reimbursed)}</div>
            <div className="stat-sub">{reimbursedExp.length} expense{reimbursedExp.length!==1?'s':''}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap si-orange">⏳</div>
            <div className="stat-label">Pending Reimburse</div>
            <div className="stat-value sv-orange">{fmt(stats.total_pending)}</div>
            <div className="stat-sub">{pendingExp.length} unpaid</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap si-red">📊</div>
            <div className="stat-label">Remaining Budget</div>
            <div className={`stat-value ${budget-spent<0?'sv-red':''}`}>{fmt(budget-spent)}</div>
            <div className="stat-sub">after all expenses</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { key:'expenses',      label:'Expenses',      icon:'🧾', count:expenses.length },
            { key:'installments',  label:'Installments',  icon:'🏦', count:project.installments.length },
            { key:'members',       label:'Members',       icon:'👥', count:project.members.length },
          ].map(t => (
            <button key={t.key} className={`tab-btn${activeTab===t.key?' active':''}`} onClick={() => setActiveTab(t.key)}>
              {t.icon} {t.label} <span className="tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Expenses tab */}
        {activeTab === 'expenses' && (
          <div className="card">
            <div className="card-header">
              <h3>🧾 All Expenses</h3>
              <div style={{ display:'flex', gap:8 }}>
                <span className="badge badge-orange">{pendingExp.length} pending</span>
                <span className="badge badge-green">{reimbursedExp.length} reimbursed</span>
              </div>
            </div>
            {expenses.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">🧾</span><p>No expenses yet. Add the first one.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Date</th><th>Member</th><th>Category</th><th>Description</th>
                    <th style={{ textAlign:'right' }}>Amount</th><th>Status</th>
                    {isAdmin && <th>Source</th>}<th></th>
                  </tr></thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td className="date-cell">{fmtDate(e.expense_date)}</td>
                        <td>
                          <div style={{ fontWeight:600, fontSize:13 }}>{e.submitted_by_name}</div>
                          {e.reimbursed && <div style={{ fontSize:10.5, color:'var(--text3)', fontFamily:'var(--mono)' }}>Paid by {e.reimbursed_by_name}</div>}
                        </td>
                        <td><span className={`badge ${CAT_BADGE[e.category]||'badge-gray'}`}>{CAT[e.category]}</span></td>
                        <td style={{ maxWidth:200 }}>
                          <div style={{ fontSize:13 }}>{e.description}</div>
                          {e.receipt_note && <div style={{ fontSize:10.5, color:'var(--text3)' }}>{e.receipt_note}</div>}
                        </td>
                        <td className="amount-cell">{fmt(e.amount)}</td>
                        <td>{e.reimbursed ? <span className="badge badge-green">✓ Paid</span> : <span className="badge badge-orange">⏳ Pending</span>}</td>
                        {isAdmin && <td style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)' }}>
                          {e.reimbursed ? (e.reimbursed_from==='university'?'🏛 Univ.':'📁 Proj.') : '—'}
                        </td>}
                        <td>
                          <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                            {isAdmin && !e.reimbursed && (
                              reimbursing === e.id ? (
                                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                  <select className="form-select" style={{ padding:'4px 8px', fontSize:11.5, width:'auto' }}
                                    value={reimburseFrom} onChange={ev => setReimburseFrom(ev.target.value)}>
                                    <option value="university">🏛 University</option>
                                    <option value="project">📁 Project</option>
                                  </select>
                                  <button className="btn btn-success btn-sm" onClick={() => handleReimburse(e.id)}>✓ Confirm</button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setReimbursing(null)}>✕</button>
                                </div>
                              ) : (
                                <button className="btn btn-success btn-sm" onClick={() => { setReimbursing(e.id); setReimburseFrom('university'); }}>
                                  ✓ Mark Paid
                                </button>
                              )
                            )}
                            {!e.reimbursed && (isAdmin || e.submitted_by === user?.id) && (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleDeleteExpense(e.id)}
                                style={{ color:'var(--red)', borderColor:'rgba(239,68,68,0.2)' }}>✕</button>
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
              <h3>🏦 Fund Installments</h3>
              {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setShowInstModal(true)}>＋ Add Installment</button>}
            </div>
            {project.installments.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">🏦</span><p>No installments added yet.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Expected Date</th><th style={{ textAlign:'right' }}>Amount</th><th>Status</th><th>Received Date</th><th>Note</th>{isAdmin && <th></th>}
                  </tr></thead>
                  <tbody>
                    {project.installments.map(inst => (
                      <tr key={inst.id}>
                        <td className="date-cell">{fmtDate(inst.expected_date)}</td>
                        <td className="amount-cell">{fmt(inst.amount)}</td>
                        <td>{inst.status === 'received' ? <span className="badge badge-green">✓ Received</span> : <span className="badge badge-orange">⏳ Pending</span>}</td>
                        <td className="date-cell">{fmtDate(inst.received_date)}</td>
                        <td style={{ fontSize:12, color:'var(--text2)' }}>{inst.note || '—'}</td>
                        {isAdmin && <td>{inst.status !== 'received' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleMarkInstallment(inst.id)}>✓ Received</button>
                        )}</td>}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr>
                    <td>Total</td>
                    <td className="amount-cell">{fmt(totalInstalled)}</td>
                    <td colSpan={isAdmin ? 4 : 3}>
                      <span style={{ color:'var(--green)', fontSize:11, fontWeight:700 }}>{fmt(receivedFunds)} received</span>
                      <span style={{ color:'var(--text3)', margin:'0 6px' }}>·</span>
                      <span style={{ color:'var(--orange)', fontSize:11, fontWeight:700 }}>{fmt(totalInstalled - receivedFunds)} pending</span>
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
            <div className="card-header"><h3>👥 Project Members</h3></div>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Name</th><th>Email</th><th>Role</th>
                  <th style={{ textAlign:'right' }}>Expenses</th>
                  <th style={{ textAlign:'right' }}>Reimbursed</th>
                  <th style={{ textAlign:'right' }}>Pending</th>
                </tr></thead>
                <tbody>
                  {project.members.map(m => {
                    const me = expenses.filter(e => e.submitted_by === m.id);
                    const mS = me.reduce((a,e) => a + Number(e.amount), 0);
                    const mP = me.filter(e => e.reimbursed).reduce((a,e) => a + Number(e.amount), 0);
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight:600 }}>{m.name}</td>
                        <td style={{ fontSize:11.5, color:'var(--text3)', fontFamily:'var(--mono)' }}>{m.email}</td>
                        <td><span className="badge badge-gray">{m.role}</span></td>
                        <td className="amount-cell">{fmt(mS)}</td>
                        <td className="amount-cell" style={{ color:'var(--green)' }}>{fmt(mP)}</td>
                        <td className="amount-cell" style={{ color: mS-mP > 0 ? 'var(--orange)' : 'inherit' }}>{fmt(mS-mP)}</td>
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
    </>
  );
}
