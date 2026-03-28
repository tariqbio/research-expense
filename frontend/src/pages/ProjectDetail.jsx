import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ExpenseModal from '../components/ExpenseModal';
import InstallmentModal from '../components/InstallmentModal';
import ProjectModal from '../components/ProjectModal';
import ConfirmDialog from '../components/ConfirmDialog';

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

  // ── CSV Export (proper formatted report) ────────────────────────────────
  const handleExportCSV = () => {
    if (!project) return;
    const lines = [];
    // Header block
    lines.push(`"PROJECT EXPENSE REPORT"`);
    lines.push(`"Project Code","${project.code}"`);
    lines.push(`"Project Title","${project.name}"`);
    lines.push(`"Status","${project.status}"`);
    lines.push(`"Payment Type","${project.payment_type}"`);
    lines.push(`"Total Budget","${Number(project.total_budget).toFixed(2)}"`);
    lines.push(`"Total Spent","${Number(stats.total_spent||0).toFixed(2)}"`);
    lines.push(`"Reimbursed","${Number(stats.total_reimbursed||0).toFixed(2)}"`);
    lines.push(`"Pending","${Number(stats.total_pending||0).toFixed(2)}"`);
    lines.push(`"Report Generated","${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}"`);
    lines.push('');
    // Expense records
    lines.push(`"EXPENSE RECORDS"`);
    lines.push(['Date','Researcher','Category','Description','Amount (BDT)','Status','Paid By','Receipt Note'].join(','));
    expenses.forEach(e => {
      lines.push([
        `"${fmtDate(e.expense_date)}"`,
        `"${e.submitted_by_name}"`,
        `"${getCatLabel(e)}"`,
        `"${e.description}"`,
        Number(e.amount).toFixed(2),
        e.reimbursed ? 'Reimbursed' : 'Pending',
        e.reimbursed ? `"${e.reimbursed_by_name||''}"` : '""',
        `"${e.receipt_note||''}"`,
      ].join(','));
    });
    lines.push('');
    // Installments
    if (project.installments.length > 0) {
      lines.push(`"FUND INSTALLMENTS"`);
      lines.push(['Expected Date','Amount (BDT)','Status','Received Date','Note'].join(','));
      project.installments.forEach(i => {
        lines.push([
          `"${fmtDate(i.expected_date)}"`,
          Number(i.amount).toFixed(2),
          i.status === 'received' ? 'Received' : 'Pending',
          `"${fmtDate(i.received_date)}"`,
          `"${i.note||''}"`,
        ].join(','));
      });
      lines.push('');
    }
    // Members
    lines.push(`"PROJECT MEMBERS"`);
    lines.push(['Name','Email','Role','Total Submitted','Reimbursed','Pending'].join(','));
    project.members.forEach(m => {
      const me = expenses.filter(e => e.submitted_by === m.id);
      const mS = me.reduce((a,e) => a + Number(e.amount), 0);
      const mP = me.filter(e => e.reimbursed).reduce((a,e) => a + Number(e.amount), 0);
      lines.push([
        `"${m.name}"`, `"${m.email}"`, `"${m.role}"`,
        mS.toFixed(2), mP.toFixed(2), (mS-mP).toFixed(2)
      ].join(','));
    });

    const csv = lines.join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `${project.code}-Report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // ── Print full project report ────────────────────────────────────────────
  const handlePrint = () => {
    if (!project) return;
    const fmtBDT = n => '৳' + Number(n||0).toLocaleString('en-BD', { minimumFractionDigits:2 });
    const now = new Date().toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    const expRows = expenses.map(e => `
      <tr>
        <td>${fmtDate(e.expense_date)}</td>
        <td>${e.submitted_by_name}</td>
        <td>${getCatLabel(e)}</td>
        <td>${e.description}${e.receipt_note ? `<br><small>${e.receipt_note}</small>` : ''}</td>
        <td style="text-align:right;font-weight:600">${fmtBDT(e.amount)}</td>
        <td><span style="color:${e.reimbursed?'#16a34a':'#d97706'};font-weight:600">${e.reimbursed ? '✓ Reimbursed' : 'Pending'}</span></td>
      </tr>`).join('');

    const instRows = project.installments.map(i => `
      <tr>
        <td>${fmtDate(i.expected_date)}</td>
        <td style="text-align:right;font-weight:600">${fmtBDT(i.amount)}</td>
        <td><span style="color:${i.status==='received'?'#16a34a':'#d97706'};font-weight:600">${i.status==='received'?'✓ Received':'Pending'}</span></td>
        <td>${fmtDate(i.received_date)}</td>
        <td>${i.note||'—'}</td>
      </tr>`).join('');

    const memberRows = project.members.map(m => {
      const me = expenses.filter(e => e.submitted_by === m.id);
      const mS = me.reduce((a,e)=>a+Number(e.amount),0);
      const mP = me.filter(e=>e.reimbursed).reduce((a,e)=>a+Number(e.amount),0);
      return `<tr>
        <td><strong>${m.name}</strong></td>
        <td>${m.email}</td>
        <td>${m.role}</td>
        <td style="text-align:right">${fmtBDT(mS)}</td>
        <td style="text-align:right;color:#16a34a">${fmtBDT(mP)}</td>
        <td style="text-align:right;color:#d97706">${fmtBDT(mS-mP)}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${project.code} — Project Report</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; background: white; padding: 32px; }
  .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #28e98c; padding-bottom: 16px; }
  .report-title h1 { font-size: 22px; font-weight: 800; color: #0d1f17; letter-spacing: -0.03em; }
  .report-title p { font-size: 11px; color: #666; margin-top: 4px; }
  .report-logo { font-size: 32px; font-weight: 900; color: #28e98c; letter-spacing: -0.05em; }
  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .meta-card { background: #f8fffe; border: 1px solid #d1fae5; border-radius: 8px; padding: 12px 16px; }
  .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #666; margin-bottom: 4px; }
  .meta-value { font-size: 16px; font-weight: 800; color: #0d1f17; }
  .meta-value.green { color: #16a34a; }
  .meta-value.amber { color: #d97706; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #0d1f17; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { text-align: left; padding: 8px 10px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
  td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tfoot td { background: #f9fafb; font-weight: 700; border-top: 2px solid #e5e7eb; }
  small { color: #9ca3af; font-size: 10px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; }
  @media print {
    body { padding: 16px; }
    .no-break { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="report-header">
  <div class="report-title">
    <h1>${project.code} — ${project.name}</h1>
    <p>Project Expense Report · Generated ${now}</p>
    <p style="margin-top:4px">Faculty of Graduate Studies · Daffodil International University</p>
  </div>
  <div class="report-logo">R</div>
</div>

<div class="meta-grid">
  <div class="meta-card">
    <div class="meta-label">Total Budget</div>
    <div class="meta-value">${fmtBDT(project.total_budget)}</div>
  </div>
  <div class="meta-card">
    <div class="meta-label">Total Spent</div>
    <div class="meta-value">${fmtBDT(stats.total_spent)}</div>
  </div>
  <div class="meta-card">
    <div class="meta-label">Remaining</div>
    <div class="meta-value ${Number(project.total_budget)-Number(stats.total_spent||0) >= 0 ? 'green' : 'amber'}">${fmtBDT(Number(project.total_budget)-Number(stats.total_spent||0))}</div>
  </div>
  <div class="meta-card">
    <div class="meta-label">Reimbursed</div>
    <div class="meta-value green">${fmtBDT(stats.total_reimbursed)}</div>
  </div>
  <div class="meta-card">
    <div class="meta-label">Pending</div>
    <div class="meta-value amber">${fmtBDT(stats.total_pending)}</div>
  </div>
  <div class="meta-card">
    <div class="meta-label">Status</div>
    <div class="meta-value">${project.status.charAt(0).toUpperCase()+project.status.slice(1)}</div>
  </div>
</div>

<div class="section no-break">
  <div class="section-title">Expense Records (${expenses.length} entries)</div>
  <table>
    <thead><tr><th>Date</th><th>Researcher</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th><th>Status</th></tr></thead>
    <tbody>${expRows || '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px">No expenses recorded</td></tr>'}</tbody>
    <tfoot><tr>
      <td colspan="4">Total — ${expenses.length} records</td>
      <td style="text-align:right">${fmtBDT(stats.total_spent)}</td>
      <td>${fmtBDT(stats.total_reimbursed)} reimbursed · ${fmtBDT(stats.total_pending)} pending</td>
    </tr></tfoot>
  </table>
</div>

${project.installments.length > 0 ? `
<div class="section no-break">
  <div class="section-title">Fund Installments</div>
  <table>
    <thead><tr><th>Expected Date</th><th style="text-align:right">Amount</th><th>Status</th><th>Received Date</th><th>Note</th></tr></thead>
    <tbody>${instRows}</tbody>
  </table>
</div>` : ''}

<div class="section no-break">
  <div class="section-title">Project Members</div>
  <table>
    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th style="text-align:right">Submitted</th><th style="text-align:right">Reimbursed</th><th style="text-align:right">Pending</th></tr></thead>
    <tbody>${memberRows}</tbody>
  </table>
</div>

<div class="footer">
  <span>ResearchTrack v2.0 · FGS, Daffodil International University</span>
  <span>Developed by Tariqul Islam · © 2025</span>
</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} className="no-print">
          <button className="btn btn-outline btn-sm" onClick={handleExportCSV}>⬇ Export CSV</button>
          <button className="btn btn-outline btn-sm" onClick={handlePrint}>🖨 Print Report</button>
          <button className="btn btn-primary" onClick={() => { setEditExpense(null); setShowExpModal(true); }}>+ Add Expense</button>
          {isAdmin && (
            <>
              <button className="btn btn-outline btn-sm"
                style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
                onClick={() => setShowEditProject(true)}>✏ Edit Project</button>
              <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(true)}>🗑 Delete</button>
            </>
          )}
        </div>
      </div>

      <div className="page-body" ref={printRef}>
        {error && <div className="notice notice-error">⚠ {error}</div>}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Total Budget</div><div className="stat-value indigo">{fmt(budget)}</div></div><div className="stat-icon si-indigo">💰</div></div>
            <div className="stat-note">{project.payment_type} payment</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><div><div className="stat-label">Funds Received</div><div className="stat-value" style={{ color: 'var(--info)' }}>{fmt(receivedFunds)}</div></div><div className="stat-icon si-teal">🏦</div></div>
            <div className="stat-note">
              of {fmt(totalInstalled)} scheduled
              {totalInstalled > 0 && <span style={{ marginLeft: 6, color: budget - receivedFunds > 0 ? 'var(--warning)' : 'var(--success)' }}>
                · {fmt(budget - receivedFunds)} outstanding
              </span>}
            </div>
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
                          <div style={{ fontWeight: 600 }}>{e.submitted_by_name}</div>
                          {e.reimbursed && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Paid by {e.reimbursed_by_name}</div>}
                        </td>
                        <td><span className={`badge ${CAT_BADGE[e.category] || 'badge-gray'}`}>{getCatLabel(e)}</span></td>
                        <td style={{ minWidth: 160 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{e.description}</div>
                          {e.receipt_note && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{e.receipt_note}</div>}
                        </td>
                        <td className="td-amount">{fmt(e.amount)}</td>
                        <td>{e.reimbursed ? <span className="badge badge-green">✓ Paid</span> : <span className="badge badge-amber">Pending</span>}</td>
                        {isAdmin && <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{e.reimbursed ? (e.reimbursed_from === 'university' ? 'University' : 'Project') : '—'}</td>}
                        <td className="no-print">
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            {!e.reimbursed && (isAdmin || e.submitted_by === user?.id) && (
                              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--accent)' }}
                                onClick={() => { setEditExpense(e); setShowExpModal(true); }}>✏</button>
                            )}
                            {isAdmin && !e.reimbursed && (
                              reimbursing === e.id ? (
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                  <select className="form-select" style={{ padding: '3px 6px', fontSize: 11, width: 'auto' }}
                                    value={reimburseFrom} onChange={ev => setReimburseFrom(ev.target.value)}>
                                    <option value="university">University</option>
                                    <option value="project">Project</option>
                                  </select>
                                  <button className="btn btn-success btn-xs" onClick={() => handleReimburse(e.id)}>✓</button>
                                  <button className="btn btn-ghost btn-xs" onClick={() => setReimbursing(null)}>✕</button>
                                </div>
                              ) : (
                                <button className="btn btn-success btn-xs" onClick={() => { setReimbursing(e.id); setReimburseFrom('university'); }}>Pay</button>
                              )
                            )}
                            {!e.reimbursed && (isAdmin || e.submitted_by === user?.id) && (
                              <button className="btn btn-ghost btn-xs" onClick={() => handleDeleteExpense(e.id)} style={{ color: 'var(--danger)' }}>✕</button>
                            )}
                          </div>
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
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
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
            <div style={{ display: 'flex', gap: 24, padding: '12px 18px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Total Budget</div><div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>{fmt(budget)}</div></div>
              <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Scheduled</div><div style={{ fontSize: 15, fontWeight: 800 }}>{fmt(totalInstalled)}</div></div>
              <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Received</div><div style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>{fmt(receivedFunds)}</div></div>
              <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Still Pending</div><div style={{ fontSize: 15, fontWeight: 800, color: 'var(--warning)' }}>{fmt(totalInstalled - receivedFunds)}</div></div>
              <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Unscheduled</div><div style={{ fontSize: 15, fontWeight: 800, color: budget - totalInstalled < 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{fmt(budget - totalInstalled)}</div></div>
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
                        <td style={{ color: 'var(--text-tertiary)', fontWeight: 700, fontSize: 11 }}>#{idx+1}</td>
                        <td className="td-date">{fmtDate(inst.expected_date)}</td>
                        <td className="td-amount">{fmt(inst.amount)}</td>
                        <td>{inst.status === 'received'
                          ? <span className="badge badge-green">✓ Received</span>
                          : <span className="badge badge-amber">Pending</span>}
                        </td>
                        <td className="td-date" style={{ color: inst.received_date ? 'var(--success)' : 'var(--text-tertiary)' }}>
                          {fmtDate(inst.received_date)}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{inst.note || '—'}</td>
                        {isAdmin && (
                          <td className="no-print">
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--accent)' }}
                                onClick={() => { setEditInstallment(inst); setShowInstModal(true); }}>✏ Edit</button>
                              {inst.status !== 'received' && (
                                <button className="btn btn-success btn-xs" onClick={() => handleMarkInst(inst.id)}>✓ Received</button>
                              )}
                            </div>
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
