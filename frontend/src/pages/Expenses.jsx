import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ExpenseModal from '../components/ExpenseModal';

const fmt = (n) => '৳' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CAT_LABELS = {
  transportation:      'Transportation',
  printing_stationery: 'Printing & Stationery',
  field_work:          'Field Work',
  communication:       'Communication',
  miscellaneous:       'Miscellaneous',
};

export default function Expenses() {
  const { isAdmin, user } = useAuth();
  const [expenses, setExpenses]   = useState([]);
  const [projects, setProjects]   = useState([]);
  const [members, setMembers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    project_id: '', user_id: '', reimbursed: '', category: '',
    from_date: '', to_date: '',
  });

  const load = async () => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '')
    );
    try {
      const [eRes, pRes] = await Promise.all([
        api.get('/expenses', { params }),
        api.get('/projects'),
      ]);
      setExpenses(eRes.data);
      setProjects(pRes.data);
      if (isAdmin) {
        const uRes = await api.get('/auth/users');
        setMembers(uRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete');
    }
  };

  // Totals of filtered results
  const totals = expenses.reduce((acc, e) => ({
    total:       acc.total + Number(e.amount),
    reimbursed:  acc.reimbursed + (e.reimbursed ? Number(e.amount) : 0),
    pending:     acc.pending + (!e.reimbursed ? Number(e.amount) : 0),
  }), { total: 0, reimbursed: 0, pending: 0 });

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters({ project_id: '', user_id: '', reimbursed: '', category: '', from_date: '', to_date: '' });
  const hasFilters = Object.values(filters).some(v => v !== '');

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Expenses</h2>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {expenses.length} record{expenses.length !== 1 ? 's' : ''}
            {hasFilters && ' (filtered)'}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Expense
        </button>
      </div>

      <div className="page-body">

        {/* Summary row */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Total (filtered)</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{fmt(totals.total)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Reimbursed</div>
            <div className="stat-value green" style={{ fontSize: 18 }}>{fmt(totals.reimbursed)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Payment</div>
            <div className="stat-value orange" style={{ fontSize: 18 }}>{fmt(totals.pending)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>Filters</h3>
            {hasFilters && <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear all</button>}
          </div>
          <div className="card-body" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <div className="form-label">Project</div>
                <select className="form-select" value={filters.project_id} onChange={e => setFilter('project_id', e.target.value)}>
                  <option value="">All projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              {isAdmin && members.length > 0 && (
                <div>
                  <div className="form-label">Member</div>
                  <select className="form-select" value={filters.user_id} onChange={e => setFilter('user_id', e.target.value)}>
                    <option value="">All members</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <div className="form-label">Category</div>
                <select className="form-select" value={filters.category} onChange={e => setFilter('category', e.target.value)}>
                  <option value="">All categories</option>
                  {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <div className="form-label">Status</div>
                <select className="form-select" value={filters.reimbursed} onChange={e => setFilter('reimbursed', e.target.value)}>
                  <option value="">All</option>
                  <option value="false">Pending only</option>
                  <option value="true">Reimbursed only</option>
                </select>
              </div>
              <div>
                <div className="form-label">From Date</div>
                <input type="date" className="form-input" value={filters.from_date} onChange={e => setFilter('from_date', e.target.value)} />
              </div>
              <div>
                <div className="form-label">To Date</div>
                <input type="date" className="form-input" value={filters.to_date} onChange={e => setFilter('to_date', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Expenses table */}
        <div className="card">
          <div className="card-header"><h3>Expense Records</h3></div>
          {loading ? (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : expenses.length === 0 ? (
            <div className="empty-state"><p>No expenses match the current filters.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Project</th>
                    {isAdmin && <th>Member</th>}
                    <th>Category</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th>
                    {isAdmin && <th>Source</th>}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td className="date-cell">{fmtDate(e.expense_date)}</td>
                      <td>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>{e.project_code}</div>
                        <div style={{ fontSize: 12 }}>{e.project_name}</div>
                      </td>
                      {isAdmin && (
                        <td style={{ fontSize: 13 }}>
                          <div style={{ fontWeight: 500 }}>{e.submitted_by_name}</div>
                          {e.reimbursed && (
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                              Paid {fmtDate(e.reimbursed_at)}
                            </div>
                          )}
                        </td>
                      )}
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{CAT_LABELS[e.category]}</span></td>
                      <td style={{ maxWidth: 200 }}>
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
                        {!e.reimbursed && (isAdmin || e.submitted_by === user?.id) && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(e.id)}
                            style={{ color: 'var(--red)' }}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Totals footer */}
                <tfoot>
                  <tr style={{ background: 'var(--bg)' }}>
                    <td colSpan={isAdmin ? 5 : 4} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                      Total ({expenses.length} records)
                    </td>
                    <td className="amount-cell" style={{ fontWeight: 700 }}>{fmt(totals.total)}</td>
                    <td colSpan={isAdmin ? 3 : 2}>
                      <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 12 }}>{fmt(totals.reimbursed)} paid</span>
                      {' · '}
                      <span style={{ color: 'var(--orange)', fontWeight: 600, fontSize: 12 }}>{fmt(totals.pending)} pending</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ExpenseModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </>
  );
}
