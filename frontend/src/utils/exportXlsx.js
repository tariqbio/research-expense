/**
 * exportXlsx.js — HTML-based XLS export.
 * Downloads a styled HTML document as .xls — opens in Excel & Google Sheets.
 *
 * Design principles:
 *  - Inter font (via Google Fonts embed)
 *  - Nothing smaller than 10pt anywhere
 *  - Generous padding and vertical rhythm — no cramped rows
 *  - Clear column labels with consistent alignment
 *  - Strong visual hierarchy: header → cards → section → table
 */

const BDT = v => '৳' + Number(v || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const N   = v => Number(v || 0);

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    color: #111827;
    background: #ffffff;
    padding: 32px 36px;
    max-width: 960px;
    margin: 0 auto;
    line-height: 1.5;
  }

  /* ── Header ─────────────────────────────────────────────────── */
  .hdr-institution {
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #28e98c;
    background: #0d1f17;
    padding: 10px 20px;
    border-radius: 6px 6px 0 0;
  }

  .hdr-body {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-top: none;
    padding: 20px 20px 24px;
    border-radius: 0 0 6px 6px;
    margin-bottom: 28px;
  }

  .hdr-code-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .hdr-code {
    display: inline-block;
    background: #e8fff4;
    color: #0d7a4e;
    border: 1.5px solid #a7f3d0;
    padding: 4px 12px;
    font-size: 10pt;
    font-weight: 800;
    border-radius: 4px;
    letter-spacing: 0.04em;
  }

  .hdr-report-label {
    font-size: 10pt;
    color: #6b7280;
    font-style: italic;
  }

  .hdr-title {
    font-size: 18pt;
    font-weight: 800;
    color: #0d1f17;
    line-height: 1.25;
    margin-bottom: 8px;
  }

  .hdr-desc {
    font-size: 11pt;
    color: #6b7280;
    margin-top: 4px;
  }

  .hdr-date {
    font-size: 10pt;
    color: #6b7280;
    margin-top: 6px;
  }

  .green-divider {
    height: 4px;
    background: #28e98c;
    border-radius: 2px;
    margin: 0 0 28px;
  }

  /* ── Summary Cards ──────────────────────────────────────────── */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0;
    border: 1.5px solid #a7f3d0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 24px;
  }

  .card {
    padding: 14px 16px 16px;
    background: #f0fff8;
    border-right: 1px solid #a7f3d0;
    text-align: center;
  }
  .card:last-child { border-right: none; }

  .card-label {
    font-size: 10pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7280;
    margin-bottom: 6px;
    white-space: nowrap;
  }

  .card-value {
    font-size: 14pt;
    font-weight: 800;
    line-height: 1.1;
  }

  .c-dark  { color: #0d1f17; }
  .c-blue  { color: #0891b2; }
  .c-green { color: #16a34a; }
  .c-amber { color: #d97706; }
  .c-red   { color: #dc2626; }

  /* ── Progress ───────────────────────────────────────────────── */
  .progress-wrap {
    margin-bottom: 32px;
  }
  .progress-meta {
    display: flex;
    justify-content: space-between;
    font-size: 10pt;
    color: #6b7280;
    margin-bottom: 6px;
    font-weight: 500;
  }
  .progress-track {
    background: #e5e7eb;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 8px;
    border-radius: 4px;
  }

  /* ── Sections ───────────────────────────────────────────────── */
  .section {
    margin-bottom: 36px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 10px;
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 12px;
  }

  .section-title {
    font-size: 11pt;
    font-weight: 800;
    color: #0d1f17;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .section-badge {
    background: #f3f4f6;
    color: #6b7280;
    font-size: 10pt;
    font-weight: 600;
    padding: 2px 10px;
    border-radius: 20px;
    border: 1px solid #e5e7eb;
  }

  /* ── Tables ─────────────────────────────────────────────────── */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
  }

  .data-table thead tr {
    background: #0d1f17;
  }

  .data-table thead th {
    color: #ffffff;
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 11px 14px;
    text-align: left;
    white-space: nowrap;
    border-right: 1px solid #1a3028;
  }

  .data-table thead th:last-child { border-right: none; }
  .data-table thead th.num { text-align: right; }

  .data-table tbody td {
    padding: 11px 14px;
    font-size: 11pt;
    color: #111827;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
    border-right: 1px solid #f3f4f6;
  }

  .data-table tbody td:last-child { border-right: none; }

  .data-table tbody tr:last-child td { border-bottom: none; }

  .data-table tbody tr.alt td {
    background: #fafafa;
  }

  .data-table tfoot td {
    padding: 12px 14px;
    background: #f0fff8;
    font-weight: 700;
    font-size: 11pt;
    border-top: 2px solid #a7f3d0;
    color: #0d1f17;
  }

  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .bold { font-weight: 700; }

  .td-sub {
    font-size: 10pt;
    color: #9ca3af;
    margin-top: 3px;
    font-weight: 400;
  }

  /* ── Status Badges ──────────────────────────────────────────── */
  .badge-green {
    display: inline-block;
    color: #16a34a;
    font-weight: 700;
    font-size: 11pt;
  }

  .badge-amber {
    display: inline-block;
    color: #d97706;
    font-weight: 700;
    font-size: 11pt;
    background: #fefce8;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .cat-badge {
    display: inline-block;
    background: #e8fff4;
    color: #0d7a4e;
    border: 1px solid #a7f3d0;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10pt;
    font-weight: 600;
    white-space: nowrap;
  }

  /* ── Footer ─────────────────────────────────────────────────── */
  .report-footer {
    margin-top: 36px;
    padding-top: 14px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    font-size: 10pt;
    color: #9ca3af;
  }
`;

function downloadXls(html, filename) {
  const fullHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="UTF-8">
    <style>${CSS}</style>
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
    <x:ExcelWorksheet><x:Name>Expense Report</x:Name>
    <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  </head>
  <body>${html}</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}


// ─────────────────────────────────────────────────────────────────────────────
//  PROJECT DETAIL EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function exportProjectXlsx({ project, expenses, stats, getCatLabel, fmtDate }) {
  const budget     = N(project.total_budget);
  const spent      = N(stats.total_spent);
  const reimbursed = N(stats.total_reimbursed);
  const pending    = N(stats.total_pending);
  const remaining  = budget - spent;
  const pct        = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const today      = new Date().toLocaleDateString('en-GB',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const remColor  = remaining < 0 ? 'c-red' : 'c-green';
  const pctColor  = pct > 90 ? 'c-red' : pct > 70 ? 'c-amber' : 'c-dark';
  const barColor  = pct > 90 ? '#dc2626' : pct > 70 ? '#d97706' : '#28e98c';

  // Expense rows
  const expRows = expenses.map((e, i) => `
    <tr class="${i % 2 === 0 ? 'alt' : ''}">
      <td style="white-space:nowrap">${fmtDate(e.expense_date)}</td>
      <td>${e.submitted_by_name || '—'}
          ${e.reimbursed ? `<div class="td-sub">Paid ${fmtDate(e.reimbursed_at)}</div>` : ''}
      </td>
      <td><span class="cat-badge">${getCatLabel(e)}</span></td>
      <td>${e.description}
          ${e.receipt_note ? `<div class="td-sub">${e.receipt_note}</div>` : ''}
      </td>
      <td class="num bold">${BDT(e.amount)}</td>
      <td>
        ${e.reimbursed
          ? '<span class="badge-green">✓ Reimbursed</span>'
          : '<span class="badge-amber">Pending</span>'}
      </td>
    </tr>`).join('');

  // Installment rows
  const instRows = (project.installments || []).map((inst, i) => `
    <tr class="${i % 2 === 0 ? 'alt' : ''}">
      <td style="font-weight:600;color:#6b7280">#${i + 1}</td>
      <td>${fmtDate(inst.expected_date)}</td>
      <td class="num bold">${BDT(inst.amount)}</td>
      <td>${inst.status === 'received'
            ? '<span class="badge-green">✓ Received</span>'
            : '<span class="badge-amber">Pending</span>'}
      </td>
      <td>${inst.received_date ? fmtDate(inst.received_date) : '—'}</td>
      <td style="color:#6b7280">${inst.note || '—'}</td>
    </tr>`).join('');

  // Member rows
  const memberRows = (project.members || []).map((m, i) => {
    const me = expenses.filter(e => e.submitted_by === m.id);
    const mS = me.reduce((a, e) => a + N(e.amount), 0);
    const mR = me.filter(e => e.reimbursed).reduce((a, e) => a + N(e.amount), 0);
    const mP = mS - mR;
    return `<tr class="${i % 2 === 0 ? 'alt' : ''}">
      <td class="bold">${m.name}</td>
      <td style="color:#6b7280">${m.email}</td>
      <td style="color:#6b7280">${m.role}</td>
      <td class="num">${me.length}</td>
      <td class="num bold">${BDT(mS)}</td>
      <td class="num badge-green">${BDT(mR)}</td>
      <td class="num ${mP > 0 ? 'badge-amber' : 'c-green'}">${BDT(mP)}</td>
    </tr>`;
  }).join('');

  const html = `
  <!-- HEADER -->
  <div class="hdr-institution">
    Daffodil International University &nbsp;·&nbsp; Faculty of Graduate Studies
  </div>
  <div class="hdr-body">
    <div class="hdr-code-row">
      <span class="hdr-code">${project.code}</span>
      <span class="hdr-report-label">Expense Report</span>
    </div>
    <div class="hdr-title">${project.name}</div>
    ${project.description ? `<div class="hdr-desc">${project.description}</div>` : ''}
    <div class="hdr-date">${today}</div>
  </div>

  <!-- SUMMARY CARDS -->
  <div class="cards-grid">
    <div class="card">
      <div class="card-label">Total Budget</div>
      <div class="card-value c-dark">${BDT(budget)}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Spent</div>
      <div class="card-value c-blue">${BDT(spent)}</div>
    </div>
    <div class="card">
      <div class="card-label">Reimbursed</div>
      <div class="card-value c-green">${BDT(reimbursed)}</div>
    </div>
    <div class="card">
      <div class="card-label">Pending</div>
      <div class="card-value c-amber">${BDT(pending)}</div>
    </div>
    <div class="card">
      <div class="card-label">Remaining</div>
      <div class="card-value ${remColor}">${BDT(remaining)}</div>
    </div>
    <div class="card">
      <div class="card-label">Utilised</div>
      <div class="card-value ${pctColor}">${pct.toFixed(1)}%</div>
    </div>
  </div>

  <!-- PROGRESS BAR -->
  <div class="progress-wrap">
    <div class="progress-meta">
      <span>Budget Utilisation</span>
      <span>${BDT(spent)} of ${BDT(budget)}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" style="width:${pct.toFixed(1)}%;background:${barColor}"></div>
    </div>
  </div>

  <!-- EXPENSE RECORDS -->
  <div class="section">
    <div class="section-header">
      <span class="section-title">Expense Records</span>
      <span class="section-badge">${expenses.length} entr${expenses.length === 1 ? 'y' : 'ies'}</span>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:90px">Date</th>
          <th style="width:140px">Researcher</th>
          <th style="width:130px">Category</th>
          <th>Description</th>
          <th class="num" style="width:110px">Amount</th>
          <th style="width:120px">Status</th>
        </tr>
      </thead>
      <tbody>
        ${expRows || '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px">No expenses recorded</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4">Total &mdash; ${expenses.length} record${expenses.length !== 1 ? 's' : ''}</td>
          <td class="num">${BDT(spent)}</td>
          <td>
            <span class="badge-green">${BDT(reimbursed)} paid</span>
            &nbsp;·&nbsp;
            <span class="badge-amber">${BDT(pending)} pending</span>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>

  ${(project.installments || []).length > 0 ? `
  <!-- FUND INSTALLMENTS -->
  <div class="section">
    <div class="section-header">
      <span class="section-title">Fund Installments</span>
      <span class="section-badge">${project.installments.length} installment${project.installments.length !== 1 ? 's' : ''}</span>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th style="width:130px">Expected Date</th>
          <th class="num" style="width:130px">Amount</th>
          <th style="width:120px">Status</th>
          <th style="width:130px">Date Received</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>${instRows}</tbody>
    </table>
  </div>` : ''}

  <!-- MEMBER SUMMARY -->
  <div class="section">
    <div class="section-header">
      <span class="section-title">Member Summary</span>
      <span class="section-badge">${(project.members || []).length} member${(project.members || []).length !== 1 ? 's' : ''}</span>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:160px">Name</th>
          <th>Email</th>
          <th style="width:110px">Role</th>
          <th class="num" style="width:90px">Expenses</th>
          <th class="num" style="width:120px">Total</th>
          <th class="num" style="width:130px">Reimbursed</th>
          <th class="num" style="width:110px">Pending</th>
        </tr>
      </thead>
      <tbody>${memberRows}</tbody>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="report-footer">
    <span>ResearchTrack v2.0 &nbsp;·&nbsp; Faculty of Graduate Studies, Daffodil International University</span>
    <span>Developed by Tariqul Islam &nbsp;·&nbsp; &copy; 2025 FGS, DIU</span>
  </div>`;

  const date = new Date().toISOString().split('T')[0];
  downloadXls(html, `${project.code}-Report-${date}.xls`);
}


// ─────────────────────────────────────────────────────────────────────────────
//  ALL-EXPENSES PAGE EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function exportExpensesXlsx({ displayed, totals, filters, projects, search, user, getCatLabel, fmtDate, CAT_LABELS }) {
  const today = new Date().toLocaleDateString('en-GB',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const rate  = totals.total > 0
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
      <td style="white-space:nowrap">${fmtDate(e.expense_date)}</td>
      <td>
        <div style="font-weight:700">${e.project_code || '—'}</div>
        <div class="td-sub">${e.project_name || ''}</div>
      </td>
      <td>${e.submitted_by_name || '—'}</td>
      <td><span class="cat-badge">${getCatLabel(e)}</span></td>
      <td>${e.description}
          ${e.receipt_note ? `<div class="td-sub">${e.receipt_note}</div>` : ''}
      </td>
      <td class="num bold">${BDT(e.amount)}</td>
      <td>
        ${e.reimbursed
          ? '<span class="badge-green">✓ Reimbursed</span>'
          : '<span class="badge-amber">Pending</span>'}
      </td>
    </tr>`).join('');

  const html = `
  <!-- HEADER -->
  <div class="hdr-institution">
    Daffodil International University &nbsp;·&nbsp; Faculty of Graduate Studies
  </div>
  <div class="hdr-body">
    <div class="hdr-code-row">
      <div class="hdr-title" style="margin-bottom:0">Research Expense Report</div>
      <span class="hdr-report-label">${today}</span>
    </div>
    <div class="hdr-date" style="margin-top:6px">Exported by: <strong>${user?.name || ''}</strong></div>
  </div>

  <!-- SUMMARY CARDS -->
  <div class="cards-grid" style="grid-template-columns:repeat(4,1fr)">
    <div class="card">
      <div class="card-label">Total Expenses</div>
      <div class="card-value c-dark">${BDT(totals.total)}</div>
    </div>
    <div class="card">
      <div class="card-label">Reimbursed</div>
      <div class="card-value c-green">${BDT(totals.reimbursed)}</div>
    </div>
    <div class="card">
      <div class="card-label">Pending</div>
      <div class="card-value c-amber">${BDT(totals.pending)}</div>
    </div>
    <div class="card">
      <div class="card-label">Reimbursement Rate</div>
      <div class="card-value c-blue">${rate}</div>
    </div>
  </div>

  ${af.length ? `
  <!-- ACTIVE FILTERS -->
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px 16px;margin-bottom:28px;font-size:10.5pt;color:#374151">
    <strong style="color:#0d1f17">Active Filters:</strong>&nbsp;&nbsp;${af.join('&nbsp;&nbsp;·&nbsp;&nbsp;')}
  </div>` : '<div style="margin-bottom:28px"></div>'}

  <!-- EXPENSE RECORDS -->
  <div class="section">
    <div class="section-header">
      <span class="section-title">Expense Records</span>
      <span class="section-badge">${displayed.length} record${displayed.length !== 1 ? 's' : ''}</span>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:90px">Date</th>
          <th style="width:120px">Project</th>
          <th style="width:140px">Submitted By</th>
          <th style="width:130px">Category</th>
          <th>Description</th>
          <th class="num" style="width:110px">Amount</th>
          <th style="width:120px">Status</th>
        </tr>
      </thead>
      <tbody>
        ${expRows || '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:20px">No expense records</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5">Total &nbsp;·&nbsp; ${displayed.length} record${displayed.length !== 1 ? 's' : ''}</td>
          <td class="num">${BDT(totals.total)}</td>
          <td>
            <span class="badge-green">${BDT(totals.reimbursed)} reimb</span>
            &nbsp;·&nbsp;
            <span class="badge-amber">${BDT(totals.pending)} pending</span>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="report-footer">
    <span>ResearchTrack v2.0 &nbsp;·&nbsp; Faculty of Graduate Studies, Daffodil International University</span>
    <span>Developed by Tariqul Islam &nbsp;·&nbsp; &copy; 2025 FGS, DIU</span>
  </div>`;

  const date = new Date().toISOString().split('T')[0];
  downloadXls(html, `Expenses-Report-${date}.xls`);
}
