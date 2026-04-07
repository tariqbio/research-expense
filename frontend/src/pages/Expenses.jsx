import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ExpenseModal from '../components/ExpenseModal';
import ActionMenu from '../components/ActionMenu';
import ReportModal from '../components/ReportModal';
import { exportExpensesXlsx } from '../utils/exportXlsx';

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
const getCatLabel = e => e.category === 'other' ? (e.other_label || 'Other') : (CAT_LABELS[e.category] || e.category);

export default function Expenses() {
  const { isAdmin, user, workspaceName, reportHeader } = useAuth();
  const [expenses, setExpenses]   = useState([]);
  const [projects, setProjects]   = useState([]);
  const [members, setMembers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [filters, setFilters] = useState({ project_id: '', user_id: '', reimbursed: '', category: '', from_date: '', to_date: '' });
  const [search, setSearch]   = useState('');
  const [sortBy, setSortBy]   = useState('date_desc');
  const displayedRef = useRef([]);

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
    if (sortBy === 'date_desc')    return new Date(b.expense_date) - new Date(a.expense_date);
    if (sortBy === 'date_asc')     return new Date(a.expense_date) - new Date(b.expense_date);
    if (sortBy === 'amount_desc')  return Number(b.amount) - Number(a.amount);
    if (sortBy === 'amount_asc')   return Number(a.amount) - Number(b.amount);
    if (sortBy === 'name')         return a.submitted_by_name?.localeCompare(b.submitted_by_name);
    if (sortBy === 'project')      return a.project_code?.localeCompare(b.project_code);
    return 0;
  });
  displayedRef.current = displayed;

  // ── XLSX Export ──────────────────────────────────────────────────────────
  const handleExportCSV = (expList) => {
    exportExpensesXlsx({
      displayed: expList || displayedRef.current,
      totals, filters, projects, search, user, getCatLabel, fmtDate, CAT_LABELS, orgName: reportHeader, orgShort: workspaceName,
    });
  };

  // ── PDF / Print ──────────────────────────────────────────────────────────
  const handlePrint = (expList, reportLabel) => {
    const BDT = n => '&#2547;' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const printExp    = expList || displayedRef.current;
    const totalSpent   = printExp.reduce((a, e) => a + Number(e.amount), 0);
    const totalReimb   = printExp.filter(e => e.reimbursed).reduce((a, e) => a + Number(e.amount), 0);
    const totalPending = printExp.filter(e => !e.reimbursed).reduce((a, e) => a + Number(e.amount), 0);
    const dateRange    = reportLabel || 'All Expenses';

    const expRows = printExp.map((e, i) => `
      <tr class="${i % 2 === 0 ? 'even' : ''}">
        <td>${fmtDate(e.expense_date)}</td>
        <td><strong>${e.project_code || '—'}</strong><div class="sub">${e.project_name || ''}</div></td>
        <td>${e.submitted_by_name || '—'}</td>
        <td><span class="cat-badge">${getCatLabel(e)}</span></td>
        <td>${e.description}${e.receipt_note ? `<div class="sub">${e.receipt_note}</div>` : ''}</td>
        <td class="num">${BDT(e.amount)}</td>
        <td class="${e.reimbursed ? 'status-ok' : 'status-pend'}">${e.reimbursed ? '&#10003; Reimbursed' : 'Pending'}</td>
        ${isAdmin ? `<td>${e.reimbursed ? (e.reimbursed_from === 'university' ? 'University' : 'Project') : '—'}</td>` : ''}
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Expense Report</title>
<style>
  @page { size: A4 landscape; margin: 15mm 14mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; font-size:9.5pt; color:#1a1a1a; background:#fff; line-height:1.45; }
  .header { display:flex; align-items:flex-start; justify-content:space-between; padding-bottom:12px; margin-bottom:16px; border-bottom:3pt solid #28e98c; }
  .inst-name { font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#28a870; margin-bottom:5px; }
  .report-title { font-size:16pt; font-weight:800; color:#0d1f17; letter-spacing:-0.02em; line-height:1.1; margin-bottom:3px; }
  .report-sub { font-size:8pt; color:#555; margin-top:2px; }
  .logo-box { width:42pt; height:42pt; background:#0d1f17; border-radius:7pt; display:flex; align-items:center; justify-content:center; font-size:20pt; font-weight:900; color:#28e98c; margin-left:auto; margin-bottom:4px; }
  .report-date { font-size:7pt; color:#888; text-align:right; }
  .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-bottom:16px; }
  .sum-card { background:#f8fffe; border:1pt solid #d1fae5; border-radius:5pt; padding:7pt 8pt; text-align:center; }
  .sum-label { font-size:6pt; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#888; margin-bottom:2pt; }
  .sum-val { font-size:10.5pt; font-weight:800; color:#0d1f17; }
  .sum-val.green { color:#16a34a; } .sum-val.amber { color:#d97706; } .sum-val.blue { color:#0891b2; }
  table { width:100%; border-collapse:collapse; font-size:8pt; }
  thead tr { background:#0d1f17; }
  thead th { padding:5pt 7pt; font-size:6.5pt; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#fff; text-align:left; }
  thead th.num { text-align:right; }
  tbody td { padding:5pt 7pt; border-bottom:0.5pt solid #f0f0f0; vertical-align:middle; }
  tbody tr.even td { background:#fafafa; }
  tfoot td { padding:5pt 7pt; background:#f0fff8; font-weight:700; border-top:1.5pt solid #d1fae5; font-size:8pt; }
  .num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .sub { font-size:6.5pt; color:#9ca3af; margin-top:1pt; }
  .empty { text-align:center; color:#9ca3af; padding:14pt; font-style:italic; }
  .cat-badge { background:#e8fff4; color:#0d7a4e; border:0.5pt solid #a7f3d0; border-radius:3pt; padding:1pt 4pt; font-size:6.5pt; white-space:nowrap; }
  .status-ok { color:#16a34a; font-weight:600; white-space:nowrap; }
  .status-pend { color:#d97706; font-weight:600; white-space:nowrap; }
  .report-footer { margin-top:16px; padding-top:8px; border-top:0.5pt solid #e5e7eb; display:flex; justify-content:space-between; font-size:6.5pt; color:#aaa; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="inst-name">Daffodil International University &nbsp;·&nbsp; Faculty of Graduate Studies</div>
    <div class="report-title">Expense Report</div>
    <div class="report-sub">${dateRange}</div>
  </div>
  <div>
    <div class="logo-box">R</div>
    <div class="report-date">Generated: ${today}</div>
  </div>
</div>
<div class="summary-grid">
  <div class="sum-card"><div class="sum-label">Total Expenses</div><div class="sum-val blue">${BDT(totalSpent)}</div></div>
  <div class="sum-card"><div class="sum-label">Reimbursed</div><div class="sum-val green">${BDT(totalReimb)}</div></div>
  <div class="sum-card"><div class="sum-label">Pending</div><div class="sum-val amber">${BDT(totalPending)}</div></div>
  <div class="sum-card"><div class="sum-label">Records</div><div class="sum-val">${printExp.length}</div></div>
</div>
<table>
  <thead><tr>
    <th>Date</th><th>Project</th><th>Submitted By</th><th>Category</th><th>Description</th>
    <th class="num">Amount</th><th>Status</th>${isAdmin ? '<th>Source</th>' : ''}
  </tr></thead>
  <tbody>${expRows || '<tr><td colspan="8" class="empty">No expenses</td></tr>'}</tbody>
  <tfoot><tr>
    <td colspan="${isAdmin ? 5 : 4}">Total &mdash; ${printExp.length} record${printExp.length !== 1 ? 's' : ''}</td>
    <td class="num">${BDT(totalSpent)}</td>
    <td colspan="${isAdmin ? 2 : 1}">
      <span style="color:#16a34a">${BDT(totalReimb)} paid</span>
      &nbsp;·&nbsp;
      <span style="color:#d97706">${BDT(totalPending)} pending</span>
    </td>
  </tr></tfoot>
</table>
<div class="report-footer">
  <span>ResearchTrack · Faculty of Graduate Studies, Daffodil International University</span>
  <span>Developed by Tariqul Islam &nbsp;·&nbsp; &copy; 2025 FGS, DIU</span>
</div>
</body>
</html>`;

    const htmlWithPrint = html.replace('</body>', '<script>window.onload=function(){window.print();}<\/script></body>');
    const blob = new Blob([htmlWithPrint], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url; a.download = 'expense_report.html';
      a.style.display = 'none';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  // ── Report Modal handler ─────────────────────────────────────────────────
  const handleReportGenerate = (filteredExpenses, meta) => {
    setShowReportModal(false);
    if (meta.type === 'xlsx') handleExportCSV(filteredExpenses);
    else handlePrint(filteredExpenses, meta.label);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-eyebrow">Financial Records</div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">
            {displayed.length} record{displayed.length !== 1 ? 's' : ''}
            {hasF ? ' · Filtered' : ' · All Records'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="no-print">
          <button className="btn btn-outline btn-sm" onClick={() => setShowReportModal(true)} title="Generate a filtered PDF or XLSX report">📄 Report</button>
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
            <div className="stat-note">{expenses.length} Expense{expenses.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div><div className="stat-label">Reimbursed</div><div className="stat-value green">{fmt(totals.reimbursed)}</div></div>
              <div className="stat-icon si-green">✅</div>
            </div>
            <div className="stat-note">{expenses.filter(e => e.reimbursed).length} Paid</div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div><div className="stat-label">Pending</div><div className="stat-value amber">{fmt(totals.pending)}</div></div>
              <div className="stat-icon si-amber">⏳</div>
            </div>
            <div className="stat-note">{expenses.filter(e => !e.reimbursed).length} Unpaid</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card no-print" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Filter & Search</span>
            {hasF && <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ project_id: '', user_id: '', reimbursed: '', category: '', from_date: '', to_date: '' }); setSearch(''); }}>✕ Clear all</button>}
          </div>
          <div className="filter-grid">
            {/* Row 1: Search — full width */}
            <div className="filter-field fg-full">
              <label className="form-label">Search</label>
              <input className="form-input" placeholder="Description, project, member…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {/* Row 2: Project — full width */}
            <div className="filter-field fg-full">
              <label className="form-label">Project</label>
              <select className="form-select" value={filters.project_id} onChange={e => setF('project_id', e.target.value)}>
                <option value="">All projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            {/* Row 3: remaining filters */}
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
              <label className="form-label">From Date</label>
              <input type="date" className="form-input" value={filters.from_date || ''} onChange={e => setF('from_date', e.target.value)} />
            </div>
            <div className="filter-field">
              <label className="form-label">To Date</label>
              <input type="date" className="form-input" value={filters.to_date || ''} onChange={e => setF('to_date', e.target.value)} />
            </div>
            <div className="filter-field">
              <label className="form-label">Sort By</label>
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
            <span className="card-meta">{displayed.length} Entries</span>
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
              <table style={{ tableLayout: 'fixed', width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <colgroup>
                  <col style={{ width: '8%' }} />           {/* Date */}
                  <col style={{ width: '11%' }} />          {/* Project */}
                  <col style={{ width: '11%' }} />          {/* Submitted By */}
                  <col style={{ width: '11%' }} />          {/* Category */}
                  <col style={{ width: '24%' }} />          {/* Description */}
                  <col style={{ width: '11%' }} />          {/* Amount */}
                  <col style={{ width: '9%' }} />           {/* Status */}
                  {isAdmin && <col style={{ width: '7%' }} />}  {/* Source (admin) */}
                  <col style={{ width: isAdmin ? '8%' : '15%' }} className="no-print" />  {/* Actions */}
                </colgroup>
                <thead>
                  <tr>
                    {['Date','Project','Submitted By','Category','Description'].map(h => (
                      <th key={h} style={{ padding:'8px 8px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-tertiary)', borderBottom:'1px solid var(--border)', background:'var(--bg-subtle)' }}>{h}</th>
                    ))}
                    <th style={{ padding:'8px 8px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-tertiary)', borderBottom:'1px solid var(--border)', background:'var(--bg-subtle)', textAlign:'right' }}>Amount</th>
                    <th style={{ padding:'8px 6px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-tertiary)', borderBottom:'1px solid var(--border)', background:'var(--bg-subtle)' }}>Status</th>
                    {isAdmin && <th style={{ padding:'8px 6px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-tertiary)', borderBottom:'1px solid var(--border)', background:'var(--bg-subtle)' }}>Source</th>}
                    <th className="no-print" style={{ padding:'8px 8px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-tertiary)', borderBottom:'1px solid var(--border)', background:'var(--bg-subtle)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding:'8px 8px', fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>{fmtDate(e.expense_date)}</td>
                      <td style={{ padding:'8px 8px', overflow:'hidden' }}>
                        <div style={{ fontWeight:700, fontSize:10, marginBottom:1 }}><span className="td-code" style={{ fontSize:10 }}>{e.project_code}</span></div>
                        <div style={{ fontSize:11, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={e.project_name}>{e.project_name}</div>
                      </td>
                      <td style={{ padding:'8px 8px', overflow:'hidden' }}>
                        <div style={{ fontWeight:600, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.submitted_by_name}</div>
                        {e.reimbursed && <div style={{ fontSize:10, color:'var(--text-tertiary)' }}>Paid {fmtDate(e.reimbursed_at)}</div>}
                      </td>
                      <td style={{ padding:'8px 8px' }}>
                        <span className={`badge ${CAT_BADGE[e.category] || 'badge-gray'}`} style={{ fontSize:10, padding:'2px 5px' }}>{getCatLabel(e)}</span>
                      </td>
                      <td style={{ padding:'8px 8px', overflow:'hidden' }}>
                        <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={e.description}>{e.description}</div>
                        {e.receipt_note && <div style={{ fontSize:10, color:'var(--text-tertiary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.receipt_note}</div>}
                      </td>
                      <td style={{ padding:'8px 8px', fontSize:12, fontWeight:700, textAlign:'right', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' }}>{fmt(e.amount)}</td>
                      <td style={{ padding:'8px 6px' }}>
                        {e.reimbursed
                          ? <span className="badge badge-green" style={{ fontSize:10, padding:'2px 5px' }}>✓ Paid</span>
                          : <span className="badge badge-amber" style={{ fontSize:10, padding:'2px 5px' }}>Pending</span>}
                      </td>
                      {isAdmin && <td style={{ padding:'8px 6px', fontSize:11, color:'var(--text-secondary)' }}>{e.reimbursed ? (e.reimbursed_from === 'university' ? 'Univ.' : 'Proj.') : '—'}</td>}
                      <td className="no-print" style={{ padding:'4px 4px', textAlign:'center' }}>
                        <ActionMenu items={[
                          ...((isAdmin || (!e.reimbursed && e.submitted_by === user?.id)) ? [
                            { label: '✏ Edit', onClick: () => { setEditExpense(e); setShowModal(true); } },
                          ] : []),
                          ...((isAdmin || (!e.reimbursed && e.submitted_by === user?.id)) ? [
                            { label: '🗑 Delete', onClick: () => handleDelete(e.id), danger: true },
                          ] : []),
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ padding:'8px 8px', color:'var(--text-secondary)', fontSize:12, fontWeight:700, borderTop:'2px solid var(--border-strong)', background:'var(--bg-subtle)' }}>Total · {displayed.length} Records</td>
                    <td style={{ padding:'8px 8px', fontSize:12, fontWeight:700, textAlign:'right', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums', borderTop:'2px solid var(--border-strong)', background:'var(--bg-subtle)' }}>{fmt(totals.total)}</td>
                    <td colSpan={isAdmin ? 3 : 2} style={{ padding:'8px 6px', fontSize:11, borderTop:'2px solid var(--border-strong)', background:'var(--bg-subtle)' }}>
                      <span style={{ color:'var(--success)', fontWeight:700 }}>{fmt(totals.reimbursed)} Reimbursed</span>
                      <span style={{ color:'var(--text-tertiary)', margin:'0 5px' }}>·</span>
                      <span style={{ color:'var(--warning)', fontWeight:700 }}>{fmt(totals.pending)} Pending</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {showReportModal && (
        <ReportModal
          expenses={displayedRef.current}
          onClose={() => setShowReportModal(false)}
          onGenerate={handleReportGenerate}
        />
      )}

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
