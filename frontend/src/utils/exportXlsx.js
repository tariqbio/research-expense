/**
 * exportXlsx.js — Professional XLSX report generator using SheetJS (xlsx ^0.18)
 * Produces fully formatted workbooks: merged cells, colors, borders, column widths.
 */
import * as XLSX from 'xlsx';

// ── Brand colors (ARGB — no leading #) ──────────────────────────────────────
const C = {
  DARK:     'FF0D1F17',   // header bg
  GREEN:    'FF28E98C',   // accent green
  GREEN_BG: 'FFE8FFF4',   // light green bg
  GREEN_BD: 'FFA7F3D0',   // green border
  AMBER:    'FFD97706',
  AMBER_BG: 'FFFEFCE8',
  SUCCESS:  'FF16A34A',
  RED:      'FFDC2626',
  BLUE:     'FF0891B2',
  WHITE:    'FFFFFFFF',
  GRAY_HDR: 'FFF3F4F6',   // section subheader bg
  GRAY_BD:  'FFE5E7EB',
  GRAY_TXT: 'FF6B7280',
  ROW_ALT:  'FFFAFAFA',
  TOTAL_BG: 'FFF0FFF8',
};

// ── Style helpers ────────────────────────────────────────────────────────────
const font   = (opts = {}) => ({ name: 'Segoe UI', sz: opts.sz || 10, ...opts });
const fill   = bg => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: bg } });
const border = (color = C.GRAY_BD, style = 'thin') => ({
  top:    { style, color: { argb: color } },
  bottom: { style, color: { argb: color } },
  left:   { style, color: { argb: color } },
  right:  { style, color: { argb: color } },
});
const align  = (h = 'left', v = 'middle', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap });

// ── Apply style to a range of cells ──────────────────────────────────────────
function styleRange(ws, r1c1, r2c2, style) {
  const { r: r1, c: c1 } = XLSX.utils.decode_cell(r1c1);
  const { r: r2, c: c2 } = XLSX.utils.decode_cell(r2c2);
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { t: 'z', v: '' };
      ws[addr].s = { ...(ws[addr].s || {}), ...style };
    }
  }
}

// ── Set a single cell ─────────────────────────────────────────────────────────
function setCell(ws, addr, value, style = {}, type = null) {
  const t = type || (typeof value === 'number' ? 'n' : 's');
  ws[addr] = { t, v: value ?? '', s: style };
}

// ── Add a merge ───────────────────────────────────────────────────────────────
function merge(ws, r1, c1, r2, c2) {
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
}

// ── Format number as BDT string ───────────────────────────────────────────────
const bdt = n => Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = n => Number(n || 0);

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT DETAIL EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function exportProjectXlsx({ project, expenses, stats, getCatLabel, fmtDate }) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ────────────────────────────────────────────────────────
  {
    const ws = {};
    let row = 0;

    // Title bar
    setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), 'PROJECT EXPENSE REPORT', {
      font: font({ bold: true, sz: 14, color: { argb: C.WHITE } }),
      fill: fill(C.DARK), alignment: align('left', 'middle'),
    });
    merge(ws, row, 0, row, 7);
    row++;

    setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), 'Faculty of Graduate Studies · Daffodil International University', {
      font: font({ sz: 9, color: { argb: C.GREEN }, bold: true }),
      fill: fill(C.DARK), alignment: align('left', 'middle'),
    });
    merge(ws, row, 0, row, 7);
    row += 2;

    // Project info block
    const info = [
      ['Project Code',   project.code],
      ['Project Title',  project.name],
      ['Description',    project.description || '—'],
      ['Status',         project.status],
      ['Payment Type',   project.payment_type],
      ['Start Date',     fmtDate(project.start_date)],
      ['End Date',       fmtDate(project.end_date)],
      ['Report Date',    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
    ];
    info.forEach(([label, val]) => {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), label, {
        font: font({ bold: true, color: { argb: C.GRAY_TXT } }),
        fill: fill(C.GRAY_HDR), alignment: align('left', 'middle'),
        border: border(),
      });
      setCell(ws, XLSX.utils.encode_cell({ r: row, c: 1 }), val, {
        font: font({ bold: label === 'Project Code' }),
        fill: fill(C.WHITE), alignment: align('left', 'middle', true),
        border: border(),
      });
      merge(ws, row, 1, row, 4);
      row++;
    });
    row++;

    // Financial summary header
    setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), 'FINANCIAL SUMMARY', {
      font: font({ bold: true, sz: 11, color: { argb: C.WHITE } }),
      fill: fill(C.DARK), alignment: align('left', 'middle'),
    });
    merge(ws, row, 0, row, 7);
    row++;

    const budget    = num(project.total_budget);
    const spent     = num(stats.total_spent);
    const reimbursed= num(stats.total_reimbursed);
    const pending   = num(stats.total_pending);
    const remaining = budget - spent;
    const pct       = budget > 0 ? (spent / budget * 100) : 0;

    const summaryLabels = ['Total Budget', 'Total Spent', 'Reimbursed', 'Pending', 'Remaining', 'Utilised %'];
    const summaryValues = [bdt(budget), bdt(spent), bdt(reimbursed), bdt(pending), bdt(remaining), pct.toFixed(1) + '%'];
    const summaryColors = [C.DARK, C.BLUE, C.SUCCESS, C.AMBER, remaining < 0 ? C.RED : C.SUCCESS, pct > 90 ? C.RED : pct > 70 ? C.AMBER : C.SUCCESS];

    summaryLabels.forEach((lbl, i) => {
      const c = i;
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), lbl, {
        font: font({ bold: true, sz: 8, color: { argb: C.GRAY_TXT } }),
        fill: fill(C.GRAY_HDR), alignment: align('center', 'middle'),
        border: border(),
      });
    });
    row++;
    summaryValues.forEach((val, i) => {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c: i }), val, {
        font: font({ bold: true, sz: 12, color: { argb: summaryColors[i] } }),
        fill: fill(C.GREEN_BG), alignment: align('center', 'middle'),
        border: border(C.GREEN_BD),
      });
    });
    row += 2;

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: 7 } });
    ws['!cols'] = [18, 30, 18, 18, 18, 18, 18, 18].map(w => ({ wch: w }));
    ws['!rows'] = [{ hpt: 26 }, { hpt: 18 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  }

  // ── Sheet 2: Expense Records ─────────────────────────────────────────────────
  {
    const ws = {};
    let row = 0;

    // Sheet title
    setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), 'EXPENSE RECORDS', {
      font: font({ bold: true, sz: 13, color: { argb: C.WHITE } }),
      fill: fill(C.DARK), alignment: align('left', 'middle'),
    });
    merge(ws, row, 0, row, 10);
    row++;

    setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }),
      `${project.code} — ${project.name}  ·  ${expenses.length} record${expenses.length !== 1 ? 's' : ''}`, {
      font: font({ sz: 9, color: { argb: C.GREEN }, bold: true }),
      fill: fill(C.DARK), alignment: align('left', 'middle'),
    });
    merge(ws, row, 0, row, 10);
    row += 2;

    // Column headers
    const hdrs = ['#', 'Date', 'Researcher', 'Category', 'Description', 'Receipt / Note', 'Amount (BDT)', 'Status', 'Reimb. By', 'Reimb. On', 'Source'];
    hdrs.forEach((h, c) => {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), h, {
        font: font({ bold: true, sz: 9, color: { argb: C.WHITE } }),
        fill: fill(C.DARK), alignment: align(c >= 6 ? 'right' : 'left', 'middle'),
        border: border(C.GREEN_BD),
      });
    });
    row++;

    const dataStartRow = row;

    // Data rows
    expenses.forEach((e, i) => {
      const isAlt = i % 2 === 0;
      const bg = isAlt ? C.ROW_ALT : C.WHITE;
      const rowData = [
        i + 1,
        fmtDate(e.expense_date),
        e.submitted_by_name || '',
        getCatLabel(e),
        e.description || '',
        e.receipt_note || '',
        num(e.amount),
        e.reimbursed ? 'Reimbursed' : 'Pending',
        e.reimbursed ? (e.reimbursed_by_name || '') : '',
        e.reimbursed ? fmtDate(e.reimbursed_at) : '',
        e.reimbursed ? (e.reimbursed_from === 'university' ? 'University' : 'Project') : '',
      ];
      rowData.forEach((val, c) => {
        const isAmt = c === 6;
        const isStatus = c === 7;
        const statusColor = e.reimbursed ? C.SUCCESS : C.AMBER;
        setCell(ws, XLSX.utils.encode_cell({ r: row, c }), val, {
          font: font({
            color: { argb: isStatus ? statusColor : isAmt ? C.DARK : 'FF1A1A1A' },
            bold: isAmt || isStatus,
          }),
          fill: fill(bg),
          alignment: align(isAmt ? 'right' : 'left', 'middle', c === 4 || c === 5),
          border: border(),
          numFmt: isAmt ? '#,##0.00' : undefined,
        }, isAmt ? 'n' : 's');
      });
      row++;
    });

    // Totals row
    const totalAmt  = expenses.reduce((a, e) => a + num(e.amount), 0);
    const reimb     = expenses.filter(e => e.reimbursed).reduce((a, e) => a + num(e.amount), 0);
    const pend      = expenses.filter(e => !e.reimbursed).reduce((a, e) => a + num(e.amount), 0);

    const totalRowData = ['', '', '', '', `${expenses.length} records`, 'TOTAL', totalAmt, `${bdt(reimb)} reimbursed`, `${bdt(pend)} pending`, '', ''];
    totalRowData.forEach((val, c) => {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), val, {
        font: font({ bold: true, color: { argb: c === 5 ? C.DARK : c === 6 ? C.DARK : C.GRAY_TXT } }),
        fill: fill(C.TOTAL_BG),
        alignment: align(c === 6 ? 'right' : 'left', 'middle'),
        border: border(C.GREEN_BD, 'medium'),
        numFmt: c === 6 ? '#,##0.00' : undefined,
      }, c === 6 ? 'n' : 's');
    });

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row + 1, c: 10 } });
    ws['!cols'] = [4, 12, 18, 20, 34, 22, 14, 13, 16, 14, 12].map(w => ({ wch: w }));
    ws['!rows'] = [{ hpt: 26 }, { hpt: 18 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  }

  // ── Sheet 3: Installments ───────────────────────────────────────────────────
  if (project.installments && project.installments.length > 0) {
    const ws = {};
    let row = 0;

    setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), 'FUND INSTALLMENTS', {
      font: font({ bold: true, sz: 13, color: { argb: C.WHITE } }),
      fill: fill(C.DARK), alignment: align('left', 'middle'),
    });
    merge(ws, row, 0, row, 5);
    row += 2;

    ['#', 'Expected Date', 'Amount (BDT)', 'Status', 'Date Received', 'Note'].forEach((h, c) => {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), h, {
        font: font({ bold: true, sz: 9, color: { argb: C.WHITE } }),
        fill: fill(C.DARK), alignment: align('left', 'middle'),
        border: border(C.GREEN_BD),
      });
    });
    row++;

    project.installments.forEach((inst, i) => {
      const isAlt = i % 2 === 0;
      const isReceived = inst.status === 'received';
      const rowData = [
        i + 1, fmtDate(inst.expected_date), num(inst.amount),
        isReceived ? 'Received' : 'Pending',
        inst.received_date ? fmtDate(inst.received_date) : '',
        inst.note || '',
      ];
      rowData.forEach((val, c) => {
        const isAmt = c === 2, isStatus = c === 3;
        setCell(ws, XLSX.utils.encode_cell({ r: row, c }), val, {
          font: font({ bold: isStatus, color: { argb: isStatus ? (isReceived ? C.SUCCESS : C.AMBER) : 'FF1A1A1A' } }),
          fill: fill(isAlt ? C.ROW_ALT : C.WHITE),
          alignment: align(isAmt ? 'right' : 'left', 'middle'),
          border: border(),
          numFmt: isAmt ? '#,##0.00' : undefined,
        }, isAmt ? 'n' : 's');
      });
      row++;
    });

    const totalInst = project.installments.reduce((a, i) => a + num(i.amount), 0);
    const recvd     = project.installments.filter(i => i.status === 'received').reduce((a, i) => a + num(i.amount), 0);
    ['', 'TOTAL', totalInst, '', `${bdt(recvd)} received`, ''].forEach((val, c) => {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), val, {
        font: font({ bold: true }),
        fill: fill(C.TOTAL_BG),
        alignment: align(c === 2 ? 'right' : 'left', 'middle'),
        border: border(C.GREEN_BD, 'medium'),
        numFmt: c === 2 ? '#,##0.00' : undefined,
      }, c === 2 ? 'n' : 's');
    });

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row + 1, c: 5 } });
    ws['!cols'] = [4, 16, 16, 14, 16, 28].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Installments');
  }

  // ── Sheet 4: Members ─────────────────────────────────────────────────────────
  {
    const ws = {};
    let row = 0;

    setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), 'MEMBER SUMMARY', {
      font: font({ bold: true, sz: 13, color: { argb: C.WHITE } }),
      fill: fill(C.DARK), alignment: align('left', 'middle'),
    });
    merge(ws, row, 0, row, 7);
    row += 2;

    ['#', 'Name', 'Email', 'Role', 'Expenses', 'Total (BDT)', 'Reimbursed (BDT)', 'Pending (BDT)'].forEach((h, c) => {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), h, {
        font: font({ bold: true, sz: 9, color: { argb: C.WHITE } }),
        fill: fill(C.DARK), alignment: align(c >= 4 ? 'right' : 'left', 'middle'),
        border: border(C.GREEN_BD),
      });
    });
    row++;

    project.members.forEach((m, i) => {
      const me = expenses.filter(e => e.submitted_by === m.id);
      const mS = me.reduce((a, e) => a + num(e.amount), 0);
      const mR = me.filter(e => e.reimbursed).reduce((a, e) => a + num(e.amount), 0);
      const mP = mS - mR;

      [i + 1, m.name, m.email, m.role, me.length, mS, mR, mP].forEach((val, c) => {
        const isNum = c >= 4;
        setCell(ws, XLSX.utils.encode_cell({ r: row, c }), val, {
          font: font({ color: { argb: c === 7 && mP > 0 ? C.AMBER : 'FF1A1A1A' } }),
          fill: fill(i % 2 === 0 ? C.ROW_ALT : C.WHITE),
          alignment: align(isNum ? 'right' : 'left', 'middle'),
          border: border(),
          numFmt: c >= 5 ? '#,##0.00' : undefined,
        }, isNum ? 'n' : 's');
      });
      row++;
    });

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row + 1, c: 7 } });
    ws['!cols'] = [4, 22, 28, 14, 10, 16, 18, 16].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
  }

  // Download
  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${project.code}-Report-${today}.xlsx`);
}


// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES PAGE (ALL EXPENSES) EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function exportExpensesXlsx({ displayed, totals, filters, projects, search, user, getCatLabel, fmtDate, CAT_LABELS }) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Report ──────────────────────────────────────────────────────────
  {
    const ws = {};
    let row = 0;

    // Title
    setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), 'RESEARCH EXPENSE REPORT', {
      font: font({ bold: true, sz: 14, color: { argb: C.WHITE } }),
      fill: fill(C.DARK), alignment: align('left', 'middle'),
    });
    merge(ws, row, 0, row, 12);
    row++;

    setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), 'Faculty of Graduate Studies · Daffodil International University', {
      font: font({ sz: 9, color: { argb: C.GREEN }, bold: true }),
      fill: fill(C.DARK), alignment: align('left', 'middle'),
    });
    merge(ws, row, 0, row, 12);
    row += 2;

    // Meta row
    [
      ['Generated On', new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
      ['Total Records', displayed.length],
      ['Exported By', user?.name || ''],
    ].forEach(([label, val], i) => {
      const c = i * 3;
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), label, {
        font: font({ bold: true, color: { argb: C.GRAY_TXT } }),
        fill: fill(C.GRAY_HDR), border: border(),
      });
      setCell(ws, XLSX.utils.encode_cell({ r: row, c: c + 1 }), val, {
        font: font(), fill: fill(C.WHITE), border: border(),
      }, typeof val === 'number' ? 'n' : 's');
    });
    row += 2;

    // Financial summary
    setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), 'FINANCIAL SUMMARY', {
      font: font({ bold: true, sz: 11, color: { argb: C.WHITE } }),
      fill: fill(C.DARK), alignment: align('left', 'middle'),
    });
    merge(ws, row, 0, row, 12);
    row++;

    const sumLabels = ['Total Expenses', 'Reimbursed', 'Pending', 'Reimbursement Rate'];
    const sumVals   = [
      num(totals.total), num(totals.reimbursed), num(totals.pending),
      totals.total > 0 ? (totals.reimbursed / totals.total * 100).toFixed(1) + '%' : '0.0%',
    ];
    const sumColors = [C.DARK, C.SUCCESS, C.AMBER, C.BLUE];
    const isNumCol  = [true, true, true, false];

    sumLabels.forEach((lbl, c) => {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), lbl, {
        font: font({ bold: true, sz: 8, color: { argb: C.GRAY_TXT } }),
        fill: fill(C.GRAY_HDR), alignment: align('center'), border: border(),
      });
    });
    row++;
    sumVals.forEach((val, c) => {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), val, {
        font: font({ bold: true, sz: 13, color: { argb: sumColors[c] } }),
        fill: fill(C.GREEN_BG), alignment: align('center'), border: border(C.GREEN_BD),
        numFmt: isNumCol[c] ? '#,##0.00' : undefined,
      }, isNumCol[c] ? 'n' : 's');
    });
    row += 2;

    // Active filters
    const activeFilters = [];
    if (filters.project_id) { const p = projects.find(p => String(p.id) === String(filters.project_id)); if (p) activeFilters.push(`Project: ${p.code}`); }
    if (filters.reimbursed === 'true')  activeFilters.push('Status: Reimbursed');
    if (filters.reimbursed === 'false') activeFilters.push('Status: Pending');
    if (filters.category) activeFilters.push(`Category: ${CAT_LABELS[filters.category] || filters.category}`);
    if (filters.from_date) activeFilters.push(`From: ${fmtDate(filters.from_date)}`);
    if (filters.to_date)   activeFilters.push(`To: ${fmtDate(filters.to_date)}`);
    if (search) activeFilters.push(`Search: "${search}"`);
    if (activeFilters.length) {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), 'Active Filters', {
        font: font({ bold: true, color: { argb: C.GRAY_TXT } }), fill: fill(C.GRAY_HDR), border: border(),
      });
      setCell(ws, XLSX.utils.encode_cell({ r: row, c: 1 }), activeFilters.join('  |  '), {
        font: font(), fill: fill(C.WHITE), border: border(),
      });
      merge(ws, row, 1, row, 12);
      row += 2;
    }

    // Category breakdown
    setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), 'BREAKDOWN BY CATEGORY', {
      font: font({ bold: true, sz: 11, color: { argb: C.WHITE } }),
      fill: fill(C.DARK), alignment: align('left', 'middle'),
    });
    merge(ws, row, 0, row, 12);
    row++;

    ['Category', 'Count', 'Total (BDT)', 'Reimbursed (BDT)', 'Pending (BDT)', '% of Total'].forEach((h, c) => {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), h, {
        font: font({ bold: true, sz: 9, color: { argb: C.WHITE } }),
        fill: fill(C.DARK), alignment: align(c > 0 ? 'right' : 'left'), border: border(C.GREEN_BD),
      });
    });
    row++;

    const catMap = {};
    displayed.forEach(e => {
      const key = getCatLabel(e);
      if (!catMap[key]) catMap[key] = { count: 0, total: 0, reimbursed: 0 };
      catMap[key].count++;
      catMap[key].total += num(e.amount);
      if (e.reimbursed) catMap[key].reimbursed += num(e.amount);
    });

    Object.entries(catMap).sort((a, b) => b[1].total - a[1].total).forEach(([cat, d], i) => {
      const isAlt = i % 2 === 0;
      const pct = totals.total > 0 ? (d.total / totals.total * 100).toFixed(1) + '%' : '0.0%';
      [cat, d.count, d.total, d.reimbursed, d.total - d.reimbursed, pct].forEach((val, c) => {
        const isNum = c >= 1 && c <= 4;
        setCell(ws, XLSX.utils.encode_cell({ r: row, c }), val, {
          font: font(),
          fill: fill(isAlt ? C.ROW_ALT : C.WHITE),
          alignment: align(c > 0 ? 'right' : 'left'),
          border: border(),
          numFmt: isNum ? '#,##0.00' : undefined,
        }, (isNum && c >= 2) ? 'n' : (c === 1 ? 'n' : 's'));
      });
      row++;
    });

    [
      'TOTAL', displayed.length, num(totals.total), num(totals.reimbursed), num(totals.pending), '100.0%',
    ].forEach((val, c) => {
      const isNum = c >= 1 && c <= 4;
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), val, {
        font: font({ bold: true }),
        fill: fill(C.TOTAL_BG),
        alignment: align(c > 0 ? 'right' : 'left'),
        border: border(C.GREEN_BD, 'medium'),
        numFmt: isNum && c >= 2 ? '#,##0.00' : undefined,
      }, (isNum && c >= 2) ? 'n' : (c === 1 ? 'n' : 's'));
    });
    row += 2;

    // Expense records
    setCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), 'EXPENSE RECORDS', {
      font: font({ bold: true, sz: 11, color: { argb: C.WHITE } }),
      fill: fill(C.DARK), alignment: align('left', 'middle'),
    });
    merge(ws, row, 0, row, 12);
    row++;

    const hdrs = ['#', 'Date', 'Project Code', 'Project Name', 'Submitted By', 'Category', 'Description', 'Receipt / Note', 'Amount (BDT)', 'Status', 'Source', 'Reimb. By', 'Reimb. On'];
    hdrs.forEach((h, c) => {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), h, {
        font: font({ bold: true, sz: 9, color: { argb: C.WHITE } }),
        fill: fill(C.DARK), alignment: align(c === 8 ? 'right' : 'left'), border: border(C.GREEN_BD),
      });
    });
    row++;

    displayed.forEach((e, i) => {
      const isAlt = i % 2 === 0;
      const bg = isAlt ? C.ROW_ALT : C.WHITE;
      [
        i + 1, fmtDate(e.expense_date), e.project_code || '', e.project_name || '',
        e.submitted_by_name || '', getCatLabel(e), e.description || '', e.receipt_note || '',
        num(e.amount),
        e.reimbursed ? 'Reimbursed' : 'Pending',
        e.reimbursed ? (e.reimbursed_from === 'university' ? 'University' : 'Project') : '',
        e.reimbursed ? (e.reimbursed_by_name || '') : '',
        e.reimbursed ? fmtDate(e.reimbursed_at) : '',
      ].forEach((val, c) => {
        const isAmt = c === 8, isStatus = c === 9;
        setCell(ws, XLSX.utils.encode_cell({ r: row, c }), val, {
          font: font({
            bold: isAmt || isStatus,
            color: { argb: isStatus ? (e.reimbursed ? C.SUCCESS : C.AMBER) : 'FF1A1A1A' },
          }),
          fill: fill(bg),
          alignment: align(isAmt ? 'right' : 'left', 'middle', c === 6 || c === 7),
          border: border(),
          numFmt: isAmt ? '#,##0.00' : undefined,
        }, isAmt ? 'n' : 's');
      });
      row++;
    });

    // Totals
    const totalAmt = displayed.reduce((a, e) => a + num(e.amount), 0);
    ['', '', '', '', `${displayed.length} records`, '', '', 'TOTAL', totalAmt, '', '', '', ''].forEach((val, c) => {
      setCell(ws, XLSX.utils.encode_cell({ r: row, c }), val, {
        font: font({ bold: true }),
        fill: fill(C.TOTAL_BG),
        alignment: align(c === 8 ? 'right' : 'left'),
        border: border(C.GREEN_BD, 'medium'),
        numFmt: c === 8 ? '#,##0.00' : undefined,
      }, c === 8 ? 'n' : 's');
    });

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row + 2, c: 12 } });
    ws['!cols'] = [4, 12, 13, 28, 18, 20, 32, 20, 14, 13, 12, 16, 14].map(w => ({ wch: w }));

    XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');
  }

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Expenses-Report-${today}.xlsx`);
}
