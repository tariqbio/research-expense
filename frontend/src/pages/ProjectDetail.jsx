import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ExpenseModal from '../components/ExpenseModal';
import InstallmentModal from '../components/InstallmentModal';
import ProjectModal from '../components/ProjectModal';
import ConfirmDialog from '../components/ConfirmDialog';
import RowActions from '../components/RowActions';


const fmt = n => '৳' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CAT_LABELS = { transportation:'Transportation', printing_stationery:'Printing & Stationery', field_work:'Field Work', communication:'Communication', other:'Other', miscellaneous:'Miscellaneous' };
const CAT_BADGE  = { transportation:'badge-teal', printing_stationery:'badge-indigo', field_work:'badge-green', communication:'badge-amber', other:'badge-gray', miscellaneous:'badge-gray' };
const getCatLabel = e => e.category === 'other' ? (e.other_label || 'Other') : (CAT_LABELS[e.category] || e.category);

export default function ProjectDetail() {
  const { id } = useParams();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [project, setProject]   = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showExpModal, setShowExpModal]   = useState(false);
  const [editExpense, setEditExpense]     = useState(null);
  const [showInstModal, setShowInstModal] = useState(false);
  const [editInstallment, setEditInstallment] = useState(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [activeTab, setActiveTab]     = useState('expenses');
  const [reimbursing, setReimbursing] = useState(null);
  const [reimburseFrom, setReimburseFrom] = useState('university');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expSearch, setExpSearch] = useState('');
  const [expSort, setExpSort]     = useState('date_desc');
  const [expStatus, setExpStatus] = useState('');

  const load = async () => {
    try {
      const [pRes, eRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/expenses?project_id=${id}`)
      ]);
      setProject(pRes.data); setExpenses(eRes.data);
    } catch(e) {
      if (e.response?.status === 403 || e.response?.status === 404) navigate('/');
    } finally { setLoading(false); }
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
    try { await api.delete(`/projects/${id}`); navigate('/'); }
    catch(e) { setError(e.response?.data?.error || 'Failed to delete project.'); setDeleting(false); }
  };

  const handleMarkInst = async iid => {
    try {
      await api.patch(`/projects/${id}/installments/${iid}`, {
        status: 'received',
        received_date: new Date().toISOString().split('T')[0],
      });
      load();
    } catch(e) { alert('Failed to update installment.'); }
  };



  // ── Print — proper A4 PDF report in a new tab ───────────────────────────
  const handlePrint = () => {
    if (!project) return;
    const BDT = n => '&#2547;' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
    const today = new Date().toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    const totalSpent   = Number(stats.total_spent || 0);
    const totalReimb   = Number(stats.total_reimbursed || 0);
    const totalPending = Number(stats.total_pending || 0);
    const budget       = Number(project.total_budget || 0);
    const remaining    = budget - totalSpent;
    const pct          = budget > 0 ? Math.min(100, (totalSpent / budget) * 100).toFixed(1) : '0.0';

    const expRows = expenses.map((e, i) => `
      <tr class="${i % 2 === 0 ? 'even' : ''}">
        <td>${fmtDate(e.expense_date)}</td>
        <td>${e.submitted_by_name}</td>
        <td><span class="cat-badge">${getCatLabel(e)}</span></td>
        <td>${e.description}${e.receipt_note ? `<div class="sub">${e.receipt_note}</div>` : ''}</td>
        <td class="num">${BDT(e.amount)}</td>
        <td class="${e.reimbursed ? 'status-ok' : 'status-pend'}">${e.reimbursed ? '&#10003; Reimbursed' : 'Pending'}</td>
      </tr>`).join('');

    const instRows = project.installments.length > 0
      ? project.installments.map((inst, i) => `
        <tr class="${i % 2 === 0 ? 'even' : ''}">
          <td>#${i + 1}</td>
          <td>${fmtDate(inst.expected_date)}</td>
          <td class="num">${BDT(inst.amount)}</td>
          <td class="${inst.status === 'received' ? 'status-ok' : 'status-pend'}">${inst.status === 'received' ? '&#10003; Received' : 'Pending'}</td>
          <td>${inst.received_date ? fmtDate(inst.received_date) : '—'}</td>
          <td>${inst.note || '—'}</td>
        </tr>`).join('')
      : '<tr><td colspan="6" class="empty">No installments recorded</td></tr>';

    const memberRows = project.members.map((m, i) => {
      const me = expenses.filter(e => e.submitted_by === m.id);
      const mS = me.reduce((a, e) => a + Number(e.amount), 0);
      const mP = me.filter(e => e.reimbursed).reduce((a, e) => a + Number(e.amount), 0);
      return `<tr class="${i % 2 === 0 ? 'even' : ''}">
        <td><strong>${m.name}</strong></td>
        <td class="sub-text">${m.email}</td>
        <td>${m.role}</td>
        <td class="num">${me.length}</td>
        <td class="num">${BDT(mS)}</td>
        <td class="num status-ok">${BDT(mP)}</td>
        <td class="num ${mS - mP > 0 ? 'status-pend' : ''}">${BDT(mS - mP)}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0">
<title>${project.code} — Expense Report</title>
<style>
  @page {
    size: A4 portrait;
    margin: 18mm 16mm 18mm 16mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html {
    /* Force desktop-equivalent rendering width on all devices */
    min-width: 700px;
  }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 10pt;
    color: #1a1a1a;
    background: #fff;
    line-height: 1.45;
    min-width: 700px;
    width: 100%;
  }

  /* ── Header ── */
  .header {
    display: flex !important;
    flex-direction: row !important;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 14px;
    margin-bottom: 18px;
    border-bottom: 3pt solid #28e98c;
  }
  .header-left { flex: 1; min-width: 0; }
  .inst-name {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #28a870;
    margin-bottom: 6px;
  }
  .proj-code {
    display: inline-block;
    background: #e8fff4;
    color: #0d7a4e;
    border: 1pt solid #a7f3d0;
    border-radius: 4pt;
    padding: 2pt 7pt;
    font-size: 8pt;
    font-weight: 800;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }
  .proj-title { font-size: 15pt; font-weight: 800; color: #0d1f17; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 4px; }
  .proj-desc { font-size: 8.5pt; color: #555; margin-top: 3px; }
  .header-right { text-align: right; padding-left: 20px; }
  .logo-box {
    width: 46pt; height: 46pt;
    background: #0d1f17;
    border-radius: 8pt;
    display: flex; align-items: center; justify-content: center;
    font-size: 22pt; font-weight: 900; color: #28e98c;
    margin-bottom: 5px;
    margin-left: auto;
  }
  .report-date { font-size: 7.5pt; color: #888; }

  /* ── Summary cards ── */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr) !important;
    gap: 7px;
    margin-bottom: 18px;
    min-width: 0;
  }
  .sum-card {
    background: #f8fffe;
    border: 1pt solid #d1fae5;
    border-radius: 5pt;
    padding: 8pt 9pt;
    text-align: center;
  }
  .sum-label { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #888; margin-bottom: 3pt; }
  .sum-val { font-size: 11pt; font-weight: 800; color: #0d1f17; line-height: 1; }
  .sum-val.green { color: #16a34a; }
  .sum-val.amber { color: #d97706; }
  .sum-val.red   { color: #dc2626; }
  .sum-val.blue  { color: #0891b2; }

  /* ── Progress bar ── */
  .progress-wrap { margin-bottom: 18px; }
  .progress-label { display: flex; justify-content: space-between; font-size: 7.5pt; color: #666; margin-bottom: 4pt; }
  .progress-bar { height: 7pt; background: #e5e7eb; border-radius: 4pt; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 4pt; background: ${pct > 90 ? '#dc2626' : pct > 70 ? '#d97706' : '#28e98c'}; width: ${pct}%; }

  /* ── Section title ── */
  .section { margin-bottom: 20px; page-break-inside: avoid; }
  .section-header {
    display: flex;
    align-items: center;
    gap: 8pt;
    margin-bottom: 8px;
    padding-bottom: 5px;
    border-bottom: 1.5pt solid #e5e7eb;
  }
  .section-title { font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: #0d1f17; }
  .section-count { font-size: 7.5pt; background: #f3f4f6; color: #6b7280; padding: 1pt 6pt; border-radius: 20pt; font-weight: 600; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  thead tr { background: #0d1f17; }
  thead th { padding: 6pt 8pt; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #fff; text-align: left; }
  thead th.num { text-align: right; }
  tbody td { padding: 5.5pt 8pt; border-bottom: 0.5pt solid #f0f0f0; vertical-align: middle; }
  tbody tr.even td { background: #fafafa; }
  tbody tr:hover td { background: #f0fff8; }
  tfoot td { padding: 6pt 8pt; background: #f0fff8; font-weight: 700; border-top: 1.5pt solid #d1fae5; font-size: 8.5pt; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .sub { font-size: 7pt; color: #9ca3af; margin-top: 1pt; }
  .sub-text { font-size: 7.5pt; color: #6b7280; }
  .empty { text-align: center; color: #9ca3af; padding: 14pt; font-style: italic; }
  .cat-badge { background: #e8fff4; color: #0d7a4e; border: 0.5pt solid #a7f3d0; border-radius: 3pt; padding: 1pt 5pt; font-size: 7pt; white-space: nowrap; }
  .status-ok   { color: #16a34a; font-weight: 600; white-space: nowrap; }
  .status-pend { color: #d97706; font-weight: 600; white-space: nowrap; }

  /* ── Footer ── */
  .report-footer {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 0.5pt solid #e5e7eb;
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    justify-content: space-between;
    font-size: 7pt;
    color: #aaa;
  }

  /* ── Print safety ── */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .section { page-break-inside: avoid; }
    .header { page-break-after: avoid; }
  }

  /* ── Force desktop layout on mobile screens (prevents reflowing before print) ── */
  @media screen and (max-width: 900px) {
    html, body { min-width: 700px !important; }
    .header { display: flex !important; flex-direction: row !important; }
    .summary-grid { grid-template-columns: repeat(6, 1fr) !important; }
    table { font-size: 8pt !important; }
    thead th { padding: 4pt 5pt !important; }
    tbody td { padding: 4pt 5pt !important; }
  }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-left">
    <div class="inst-name">Daffodil International University &nbsp;·&nbsp; Faculty of Graduate Studies</div>
    <div class="proj-code">${project.code}</div>
    <div class="proj-title">${project.name}</div>
    ${project.description ? `<div class="proj-desc">${project.description}</div>` : ''}
  </div>
  <div class="header-right">
    <div class="logo-box">R</div>
    <div class="report-date">Expense Report<br>${today}</div>
  </div>
</div>

<!-- SUMMARY CARDS -->
<div class="summary-grid">
  <div class="sum-card"><div class="sum-label">Total Budget</div><div class="sum-val">${BDT(budget)}</div></div>
  <div class="sum-card"><div class="sum-label">Total Spent</div><div class="sum-val blue">${BDT(totalSpent)}</div></div>
  <div class="sum-card"><div class="sum-label">Reimbursed</div><div class="sum-val green">${BDT(totalReimb)}</div></div>
  <div class="sum-card"><div class="sum-label">Pending</div><div class="sum-val amber">${BDT(totalPending)}</div></div>
  <div class="sum-card"><div class="sum-label">Remaining</div><div class="sum-val ${remaining < 0 ? 'red' : 'green'}">${BDT(remaining)}</div></div>
  <div class="sum-card"><div class="sum-label">Utilised</div><div class="sum-val ${pct > 90 ? 'red' : pct > 70 ? 'amber' : ''}">${pct}%</div></div>
</div>

<!-- BUDGET PROGRESS -->
<div class="progress-wrap">
  <div class="progress-label"><span>Budget Utilisation</span><span>${BDT(totalSpent)} of ${BDT(budget)}</span></div>
  <div class="progress-bar"><div class="progress-fill"></div></div>
</div>

<!-- EXPENSE RECORDS -->
<div class="section">
  <div class="section-header">
    <div class="section-title">Expense Records</div>
    <div class="section-count">${expenses.length} entries</div>
  </div>
  <table>
    <thead><tr>
      <th>Date</th><th>Researcher</th><th>Category</th><th>Description</th>
      <th class="num">Amount</th><th>Status</th>
    </tr></thead>
    <tbody>${expRows || '<tr><td colspan="6" class="empty">No expenses recorded</td></tr>'}</tbody>
    <tfoot><tr>
      <td colspan="4">Total &mdash; ${expenses.length} record${expenses.length !== 1 ? 's' : ''}</td>
      <td class="num">${BDT(totalSpent)}</td>
      <td><span class="status-ok">${BDT(totalReimb)} paid</span> &nbsp;·&nbsp; <span class="status-pend">${BDT(totalPending)} pending</span></td>
    </tr></tfoot>
  </table>
</div>

${project.installments.length > 0 ? `
<!-- FUND INSTALLMENTS -->
<div class="section">
  <div class="section-header">
    <div class="section-title">Fund Installments</div>
    <div class="section-count">${project.installments.length} installment${project.installments.length !== 1 ? 's' : ''}</div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Expected Date</th><th class="num">Amount</th><th>Status</th><th>Date Received</th><th>Note</th></tr></thead>
    <tbody>${instRows}</tbody>
  </table>
</div>` : ''}

<!-- MEMBER SUMMARY -->
<div class="section">
  <div class="section-header">
    <div class="section-title">Member Summary</div>
    <div class="section-count">${project.members.length} members</div>
  </div>
  <table>
    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th class="num">Expenses</th><th class="num">Total</th><th class="num">Reimbursed</th><th class="num">Pending</th></tr></thead>
    <tbody>${memberRows}</tbody>
  </table>
</div>

<!-- FOOTER -->
<div class="report-footer">
  <span>ResearchTrack v2.0 &nbsp;·&nbsp; Faculty of Graduate Studies, Daffodil International University</span>
  <span>Developed by Tariqul Islam &nbsp;·&nbsp; &copy; 2025 FGS, DIU</span>
</div>

</body>
</html>`;

    // ── Universal print ──────────────────────────────────────────────────────
    // Desktop: open blob in new tab (already working perfectly — don't change)
    // Mobile:  blob: URLs can't be opened via window.open on iOS/Android.
    //          Instead we make the iframe FULL-SCREEN so layout renders
    //          identically to desktop, call print(), then remove it.
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (!isMobile) {
      // ── Desktop: existing working approach ──
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const win  = window.open(url, '_blank');
      if (!win) alert('Please allow pop-ups for this site to open the print report.');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return;
    }

    // ── Mobile: full-screen iframe so layout = desktop quality ──
    const iframeId = '__rt_print_frame__';
    let iframe = document.getElementById(iframeId);
    if (iframe) iframe.remove();

    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    // Full-screen, above everything — makes layout render at full width like desktop
    iframe.style.cssText = [
      'position:fixed', 'inset:0', 'width:100vw', 'height:100vh',
      'z-index:99999', 'border:none', 'background:white',
      'overflow:auto', 'opacity:1',
    ].join(';');
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Give fonts and layout time to fully render at full width, then print
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('iframe print failed:', e);
      }
      // Remove iframe after print dialog is dismissed
      setTimeout(() => { if (iframe) iframe.remove(); }, 1500);
    }, 600);
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

  // Filter + sort expenses
  let displayedExp = expenses.filter(e => {
    const q = expSearch.toLowerCase();
    const matchQ = !q || e.description.toLowerCase().includes(q) || e.submitted_by_name?.toLowerCase().includes(q) || getCatLabel(e).toLowerCase().includes(q);
    const matchS = !expStatus || (expStatus === 'pending' ? !e.reimbursed : e.reimbursed);
    return matchQ && matchS;
  });
  displayedExp = [...displayedExp].sort((a, b) => {
    if (expSort === 'date_desc') return new Date(b.expense_date) - new Date(a.expense_date);
    if (expSort === 'date_asc')  return new Date(a.expense_date) - new Date(b.expense_date);
    if (expSort === 'amount_desc') return Number(b.amount) - Number(a.amount);
    if (expSort === 'amount_asc')  return Number(a.amount) - Number(b.amount);
    if (expSort === 'name') return a.submitted_by_name?.localeCompare(b.submitted_by_name);
    return 0;
  });

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span className="project-code">{project.code}</span>
            <span className={`badge ${project.status === 'active' ? 'badge-green' : project.status === 'completed' ? 'badge-teal' : 'badge-gray'}`}>
              {project.status === 'completed' ? 'Ended' : project.status}
            </span>
            <span className="badge badge-gray">{project.payment_type}</span>
          </div>
          <h1 className="page-title" style={{ fontSize: 20 }}>{project.name}</h1>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <div className="page-actions no-print">
          <div className="page-actions-group">
            <button className="btn btn-outline btn-sm" onClick={handlePrint}>🖨 Print</button>
          </div>
          {isAdmin && <div className="page-actions-divider" />}
          <div className="page-actions-group">
            <button className="btn btn-primary" onClick={() => { setEditExpense(null); setShowExpModal(true); }}>+ Add Expense</button>
            {isAdmin && (
              <button className="btn btn-outline btn-sm"
                style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
                onClick={() => setShowEditProject(true)}>✏ Edit</button>
            )}
            {isAdmin && (
              <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(true)}>🗑</button>
            )}
          </div>
        </div>
      </div>

      <div className="page-body" ref={printRef}>
        {error && <div className="notice notice-error">⚠ {error}</div>}

        {/* Reimburse confirmation panel */}
        {reimbursing && (
          <div className="notice notice-info" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ flex: 1 }}>Mark expense as paid — select funding source:</span>
            <select className="form-select" style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
              value={reimburseFrom} onChange={e => setReimburseFrom(e.target.value)}>
              <option value="university">University funds</option>
              <option value="project">Project funds</option>
            </select>
            <button className="btn btn-success btn-sm" onClick={() => handleReimburse(reimbursing)}>✓ Confirm Payment</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setReimbursing(null)}>Cancel</button>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Total Budget</div><div className="stat-value indigo">{fmt(budget)}</div></div><div className="stat-icon si-indigo">💰</div></div>
            <div className="stat-note">{project.payment_type?.charAt(0).toUpperCase() + project.payment_type?.slice(1)} Payment</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Funds Received</div><div className="stat-value" style={{ color: 'var(--info)' }}>{fmt(receivedFunds)}</div></div><div className="stat-icon si-teal">🏦</div></div>
            <div className="stat-note">
              Of {fmt(totalInstalled)} Scheduled
              {totalInstalled > 0 && <span style={{ marginLeft: 6, color: budget - receivedFunds > 0 ? 'var(--warning)' : 'var(--success)' }}>
                · {fmt(budget - receivedFunds)} Outstanding
              </span>}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Total Spent</div><div className="stat-value">{fmt(spent)}</div></div><div className="stat-icon si-blue">📈</div></div>
            <div className="progress"><div className={`progress-fill${pct > 90 ? ' danger' : pct > 70 ? ' warn' : ''}`} style={{ width: pct + '%' }} /></div>
            <div className="stat-note">{pct.toFixed(1)}% Of Budget</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Reimbursed</div><div className="stat-value green">{fmt(stats.total_reimbursed)}</div></div><div className="stat-icon si-green">✅</div></div>
            <div className="stat-note">{reimbursedExp.length} Expense{reimbursedExp.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Pending</div><div className="stat-value amber">{fmt(stats.total_pending)}</div></div><div className="stat-icon si-amber">⏳</div></div>
            <div className="stat-note">{pendingExp.length} Unpaid</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Remaining</div><div className={`stat-value ${budget - spent < 0 ? 'red' : 'green'}`}>{fmt(budget - spent)}</div></div><div className="stat-icon si-green">📊</div></div>
            <div className="stat-note">Budget Balance</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { key: 'expenses',     label: 'Expenses',     count: expenses.length },
            { key: 'installments', label: 'Fund Installments', count: project.installments.length },
            { key: 'members',      label: 'Members',      count: project.members.length },
          ].map(t => (
            <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label} <span className="tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        {/* ── Expenses tab ── */}
        {activeTab === 'expenses' && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Expense Records</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-amber">{pendingExp.length} pending</span>
                <span className="badge badge-green">{reimbursedExp.length} reimbursed</span>
              </div>
            </div>
            <div className="filter-bar no-print" style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
              <div className="filter-field" style={{ flex: 2 }}>
                <input className="form-input" placeholder="Search description, researcher, category…"
                  value={expSearch} onChange={e => setExpSearch(e.target.value)} style={{ padding: '7px 10px', fontSize: 13 }} />
              </div>
              <div className="filter-field">
                <select className="form-select" value={expStatus} onChange={e => setExpStatus(e.target.value)} style={{ padding: '7px 10px', fontSize: 13 }}>
                  <option value="">All status</option>
                  <option value="pending">Pending only</option>
                  <option value="reimbursed">Reimbursed only</option>
                </select>
              </div>
              <div className="filter-field">
                <select className="form-select" value={expSort} onChange={e => setExpSort(e.target.value)} style={{ padding: '7px 10px', fontSize: 13 }}>
                  <option value="date_desc">Newest first</option>
                  <option value="date_asc">Oldest first</option>
                  <option value="amount_desc">Highest amount</option>
                  <option value="amount_asc">Lowest amount</option>
                  <option value="name">Researcher A–Z</option>
                </select>
              </div>
              {(expSearch || expStatus) && (
                <button className="btn btn-ghost btn-xs" onClick={() => { setExpSearch(''); setExpStatus(''); }}>✕ Clear</button>
              )}
            </div>

            {displayedExp.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🧾</div>
                <h4>{expenses.length === 0 ? 'No expenses yet' : 'No match'}</h4>
                <p>{expenses.length === 0 ? 'Add the first expense to this project.' : 'Try adjusting your search.'}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Date</th><th>Researcher</th><th>Category</th><th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th><th>Status</th>
                    {isAdmin && <th>Source</th>}<th className="no-print"></th>
                  </tr></thead>
                  <tbody>
                    {displayedExp.map(e => (
                      <tr key={e.id}>
                        <td className="td-date">{fmtDate(e.expense_date)}</td>
                        <td style={{ minWidth: 100 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{e.submitted_by_name}</div>
                          {e.reimbursed && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Paid by {e.reimbursed_by_name}</div>}
                        </td>
                        <td><span className={`badge ${CAT_BADGE[e.category] || 'badge-gray'}`}>{getCatLabel(e)}</span></td>
                        <td style={{ minWidth: 160 }}>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{e.description}</div>
                          {e.receipt_note && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{e.receipt_note}</div>}
                        </td>
                        <td className="td-amount">{fmt(e.amount)}</td>
                        <td>{e.reimbursed ? <span className="badge badge-green">✓ Paid</span> : <span className="badge badge-amber">Pending</span>}</td>
                        {isAdmin && <td style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{e.reimbursed ? (e.reimbursed_from === 'university' ? 'University' : 'Project') : '—'}</td>}
                        <td className="no-print" style={{ width: 40, paddingLeft: 4, paddingRight: 12 }}>
                          <RowActions items={[
                            (isAdmin || (!e.reimbursed && e.submitted_by === user?.id)) && {
                              label: 'Edit', icon: '✏', className: 'accent',
                              onClick: () => { setEditExpense(e); setShowExpModal(true); }
                            },
                            isAdmin && !e.reimbursed && {
                              label: 'Mark Paid', icon: '✓', className: 'success',
                              onClick: () => { setReimbursing(e.id); setReimburseFrom('university'); }
                            },
                            { divider: true },
                            (isAdmin || (!e.reimbursed && e.submitted_by === user?.id)) && {
                              label: 'Delete', icon: '🗑', className: 'danger',
                              onClick: () => handleDeleteExpense(e.id)
                            },
                          ]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr>
                    <td colSpan={isAdmin ? 4 : 4} style={{ color: 'var(--text-secondary)' }}>Total · {displayedExp.length} records</td>
                    <td className="td-amount">{fmt(displayedExp.reduce((a,e)=>a+Number(e.amount),0))}</td>
                    <td colSpan={isAdmin ? 3 : 2}>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>{fmt(displayedExp.filter(e=>e.reimbursed).reduce((a,e)=>a+Number(e.amount),0))}</span>
                      <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>·</span>
                      <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{fmt(displayedExp.filter(e=>!e.reimbursed).reduce((a,e)=>a+Number(e.amount),0))} pending</span>
                    </td>
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Installments tab ── */}
        {activeTab === 'installments' && (
          <div className="card">
            <div className="card-header">
              <div>
                <span className="card-title">Fund Installments</span>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Each installment = a portion of the {fmt(budget)} total budget being released. Add multiple installments for staged funding.
                </div>
              </div>
              {isAdmin && (
                <button className="btn btn-primary btn-sm" onClick={() => { setEditInstallment(null); setShowInstModal(true); }}>
                  + Add Installment
                </button>
              )}
            </div>

            {/* Summary bar */}
            <div style={{ display: 'flex', gap: 24, padding: '14px 20px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Total Budget</div><div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{fmt(budget)}</div></div>
              <div><div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Scheduled</div><div style={{ fontSize: 16, fontWeight: 800 }}>{fmt(totalInstalled)}</div></div>
              <div><div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Received</div><div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)' }}>{fmt(receivedFunds)}</div></div>
              <div><div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Still Pending</div><div style={{ fontSize: 16, fontWeight: 800, color: 'var(--warning)' }}>{fmt(totalInstalled - receivedFunds)}</div></div>
              <div><div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Unscheduled</div><div style={{ fontSize: 16, fontWeight: 800, color: budget - totalInstalled < 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{fmt(budget - totalInstalled)}</div></div>
            </div>

            {project.installments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏦</div>
                <h4>No installments yet</h4>
                <p>Add installments to track when portions of the budget are received. You can add as many installments as needed (1st, 2nd, 3rd tranche, etc.).</p>
                {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setEditInstallment(null); setShowInstModal(true); }}>+ Add First Installment</button>}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>#</th><th>Expected Date</th><th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th><th>Date Received</th><th>Note</th>
                    {isAdmin && <th className="no-print">Actions</th>}
                  </tr></thead>
                  <tbody>
                    {project.installments.map((inst, idx) => (
                      <tr key={inst.id}>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: 13 }}>#{idx+1}</td>
                        <td className="td-date">{fmtDate(inst.expected_date)}</td>
                        <td className="td-amount">{fmt(inst.amount)}</td>
                        <td>{inst.status === 'received'
                          ? <span className="badge badge-green">✓ Received</span>
                          : <span className="badge badge-amber">Pending</span>}
                        </td>
                        <td className="td-date" style={{ color: inst.received_date ? 'var(--success)' : 'var(--text-tertiary)' }}>
                          {fmtDate(inst.received_date)}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{inst.note || '—'}</td>
                        {isAdmin && (
                          <td className="no-print" style={{ width: 40, paddingLeft: 4, paddingRight: 12 }}>
                            <RowActions items={[
                              {
                                label: 'Edit', icon: '✏', className: 'accent',
                                onClick: () => { setEditInstallment(inst); setShowInstModal(true); }
                              },
                              inst.status !== 'received' && {
                                label: 'Mark Received', icon: '✓', className: 'success',
                                onClick: () => handleMarkInst(inst.id)
                              },
                            ]} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr>
                    <td colSpan={2}>Total ({project.installments.length} installment{project.installments.length !== 1 ? 's' : ''})</td>
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

        {/* ── Members tab ── */}
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
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.email}</td>
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

      {showExpModal && (
        <ExpenseModal
          projectId={id}
          expense={editExpense}
          onClose={() => { setShowExpModal(false); setEditExpense(null); }}
          onSaved={() => { setShowExpModal(false); setEditExpense(null); load(); }}
        />
      )}
      {showInstModal && (
        <InstallmentModal
          projectId={id}
          installment={editInstallment}
          onClose={() => { setShowInstModal(false); setEditInstallment(null); }}
          onSaved={() => { setShowInstModal(false); setEditInstallment(null); load(); }}
        />
      )}
      {showEditProject && (
        <ProjectModal
          project={project}
          onClose={() => setShowEditProject(false)}
          onSaved={() => { setShowEditProject(false); load(); }}
        />
      )}
      <ConfirmDialog
        isOpen={deleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete project "${project?.code}"? This will also delete all expenses and cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        requiresTyping={true}
        typingPrompt={project?.code || ''}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteConfirm(false)}
        isLoading={deleting}
      />
    </>
  );
}
