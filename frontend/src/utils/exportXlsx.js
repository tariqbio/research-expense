/**
 * exportXlsx.js — HTML-based XLS export.
 *
 * Generates a fully styled HTML document and downloads it as .xls.
 * Excel and Google Sheets open HTML-based XLS files natively with
 * full color, font, and border support — no library required.
 * This matches the PDF design exactly using the same CSS values.
 */

const BDT = v => '৳' + Number(v || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const N   = v => Number(v || 0);

// Shared CSS that mirrors the PDF stylesheet exactly
const CSS = `
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1a1a1a; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 6px 10px; font-size: 10pt; }

  /* Header band */
  .hdr-band  { background: #0d1f17; color: #28e98c; font-size: 8pt; font-weight: bold;
               text-transform: uppercase; letter-spacing: 0.08em; padding: 8px 10px; }
  .hdr-title { font-size: 16pt; font-weight: 800; color: #0d1f17; padding: 10px; }
  .hdr-sub   { font-size: 8pt; color: #6b7280; font-style: italic; padding: 4px 10px 10px; }
  .hdr-code  { display: inline; background: #e8fff4; color: #0d7a4e; border: 1px solid #a7f3d0;
               padding: 3px 8px; font-size: 9pt; font-weight: 800; border-radius: 3px; }
  .hdr-date  { font-size: 8pt; color: #6b7280; font-style: italic; text-align: right; vertical-align: top; }
  .green-bar { background: #28e98c; height: 4px; }
  .spacer    { height: 12px; }

  /* Summary cards */
  .card-label { background: #f3f4f6; color: #6b7280; font-size: 7pt; font-weight: bold;
                text-transform: uppercase; letter-spacing: 0.07em; text-align: center;
                border: 1px solid #a7f3d0; border-bottom: none; padding: 5px 8px; }
  .card-value { background: #e8fff4; font-size: 13pt; font-weight: 800; text-align: center;
                border: 1px solid #a7f3d0; border-top: 2px solid #a7f3d0; padding: 8px; }
  .c-dark    { color: #0d1f17; }
  .c-blue    { color: #0891b2; }
  .c-green   { color: #16a34a; }
  .c-amber   { color: #d97706; }
  .c-red     { color: #dc2626; }

  /* Progress bar */
  .prog-label { font-size: 8pt; color: #6b7280; padding: 4px 0; }
  .prog-track { background: #e5e7eb; height: 7px; border-radius: 4px; }
  .prog-fill  { height: 7px; border-radius: 4px; }

  /* Section headers */
  .sect-title { font-size: 9pt; font-weight: 800; color: #0d1f17;
                text-transform: uppercase; letter-spacing: 0.07em;
                border-bottom: 1.5px solid #e5e7eb; padding: 12px 0 5px; }
  .sect-count { background: #f3f4f6; color: #6b7280; font-size: 7.5pt;
                font-weight: 600; padding: 2px 8px; border-radius: 20px;
                margin-left: 8px; vertical-align: middle; }

  /* Tables */
  .data-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  .data-table thead tr { background: #0d1f17; }
  .data-table thead th { color: #fff; font-size: 8pt; font-weight: 700;
                          text-transform: uppercase; letter-spacing: 0.07em;
                          padding: 7px 10px; text-align: left; }
  .data-table thead th.num { text-align: right; }
  .data-table tbody td { padding: 6px 10px; border-bottom: 1px solid #f0f0f0;
                          font-size: 9.5pt; vertical-align: top; }
  .data-table tbody tr.alt td { background: #fafafa; }
  .data-table tfoot td { padding: 7px 10px; background: #f0fff8; font-weight: 700;
                          border-top: 2px solid #a7f3d0; font-size: 9.5pt; }
  .num  { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .bold { font-weight: 700; }
  .sub  { font-size: 8pt; color: #9ca3af; margin-top: 2px; }

  /* Badges */
  .badge-green { color: #16a34a; font-weight: 700; }
  .badge-amber { color: #d97706; font-weight: 700; background: #fefce8;
                 padding: 1px 6px; border-radius: 3px; }
  .cat-badge   { background: #e8fff4; color: #0d7a4e; border: 1px solid #a7f3d0;
                 padding: 1px 6px; border-radius: 3px; font-size: 8.5pt; white-space: nowrap; }

  /* Footer */
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e5e7eb;
            font-size: 7.5pt; color: #aaa; display: flex; justify-content: space-between; }
`;

function downloadXls(html, filename) {
  const fullHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8">
  <style>${CSS}</style>
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
  <x:ExcelWorksheet><x:Name>Expense Report</x:Name>
  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  </head><body>${html}</body></html>`;

  const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}


// ─────────────────────────────────────────────────────────────────────────────
// PROJECT DETAIL EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function exportProjectXlsx({ project, expenses, stats, getCatLabel, fmtDate, orgName = "ResearchTrack", orgShort = "" }) {
  const budget     = N(project.total_budget);
  const spent      = N(stats.total_spent);
  const reimbursed = N(stats.total_reimbursed);
  const pending    = N(stats.total_pending);
  const remaining  = budget - spent;
  const pct        = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const today      = new Date().toLocaleDateString('en-GB',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const remColor = remaining < 0 ? 'c-red' : 'c-green';
  const pctColor = pct > 90 ? 'c-red' : pct > 70 ? 'c-amber' : 'c-dark';
  const barColor = pct > 90 ? '#dc2626' : pct > 70 ? '#d97706' : '#28e98c';

  // Expense rows
  const expRows = expenses.map((e, i) => `
    <tr class="${i % 2 === 0 ? 'alt' : ''}">
      <td>${fmtDate(e.expense_date)}</td>
      <td>${e.submitted_by_name || ''}</td>
      <td><span class="cat-badge">${getCatLabel(e)}</span></td>
      <td>${e.description}${e.receipt_note ? `<div class="sub">${e.receipt_note}</div>` : ''}</td>
      <td class="num bold">${BDT(e.amount)}</td>
      <td class="${e.reimbursed ? 'badge-green' : 'badge-amber'}">${e.reimbursed ? '✓ Reimbursed' : 'Pending'}</td>
    </tr>`).join('');

  // Installment rows
  const instRows = (project.installments || []).map((inst, i) => `
    <tr class="${i % 2 === 0 ? 'alt' : ''}">
      <td>#${i + 1}</td>
      <td>${fmtDate(inst.expected_date)}</td>
      <td class="num bold">${BDT(inst.amount)}</td>
      <td class="${inst.status === 'received' ? 'badge-green' : 'badge-amber'}">${inst.status === 'received' ? '✓ Received' : 'Pending'}</td>
      <td>${inst.received_date ? fmtDate(inst.received_date) : '—'}</td>
      <td>${inst.note || '—'}</td>
    </tr>`).join('');

  // Member rows
  const memberRows = (project.members || []).map((m, i) => {
    const me = expenses.filter(e => e.submitted_by === m.id);
    const mS = me.reduce((a, e) => a + N(e.amount), 0);
    const mR = me.filter(e => e.reimbursed).reduce((a, e) => a + N(e.amount), 0);
    const mP = mS - mR;
    return `<tr class="${i % 2 === 0 ? 'alt' : ''}">
      <td class="bold">${m.name}</td>
      <td style="color:#6b7280;font-size:8.5pt">${m.email}</td>
      <td>${m.role}</td>
      <td class="num">${me.length}</td>
      <td class="num bold">${BDT(mS)}</td>
      <td class="num badge-green">${BDT(mR)}</td>
      <td class="num ${mP > 0 ? 'badge-amber' : ''}">${BDT(mP)}</td>
    </tr>`;
  }).join('');

  const html = `
  <!-- HEADER -->
  <table style="width:100%;margin-bottom:0">
    <tr>
      <td colspan="5" class="hdr-band">
        ${orgName}
      </td>
    </tr>
    <tr>
      <td colspan="4" style="padding:10px 10px 4px;background:#fff">
        <span class="hdr-code">${project.code}</span>
      </td>
      <td class="hdr-date" style="background:#fff;padding:10px 10px 4px">${today}</td>
    </tr>
    <tr>
      <td colspan="5" class="hdr-title">${project.name}</td>
    </tr>
    ${project.description ? `<tr><td colspan="5" class="hdr-sub">${project.description}</td></tr>` : ''}
    <tr><td colspan="5" class="green-bar"></td></tr>
  </table>

  <!-- SUMMARY CARDS -->
  <table style="width:100%;margin-top:14px;margin-bottom:2px">
    <tr>
      <td class="card-label">Total Budget</td>
      <td class="card-label">Total Spent</td>
      <td class="card-label">Reimbursed</td>
      <td class="card-label">Pending</td>
      <td class="card-label">Remaining</td>
      <td class="card-label">Utilised</td>
    </tr>
    <tr>
      <td class="card-value c-dark">${BDT(budget)}</td>
      <td class="card-value c-blue">${BDT(spent)}</td>
      <td class="card-value c-green">${BDT(reimbursed)}</td>
      <td class="card-value c-amber">${BDT(pending)}</td>
      <td class="card-value ${remColor}">${BDT(remaining)}</td>
      <td class="card-value ${pctColor}">${pct.toFixed(1)}%</td>
    </tr>
  </table>

  <!-- PROGRESS -->
  <table style="width:100%;margin-top:10px;margin-bottom:4px">
    <tr>
      <td class="prog-label">Budget Utilisation</td>
      <td class="prog-label" style="text-align:right">${BDT(spent)} of ${BDT(budget)}</td>
    </tr>
    <tr>
      <td colspan="2" style="padding:0 0 8px">
        <div class="prog-track">
          <div class="prog-fill" style="width:${pct.toFixed(1)}%;background:${barColor}"></div>
        </div>
      </td>
    </tr>
  </table>

  <!-- EXPENSE RECORDS -->
  <div class="sect-title">Expense Records <span class="sect-count">${expenses.length} entries</span></div>
  <table class="data-table">
    <thead><tr>
      <th>Date</th><th>Researcher</th><th>Category</th>
      <th>Description</th><th class="num">Amount</th><th>Status</th>
    </tr></thead>
    <tbody>${expRows || '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:14px">No expenses recorded</td></tr>'}</tbody>
    <tfoot><tr>
      <td colspan="4">Total — ${expenses.length} record${expenses.length !== 1 ? 's' : ''}</td>
      <td class="num">${BDT(spent)}</td>
      <td><span class="badge-green">${BDT(reimbursed)} paid</span> &nbsp;·&nbsp; <span class="badge-amber">${BDT(pending)} pending</span></td>
    </tr></tfoot>
  </table>

  ${(project.installments || []).length > 0 ? `
  <!-- FUND INSTALLMENTS -->
  <div class="sect-title" style="margin-top:20px">Fund Installments
    <span class="sect-count">${project.installments.length} installment${project.installments.length !== 1 ? 's' : ''}</span>
  </div>
  <table class="data-table">
    <thead><tr>
      <th>#</th><th>Expected Date</th><th class="num">Amount</th>
      <th>Status</th><th>Date Received</th><th>Note</th>
    </tr></thead>
    <tbody>${instRows}</tbody>
  </table>` : ''}

  <!-- MEMBER SUMMARY -->
  <div class="sect-title" style="margin-top:20px">Member Summary
    <span class="sect-count">${(project.members || []).length} members</span>
  </div>
  <table class="data-table">
    <thead><tr>
      <th>Name</th><th>Email</th><th>Role</th>
      <th class="num">Expenses</th><th class="num">Total</th>
      <th class="num">Reimbursed</th><th class="num">Pending</th>
    </tr></thead>
    <tbody>${memberRows}</tbody>
  </table>

  <!-- FOOTER -->
  <table style="width:100%;margin-top:20px;border-top:1px solid #e5e7eb">
    <tr>
      <td style="font-size:7.5pt;color:#aaa;padding:6px 0">
        ResearchTrack · ${orgName}
      </td>
      <td style="font-size:7.5pt;color:#aaa;padding:6px 0;text-align:right">
        Developed by Tariqul Islam &nbsp;·&nbsp; © 2025 ${orgShort}
      </td>
    </tr>
  </table>`;

  const date = new Date().toISOString().split('T')[0];
  downloadXls(html, `${project.code}-Report-${date}.xls`);
}


// ─────────────────────────────────────────────────────────────────────────────
// ALL-EXPENSES PAGE EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function exportExpensesXlsx({ displayed, totals, filters, projects, search, user, getCatLabel, fmtDate, CAT_LABELS, orgName = "ResearchTrack", orgShort = "" }) {
  const today    = new Date().toLocaleDateString('en-GB',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const rate     = totals.total > 0
    ? (totals.reimbursed / totals.total * 100).toFixed(1) + '%' : '0.0%';

  // Active filters
  const af = [];
  if (filters.project_id) {
    const p = projects.find(p => String(p.id) === String(filters.project_id));
    if (p) af.push(`Project: ${p.code}`);
  }
  if (filters.reimbursed === 'true')  af.push('Status: Reimbursed');
  if (filters.reimbursed === 'false') af.push('Status: Pending');
  if (filters.category)  af.push(`Category: ${CAT_LABELS[filters.category] || filters.category}`);
  if (filters.from_date) af.push(`From: ${fmtDate(filters.from_date)}`);
  if (filters.to_date)   af.push(`To: ${fmtDate(filters.to_date)}`);
  if (search) af.push(`Search: "${search}"`);

  const expRows = displayed.map((e, i) => `
    <tr class="${i % 2 === 0 ? 'alt' : ''}">
      <td>${fmtDate(e.expense_date)}</td>
      <td>
        <div style="font-weight:700;font-size:8.5pt">${e.project_code || ''}</div>
        <div class="sub">${e.project_name || ''}</div>
      </td>
      <td>${e.submitted_by_name || ''}</td>
      <td><span class="cat-badge">${getCatLabel(e)}</span></td>
      <td>${e.description}${e.receipt_note ? `<div class="sub">${e.receipt_note}</div>` : ''}</td>
      <td class="num bold">${BDT(e.amount)}</td>
      <td class="${e.reimbursed ? 'badge-green' : 'badge-amber'}">${e.reimbursed ? '✓ Reimbursed' : 'Pending'}</td>
    </tr>`).join('');

  const html = `
  <!-- HEADER -->
  <table style="width:100%">
    <tr><td colspan="2" class="hdr-band">
      ${orgName}
    </td></tr>
    <tr>
      <td style="padding:10px 10px 6px;font-size:16pt;font-weight:800;color:#0d1f17">
        Research Expense Report
      </td>
      <td style="padding:10px 10px 6px;font-size:8pt;color:#6b7280;text-align:right;vertical-align:bottom;font-style:italic">
        ${today}
      </td>
    </tr>
    <tr><td colspan="2" class="green-bar"></td></tr>
  </table>

  <!-- SUMMARY CARDS -->
  <table style="width:100%;margin-top:14px;margin-bottom:2px">
    <tr>
      <td class="card-label" colspan="2">Total Expenses</td>
      <td class="card-label" colspan="2">Reimbursed</td>
      <td class="card-label" colspan="2">Pending</td>
      <td class="card-label">Reimbursement Rate</td>
    </tr>
    <tr>
      <td class="card-value c-dark" colspan="2">${BDT(totals.total)}</td>
      <td class="card-value c-green" colspan="2">${BDT(totals.reimbursed)}</td>
      <td class="card-value c-amber" colspan="2">${BDT(totals.pending)}</td>
      <td class="card-value c-blue">${rate}</td>
    </tr>
  </table>

  <!-- META -->
  <table style="width:100%;margin-top:12px;border-collapse:collapse">
    <tr>
      <td style="background:#f3f4f6;border:1px solid #e5e7eb;padding:5px 10px;font-size:8pt;font-weight:bold;color:#6b7280;width:120px">Generated by</td>
      <td style="background:#fff;border:1px solid #e5e7eb;padding:5px 10px;font-size:8pt">${user?.name || ''}</td>
      <td style="background:#f3f4f6;border:1px solid #e5e7eb;padding:5px 10px;font-size:8pt;font-weight:bold;color:#6b7280;width:100px">Records</td>
      <td style="background:#fff;border:1px solid #e5e7eb;padding:5px 10px;font-size:8pt;font-weight:bold">${displayed.length}</td>
    </tr>
    ${af.length ? `<tr>
      <td style="background:#f3f4f6;border:1px solid #e5e7eb;padding:5px 10px;font-size:8pt;font-weight:bold;color:#6b7280">Filters</td>
      <td colspan="3" style="background:#fff;border:1px solid #e5e7eb;padding:5px 10px;font-size:8pt">${af.join('  ·  ')}</td>
    </tr>` : ''}
  </table>

  <!-- EXPENSE RECORDS -->
  <div class="sect-title" style="margin-top:20px">Expense Records
    <span class="sect-count">${displayed.length} records</span>
  </div>
  <table class="data-table">
    <thead><tr>
      <th>Date</th><th>Project</th><th>Submitted By</th>
      <th>Category</th><th>Description</th><th class="num">Amount</th><th>Status</th>
    </tr></thead>
    <tbody>${expRows || '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:14px">No expense records</td></tr>'}</tbody>
    <tfoot><tr>
      <td colspan="5">Total &nbsp;·&nbsp; ${displayed.length} records</td>
      <td class="num">${BDT(totals.total)}</td>
      <td><span class="badge-green">${BDT(totals.reimbursed)} reimb</span> &nbsp;·&nbsp; <span class="badge-amber">${BDT(totals.pending)} pending</span></td>
    </tr></tfoot>
  </table>

  <!-- FOOTER -->
  <table style="width:100%;margin-top:20px;border-top:1px solid #e5e7eb">
    <tr>
      <td style="font-size:7.5pt;color:#aaa;padding:6px 0">
        ResearchTrack · ${orgName}
      </td>
      <td style="font-size:7.5pt;color:#aaa;padding:6px 0;text-align:right">
        Developed by Tariqul Islam &nbsp;·&nbsp; © 2025 ${orgShort}
      </td>
    </tr>
  </table>`;

  const date = new Date().toISOString().split('T')[0];
  downloadXls(html, `Expenses-Report-${date}.xls`);
}
