/**
 * exportXlsx.js — CSV export.
 *
 * Downloads a proper UTF-8 CSV file that opens correctly in Excel,
 * Google Sheets (desktop + mobile), and Numbers on all devices.
 * The HTML-as-XLS approach caused "file corrupted" errors on mobile Sheets.
 */

const BDT = v => '\u09F3' + Number(v || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const N   = v => Number(v || 0);

function esc(val) {
  const s = String(val == null ? '' : val).replace(/\r?\n/g, ' ');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

function toCSV(rows) {
  return rows.map(r => r.map(esc).join(',')).join('\r\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportProjectXlsx({ project, expenses, stats, getCatLabel, fmtDate }) {
  const budget     = N(project.total_budget);
  const spent      = N(stats.total_spent);
  const reimbursed = N(stats.total_reimbursed);
  const pending    = N(stats.total_pending);
  const remaining  = budget - spent;
  const pct        = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const today      = new Date().toLocaleDateString('en-GB',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const rows = [];

  rows.push(['ResearchTrack - Faculty of Graduate Studies, Daffodil International University']);
  rows.push(['Project Expense Report']);
  rows.push(['Generated', today]);
  rows.push([]);

  rows.push(['PROJECT INFORMATION']);
  rows.push(['Project Code', project.code]);
  rows.push(['Project Name', project.name]);
  rows.push(['Payment Type', project.payment_type]);
  rows.push(['Status', project.status]);
  if (project.description) rows.push(['Description', project.description]);
  rows.push([]);

  rows.push(['FINANCIAL SUMMARY']);
  rows.push(['Total Budget', BDT(budget)]);
  rows.push(['Total Spent', BDT(spent)]);
  rows.push(['Budget Used %', pct.toFixed(1) + '%']);
  rows.push(['Reimbursed', BDT(reimbursed)]);
  rows.push(['Pending Reimbursement', BDT(pending)]);
  rows.push(['Remaining Budget', BDT(remaining)]);
  rows.push([]);

  rows.push(['EXPENSE RECORDS (' + expenses.length + ' entries)']);
  rows.push(['Date', 'Researcher', 'Category', 'Description', 'Receipt Note', 'Amount', 'Status', 'Reimbursed Date']);
  expenses.forEach(e => {
    rows.push([
      fmtDate(e.expense_date),
      e.submitted_by_name || '',
      getCatLabel(e),
      e.description,
      e.receipt_note || '',
      BDT(e.amount),
      e.reimbursed ? 'Reimbursed' : 'Pending',
      e.reimbursed ? fmtDate(e.reimbursed_at) : '',
    ]);
  });
  rows.push(['', '', '', 'TOTAL', '', BDT(spent), '', '']);
  rows.push([]);

  if ((project.installments || []).length > 0) {
    rows.push(['FUND INSTALLMENTS (' + project.installments.length + ')']);
    rows.push(['#', 'Expected Date', 'Amount', 'Status', 'Date Received', 'Note']);
    project.installments.forEach((inst, i) => {
      rows.push([
        '#' + (i + 1),
        fmtDate(inst.expected_date),
        BDT(inst.amount),
        inst.status === 'received' ? 'Received' : 'Pending',
        inst.received_date ? fmtDate(inst.received_date) : '',
        inst.note || '',
      ]);
    });
    rows.push([]);
  }

  if ((project.members || []).length > 0) {
    rows.push(['MEMBER SUMMARY']);
    rows.push(['Name', 'Email', 'Role', 'No. of Expenses', 'Total Amount', 'Reimbursed', 'Pending']);
    project.members.forEach(m => {
      const me = expenses.filter(e => e.submitted_by === m.id);
      const mS = me.reduce((a, e) => a + N(e.amount), 0);
      const mR = me.filter(e => e.reimbursed).reduce((a, e) => a + N(e.amount), 0);
      rows.push([m.name, m.email, m.role, me.length, BDT(mS), BDT(mR), BDT(mS - mR)]);
    });
    rows.push([]);
  }

  rows.push(['ResearchTrack v2.0 - Developed by Tariqul Islam - (c) 2025 FGS, DIU']);

  const date = new Date().toISOString().split('T')[0];
  downloadCSV(toCSV(rows), project.code + '-Report-' + date + '.csv');
}


export function exportExpensesXlsx({ displayed, totals, filters, projects, search, user, getCatLabel, fmtDate, CAT_LABELS }) {
  const today = new Date().toLocaleDateString('en-GB',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const rate  = totals.total > 0
    ? (totals.reimbursed / totals.total * 100).toFixed(1) + '%' : '0.0%';

  const af = [];
  if (filters.project_id) {
    const p = projects.find(p => String(p.id) === String(filters.project_id));
    if (p) af.push('Project: ' + p.code);
  }
  if (filters.reimbursed === 'true')  af.push('Status: Reimbursed');
  if (filters.reimbursed === 'false') af.push('Status: Pending');
  if (filters.category)  af.push('Category: ' + (CAT_LABELS[filters.category] || filters.category));
  if (filters.from_date) af.push('From: ' + fmtDate(filters.from_date));
  if (filters.to_date)   af.push('To: ' + fmtDate(filters.to_date));
  if (search) af.push('Search: "' + search + '"');

  const rows = [];

  rows.push(['ResearchTrack - Faculty of Graduate Studies, Daffodil International University']);
  rows.push(['Research Expense Report']);
  rows.push(['Generated', today]);
  rows.push(['Generated by', user?.name || '']);
  if (af.length) rows.push(['Filters applied', af.join(' - ')]);
  rows.push([]);

  rows.push(['FINANCIAL SUMMARY']);
  rows.push(['Total Expenses', BDT(totals.total), 'Records', displayed.length]);
  rows.push(['Reimbursed', BDT(totals.reimbursed), 'Reimbursement Rate', rate]);
  rows.push(['Pending', BDT(totals.pending)]);
  rows.push([]);

  rows.push(['EXPENSE RECORDS (' + displayed.length + ' records)']);
  rows.push(['Date', 'Project Code', 'Project Name', 'Submitted By', 'Category', 'Description', 'Receipt Note', 'Amount', 'Status', 'Paid Date', 'Source']);
  displayed.forEach(e => {
    rows.push([
      fmtDate(e.expense_date),
      e.project_code || '',
      e.project_name || '',
      e.submitted_by_name || '',
      getCatLabel(e),
      e.description,
      e.receipt_note || '',
      BDT(e.amount),
      e.reimbursed ? 'Reimbursed' : 'Pending',
      e.reimbursed ? fmtDate(e.reimbursed_at) : '',
      e.reimbursed ? (e.reimbursed_from === 'university' ? 'University' : 'Project') : '',
    ]);
  });
  rows.push(['', '', '', '', '', 'TOTAL', '', BDT(totals.total), '', '', '']);
  rows.push([]);

  rows.push(['ResearchTrack v2.0 - Developed by Tariqul Islam - (c) 2025 FGS, DIU']);

  const date = new Date().toISOString().split('T')[0];
  downloadCSV(toCSV(rows), 'Expenses-Report-' + date + '.csv');
}
