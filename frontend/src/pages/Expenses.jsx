import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ExpenseModal from '../components/ExpenseModal';

const fmt = n => '৳' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CAT = {
  transportation: '🚌 Transportation', printing_stationery: '🖨️ Printing', field_work: '🏕️ Field Work',
  communication: '📡 Communication', miscellaneous: '📦 Misc',
};

const CAT_BADGE = {
  transportation: 'badge-cyan', printing_stationery: 'badge-blue', field_work: 'badge-green',
  communication: 'badge-purple', miscellaneous: 'badge-gray',
};

export default function Expenses() {
  const { isAdmin, user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters]   = useState({ project_id:'', user_id:'', reimbursed:'', category:'', from_date:'', to_date:'' });

  const load = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== ''));
    try {
      const [eRes, pRes] = await Promise.all([api.get('/expenses', { params }), api.get('/projects')]);
      setExpenses(eRes.data); setProjects(pRes.data);
      if (isAdmin) { const uRes = await api.get('/auth/users'); setMembers(uRes.data); }
    } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  const handleDelete = async id => {
    if (!confirm('Delete this expense?')) return;
    try { await api.delete(`/expenses/${id}`); load(); } catch(err) { alert(err.response?.data?.error || 'Could not delete'); }
  };

  const totals = expenses.reduce((a,e) => ({
    total: a.total + Number(e.amount),
    reimbursed: a.reimbursed + (e.reimbursed ? Number(e.amount) : 0),
    pending: a.pending + (!e.reimbursed ? Number(e.amount) : 0),
  }), { total:0, reimbursed:0, pending:0 });

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const hasF = Object.values(filters).some(v => v !== '');

  return (
    <>
      <div className="page-header">
        <div>
          <h2>🧾 Expenses</h2>
          <div className="page-sub">{expenses.length} record{expenses.length !== 1 ? 's' : ''}{hasF ? ' · filtered' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>＋ Add Expense</button>
      </div>

      <div className="page-body">
        {/* Totals */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-icon-wrap si-blue">💳</div>
            <div className="stat-label">Total (filtered)</div>
            <div className="stat-value sv-blue">{fmt(totals.total)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap si-green">✅</div>
            <div className="stat-label">Reimbursed</div>
            <div className="stat-value sv-green">{fmt(totals.reimbursed)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap si-orange">⏳</div>
            <div className="stat-label">Pending</div>
            <div className="stat-value sv-orange">{fmt(totals.pending)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3>🔍 Filters</h3>
            {hasF && <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ project_id:'', user_id:'', reimbursed:'', category:'', from_date:'', to_date:'' })}>✕ Clear</button>}
          </div>
          <div className="card-body">
            <div className="filter-bar">
              <div><div className="form-label">Project</div>
                <select className="form-select" value={filters.project_id} onChange={e => setF('project_id', e.target.value)}>
                  <option value="">All projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              {isAdmin && <div><div className="form-label">Member</div>
                <select className="form-select" value={filters.user_id} onChange={e => setF('user_id', e.target.value)}>
                  <option value="">All members</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>}
              <div><div className="form-label">Category</div>
                <select className="form-select" value={filters.category} onChange={e => setF('category', e.target.value)}>
                  <option value="">All categories</option>
                  {Object.entries(CAT).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div><div className="form-label">Status</div>
                <select className="form-select" value={filters.reimbursed} onChange={e => setF('reimbursed', e.target.value)}>
                  <option value="">All</option>
                  <option value="false">Pending only</option>
                  <option value="true">Reimbursed only</option>
                </select>
              </div>
              <div><div className="form-label">From</div><input type="date" className="form-input" value={filters.from_date} onChange={e => setF('from_date', e.target.value)} /></div>
              <div><div className="form-label">To</div><input type="date" className="form-input" value={filters.to_date} onChange={e => setF('to_date', e.target.value)} /></div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header"><h3>📋 Expense Records</h3></div>
          {loading ? (
            <div style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div className="spinner" /><div className="loading-text">LOADING...</div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">🧾</span><p>No expenses match the current filters.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Date</th><th>Project</th>
                  {isAdmin && <th>Member</th>}
                  <th>Category</th><th>Description</th>
                  <th style={{ textAlign:'right' }}>Amount</th>
                  <th>Status</th>{isAdmin && <th>Source</th>}<th></th>
                </tr></thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td className="date-cell">{fmtDate(e.expense_date)}</td>
                      <td>
                        <div style={{ fontFamily:'var(--mono)', fontSize:10.5, color:'var(--blue)', marginBottom:2 }}>{e.project_code}</div>
                        <div style={{ fontSize:12, color:'var(--text2)' }}>{e.project_name}</div>
                      </td>
                      {isAdmin && <td>
                        <div style={{ fontWeight:600, fontSize:13 }}>{e.submitted_by_name}</div>
                        {e.reimbursed && <div style={{ fontSize:10.5, color:'var(--text3)', fontFamily:'var(--mono)' }}>Paid {fmtDate(e.reimbursed_at)}</div>}
                      </td>}
                      <td><span className={`badge ${CAT_BADGE[e.category] || 'badge-gray'}`}>{CAT[e.category]}</span></td>
                      <td style={{ maxWidth:200 }}>
                        <div style={{ fontSize:13 }}>{e.description}</div>
                        {e.receipt_note && <div style={{ fontSize:10.5, color:'var(--text3)' }}>{e.receipt_note}</div>}
                      </td>
                      <td className="amount-cell">{fmt(e.amount)}</td>
                      <td>{e.reimbursed ? <span className="badge badge-green">✓ Paid</span> : <span className="badge badge-orange">⏳ Pending</span>}</td>
                      {isAdmin && <td style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--mono)' }}>{e.reimbursed ? (e.reimbursed_from === 'university' ? '🏛 Univ.' : '📁 Proj.') : '—'}</td>}
                      <td>{!e.reimbursed && (isAdmin || e.submitted_by === user?.id) && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(e.id)} style={{ color:'var(--red)', borderColor:'rgba(239,68,68,0.2)' }}>✕</button>
                      )}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr>
                  <td colSpan={isAdmin ? 5 : 4} style={{ fontSize:12, color:'var(--text3)' }}>Total · {expenses.length} records</td>
                  <td className="amount-cell">{fmt(totals.total)}</td>
                  <td colSpan={isAdmin ? 3 : 2}>
                    <span style={{ color:'var(--green)', fontSize:11, fontWeight:700 }}>{fmt(totals.reimbursed)} paid</span>
                    <span style={{ color:'var(--text3)', margin:'0 6px' }}>·</span>
                    <span style={{ color:'var(--orange)', fontSize:11, fontWeight:700 }}>{fmt(totals.pending)} pending</span>
                  </td>
                </tr></tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && <ExpenseModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </>
  );
}
