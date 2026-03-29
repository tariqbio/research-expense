import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ExpenseModal from '../components/ExpenseModal';
import RowActions from '../components/RowActions';

const fmt = n => '৳' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CAT_LABELS = {
  transportation: 'Transportation', printing_stationery: 'Printing & Stationery',
  field_work: 'Field Work', communication: 'Communication', other: 'Other',
};
const CAT_BADGE = {
  transportation: 'badge-teal', printing_stationery: 'badge-indigo',
  field_work: 'badge-green', communication: 'badge-amber', other: 'badge-gray',
};

export default function Expenses() {
  const { isAdmin, user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [filters, setFilters]   = useState({ project_id: '', user_id: '', reimbursed: '', category: '', from_date: '', to_date: '' });
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('date_desc');

  const load = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    try {
      const [eRes, pRes] = await Promise.all([api.get('/expenses', { params }), api.get('/projects')]);
      setExpenses(eRes.data); setProjects(pRes.data);
      if (isAdmin) { const uRes = await api.get('/auth/users'); setMembers(uRes.data); }
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  const handleDelete = async id => {
    if (!confirm('Delete this expense? This action cannot be undone.')) return;
    try { await api.delete(`/expenses/${id}`); load(); } catch(e) { alert(e.response?.data?.error || 'Could not delete.'); }
  };

  const totals = expenses.reduce((a, e) => ({
    total: a.total + Number(e.amount),
    reimbursed: a.reimbursed + (e.reimbursed ? Number(e.amount) : 0),
    pending: a.pending + (!e.reimbursed ? Number(e.amount) : 0),
  }), { total: 0, reimbursed: 0, pending: 0 });

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const hasF = Object.values(filters).some(v => v !== '') || search;

  let displayed = expenses.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.description.toLowerCase().includes(q) ||
      e.project_code?.toLowerCase().includes(q) ||
      e.project_name?.toLowerCase().includes(q) ||
      e.submitted_by_name?.toLowerCase().includes(q) ||
      (CAT_LABELS[e.category] || '').toLowerCase().includes(q) ||
      (e.other_label || '').toLowerCase().includes(q)
    );
  });
  displayed = [...displayed].sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.expense_date) - new Date(a.expense_date);
    if (sortBy === 'date_asc')  return new Date(a.expense_date) - new Date(b.expense_date);
    if (sortBy === 'amount_desc') return Number(b.amount) - Number(a.amount);
    if (sortBy === 'amount_asc')  return Number(a.amount) - Number(b.amount);
    if (sortBy === 'name')     return a.submitted_by_name?.localeCompare(b.submitted_by_name);
    if (sortBy === 'project')  return a.project_code?.localeCompare(b.project_code);
    return 0;
  });

  const getCatLabel = e => e.category === 'other' ? (e.other_label || 'Other') : (CAT_LABELS[e.category] || e.category);

  // ── Print — same iframe approach as ProjectDetail ────────────────────────
  const handlePrint = () => {
    const BDT = n => '&#2547;' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const totalSpent   = totals.total;
    const totalReimb   = totals.reimbursed;
    const totalPending = totals.pending;

    const expRows = displayed.map((e, i) => `
      <tr class="${i % 2 === 0 ? 'even' : ''}">
        <td>${fmtDate(e.expense_date)}</td>
        <td>
          <span class="proj-code-badge">${e.project_code || ''}</span>
          <div class="sub">${e.project_name || ''}</div>
        </td>
        <td>${e.submitted_by_name || ''}</td>
        <td><span class="cat-badge">${getCatLabel(e)}</span></td>
        <td>${e.description}${e.receipt_note ? `<div class="sub">${e.receipt_note}</div>` : ''}</td>
        <td class="num">${BDT(e.amount)}</td>
        <td class="${e.reimbursed ? 'status-ok' : 'status-pend'}">${e.reimbursed ? '&#10003; Reimbursed' : 'Pending'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0">
<title>Expense Report</title>
<style>
  @page { size: A4 landscape; margin: 14mm 12mm 14mm 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { min-width: 800px; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 9.5pt; color: #1a1a1a; background: #fff; line-height: 1.4; }
  .header { display: flex; align-items: flex-start; justify-content: space-between;
    padding-bottom: 12px; margin-bottom: 16px; border-bottom: 3pt solid #28e98c; }
  .header-left { flex: 1; }
  .inst-name { font-size: 7.5pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: #28a870; margin-bottom: 5px; }
  .report-title { font-size: 16pt; font-weight: 800; color: #0d1f17; letter-spacing: -0.02em; line-height: 1.1; }
  .header-right { text-align: right; padding-left: 20px; }
  .logo-box { width: 40pt; height: 40pt; background: #0d1f17; border-radius: 7pt;
    display: flex; align-items: center; justify-content: center;
    font-size: 20pt; font-weight: 900; color: #28e98c; margin-bottom: 4px; margin-left: auto; }
  .report-date { font-size: 7pt; color: #888; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .sum-card { background: #f8fffe; border: 1pt solid #d1fae5; border-radius: 5pt; padding: 8pt 10pt; text-align: center; }
  .sum-label { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #888; margin-bottom: 3pt; }
  .sum-val { font-size: 11pt; font-weight: 800; color: #0d1f17; line-height: 1; }
  .sum-val.green { color: #16a34a; } .sum-val.amber { color: #d97706; }
  .section-title { font-size: 8.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em;
    color: #0d1f17; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1.5pt solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; font-size: 8pt; }
  thead tr { background: #0d1f17; }
  thead th { padding: 5.5pt 7pt; font-size: 6.5pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.07em; color: #fff; text-align: left; }
  thead th.num { text-align: right; }
  tbody td { padding: 5pt 7pt; border-bottom: 0.5pt solid #f0f0f0; vertical-align: top; }
  tbody tr.even td { background: #fafafa; }
  tfoot td { padding: 5.5pt 7pt; background: #f0fff8; font-weight: 700; border-top: 1.5pt solid #d1fae5; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .sub { font-size: 6.5pt; color: #9ca3af; margin-top: 1pt; }
  .cat-badge { background: #e8fff4; color: #0d7a4e; border: 0.5pt solid #a7f3d0;
    border-radius: 3pt; padding: 1pt 4pt; font-size: 6.5pt; white-space: nowrap; }
  .proj-code-badge { background: #e8fff4; color: #0d7a4e; border: 0.5pt solid #a7f3d0;
    border-radius: 3pt; padding: 1pt 5pt; font-size: 7pt; font-weight: 800; }
  .status-ok   { color: #16a34a; font-weight: 600; white-space: nowrap; }
  .status-pend { color: #d97706; font-weight: 600; white-space: nowrap; }
  .footer { margin-top: 16px; padding-top: 8px; border-top: 0.5pt solid #e5e7eb;
    display: flex; justify-content: space-between; font-size: 6.5pt; color: #aaa; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  @media screen and (max-width: 900px) { html, body { min-width: 800px !important; } }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <div class="inst-name">Daffodil International University &nbsp;·&nbsp; Faculty of Graduate Studies</div>
    <div class="report-title">Expense Report</div>
    <div style="font-size:7.5pt;color:#555;margin-top:4px">${displayed.length} record${displayed.length !== 1 ? 's' : ''}${hasF ? ' · filtered view' : ''}</div>
  </div>
  <div class="header-right">
    <div class="logo-box">R</div>
    <div class="report-date">Generated<br>${today}</div>
  </div>
</div>
<div class="summary-grid">
  <div class="sum-card"><div class="sum-label">Total Expenses</div><div class="sum-val">${BDT(totalSpent)}</div></div>
  <div class="sum-card"><div class="sum-label">Reimbursed</div><div class="sum-val green">${BDT(totalReimb)}</div></div>
  <div class="sum-card"><div class="sum-label">Pending</div><div class="sum-val amber">${BDT(totalPending)}</div></div>
</div>
<div class="section-title">Expense Records &nbsp;<span style="font-size:7pt;background:#f3f4f6;color:#6b7280;padding:1pt 6pt;border-radius:20pt;font-weight:600">${displayed.length} entries</span></div>
<table>
  <thead><tr>
    <th>Date</th><th>Project</th><th>Submitted By</th><th>Category</th>
    <th>Description</th><th class="num">Amount</th><th>Status</th>
  </tr></thead>
  <tbody>${expRows || '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:14pt">No expense records</td></tr>'}</tbody>
  <tfoot><tr>
    <td colspan="5">Total &mdash; ${displayed.length} record${displayed.length !== 1 ? 's' : ''}</td>
    <td class="num">${BDT(totalSpent)}</td>
    <td><span class="status-ok">${BDT(totalReimb)} paid</span> &nbsp;·&nbsp; <span class="status-pend">${BDT(totalPending)} pending</span></td>
  </tr></tfoot>
</table>
<div class="footer">
  <span>ResearchTrack v2.0 &nbsp;·&nbsp; Faculty of Graduate Studies, Daffodil International University</span>
  <span>Developed by Tariqul Islam &nbsp;·&nbsp; &copy; 2025 FGS, DIU</span>
</div>
</body></html>`;

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const win  = window.open(url, '_blank');
      if (!win) alert('Please allow pop-ups for this site to open the print report.');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return;
    }
    const iframeId = '__rt_print_frame__';
    let iframe = document.getElementById(iframeId);
    if (iframe) iframe.remove();
    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:99999;border:none;background:white;overflow:auto;opacity:1';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch(e) {}
      setTimeout(() => { if (iframe) iframe.remove(); }, 1500);
    }, 600);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-eyebrow">Financial Records</div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">
            {displayed.length} record{displayed.length !== 1 ? 's' : ''}
            {hasF ? ' · filtered' : ' · all records'}
          </p>
        </div>
        <div className="page-actions no-print">
          <button className="btn btn-outline btn-sm" onClick={handlePrint}>🖨 Print Report</button>
          <button className="btn btn-primary" onClick={() => { setEditExpense(null); setShowModal(true); }}>+ Submit Expense</button>
        </div>
      </div>

      <div className="page-body">
        {/* Summary */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-top">
              <div><div className="stat-label">Total (filtered)</div><div className="stat-value indigo">{fmt(totals.total)}</div></div>
              <div className="stat-icon si-indigo">💳</div>
            </div>
            <div className="stat-note">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div><div className="stat-label">Reimbursed</div><div className="stat-value green">{fmt(totals.reimbursed)}</div></div>
              <div className="stat-icon si-green">✅</div>
            </div>
            <div className="stat-note">{expenses.filter(e => e.reimbursed).length} paid</div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div><div className="stat-label">Pending</div><div className="stat-value amber">{fmt(totals.pending)}</div></div>
              <div className="stat-icon si-amber">⏳</div>
            </div>
            <div className="stat-note">{expenses.filter(e => !e.reimbursed).length} unpaid</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card no-print" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Filter & Search</span>
            {hasF && <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ project_id: '', user_id: '', reimbursed: '', category: '', from_date: '', to_date: '' }); setSearch(''); }}>✕ Clear all</button>}
          </div>
          <div className="filter-bar">
            <div className="filter-field" style={{ flex: 2 }}>
              <label className="form-label">Search</label>
              <input className="form-input" placeholder="Description, project, member…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="filter-field">
              <label className="form-label">Project</label>
              <select className="form-select" value={filters.project_id} onChange={e => setF('project_id', e.target.value)}>
                <option value="">All projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            {isAdmin && (
              <div className="filter-field">
                <label className="form-label">Member</label>
                <select className="form-select" value={filters.user_id} onChange={e => setF('user_id', e.target.value)}>
                  <option value="">All members</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}
            <div className="filter-field">
              <label className="form-label">Category</label>
              <select className="form-select" value={filters.category} onChange={e => setF('category', e.target.value)}>
                <option value="">All categories</option>
                {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="filter-field">
              <label className="form-label">Status</label>
              <select className="form-select" value={filters.reimbursed} onChange={e => setF('reimbursed', e.target.value)}>
                <option value="">All</option>
                <option value="false">Pending only</option>
                <option value="true">Reimbursed only</option>
              </select>
            </div>
            <div className="filter-field">
              <label className="form-label">From</label>
              <input type="date" className="form-input" value={filters.from_date} onChange={e => setF('from_date', e.target.value)} />
            </div>
            <div className="filter-field">
              <label className="form-label">To</label>
              <input type="date" className="form-input" value={filters.to_date} onChange={e => setF('to_date', e.target.value)} />
            </div>
            <div className="filter-field">
              <label className="form-label">Sort</label>
              <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="amount_desc">Highest amount</option>
                <option value="amount_asc">Lowest amount</option>
                <option value="name">Member A–Z</option>
                <option value="project">Project A–Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Expense Records</span>
            <span className="card-meta">{displayed.length} entries</span>
          </div>
          {loading ? (
            <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div className="spinner" /><div className="loading-label">Loading records…</div>
            </div>
          ) : displayed.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧾</div>
              <h4>No expenses found</h4>
              <p>No expense records match the current filters.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Submitted By</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th>
                    <th className="no-print" style={{ width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(e => (
                    <tr key={e.id}>
                      <td className="td-date">{fmtDate(e.expense_date)}</td>
                      <td>
                        <div style={{ marginBottom: 3 }}><span className="td-code">{e.project_code}</span></div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.project_name}>{e.project_name}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{e.submitted_by_name}</div>
                        {e.reimbursed && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Paid {fmtDate(e.reimbursed_at)}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{e.description}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className={`badge ${CAT_BADGE[e.category] || 'badge-gray'}`} style={{ fontSize: 11, padding: '2px 7px' }}>{getCatLabel(e)}</span>
                          {isAdmin && e.reimbursed && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.reimbursed_from === 'university' ? 'University funds' : 'Project funds'}</span>}
                          {e.receipt_note && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.receipt_note}</span>}
                        </div>
                      </td>
                      <td className="td-amount">{fmt(e.amount)}</td>
                      <td>{e.reimbursed ? <span className="badge badge-green">✓ Reimbursed</span> : <span className="badge badge-amber">Pending</span>}</td>
                      <td className="no-print" style={{ width: 44, paddingLeft: 4, paddingRight: 12 }}>
                        {(isAdmin || (!e.reimbursed && e.submitted_by === user?.id)) && (
                          <RowActions items={[
                            {
                              label: 'Edit', icon: '✏', className: 'accent',
                              onClick: () => { setEditExpense(e); setShowModal(true); }
                            },
                            { divider: true },
                            {
                              label: 'Delete', icon: '🗑', className: 'danger',
                              onClick: () => handleDelete(e.id)
                            },
                          ]} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ color: 'var(--text-secondary)' }}>Total · {displayed.length} records</td>
                    <td className="td-amount">{fmt(totals.total)}</td>
                    <td colSpan={3}>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>{fmt(totals.reimbursed)}</span>
                      <span style={{ color: 'var(--text-tertiary)', margin: '0 8px' }}>·</span>
                      <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{fmt(totals.pending)} pending</span>
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
          expense={editExpense}
          onClose={() => { setShowModal(false); setEditExpense(null); }}
          onSaved={() => { setShowModal(false); setEditExpense(null); load(); }}
        />
      )}
    </>
  );
}
