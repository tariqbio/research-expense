/**
 * exportXlsx.js — XLSX report that mirrors the PDF layout exactly.
 * Uses xlsx-js-style (drop-in for xlsx with real cell styling support).
 *
 * PDF layout reproduced:
 *   Header       : institution · project code · title · date
 *   Summary cards: Total Budget | Total Spent | Reimbursed | Pending | Remaining | Utilised%
 *   Progress bar : text representation
 *   Expenses     : Date | Researcher | Category | Description | Amount | Status
 *   Installments : # | Expected Date | Amount | Status | Date Received | Note
 *   Members      : Name | Email | Role | Expenses | Total | Reimbursed | Pending
 *   Footer       : version + copyright
 */
import * as XLSX from 'xlsx-js-style';

// ── Colours (ARGB, no leading #) ─────────────────────────────────────────────
const C = {
  DARK:     'FF0D1F17',
  GREEN:    'FF28E98C',
  GREEN_BG: 'FFE8FFF4',
  GREEN_BD: 'FFA7F3D0',
  SUCCESS:  'FF16A34A',
  AMBER:    'FFD97706',
  RED:      'FFDC2626',
  BLUE:     'FF0891B2',
  WHITE:    'FFFFFFFF',
  GRAY_HDR: 'FFF3F4F6',
  GRAY_TXT: 'FF6B7280',
  GRAY_BD:  'FFE5E7EB',
  ROW_ALT:  'FFFAFAFA',
  TOTAL_BG: 'FFF0FFF8',
};

const font = (o = {}) => ({
  name: 'Segoe UI', sz: o.sz || 10,
  bold: o.bold || false,
  color: o.color || { argb: 'FF1A1A1A' },
});
const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const bord = (argb = C.GRAY_BD, s = 'thin') => ({
  top: { style: s, color: { argb } }, bottom: { style: s, color: { argb } },
  left: { style: s, color: { argb } }, right: { style: s, color: { argb } },
});
const al = (h = 'left', v = 'center', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap });

function cell(ws, r, c, v, s = {}, t = null) {
  const addr = XLSX.utils.encode_cell({ r, c });
  ws[addr] = { v: v ?? '', t: t || (typeof v === 'number' ? 'n' : 's'), s };
}
function merge(ws, r1, c1, r2, c2) {
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
}
function rowH(ws, r, hpt) {
  if (!ws['!rows']) ws['!rows'] = [];
  ws['!rows'][r] = { hpt };
}

const num = v => Number(v || 0);
const bdt = v => '৳' + num(v).toLocaleString('en-BD', { minimumFractionDigits: 2 });


// ─────────────────────────────────────────────────────────────────────────────
// PROJECT DETAIL EXPORT  — single sheet, same layout as the PDF
// ─────────────────────────────────────────────────────────────────────────────
export function exportProjectXlsx({ project, expenses, stats, getCatLabel, fmtDate }) {
  const wb   = XLSX.utils.book_new();
  const ws   = {};
  const COLS = 6; // columns 0–6 (7 total)
  let   row  = 0;

  const budget     = num(project.total_budget);
  const spent      = num(stats.total_spent);
  const reimbursed = num(stats.total_reimbursed);
  const pending    = num(stats.total_pending);
  const remaining  = budget - spent;
  const pct        = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const today      = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Header ─────────────────────────────────────────────────────────────────
  cell(ws, row, 0, 'DAFFODIL INTERNATIONAL UNIVERSITY  ·  FACULTY OF GRADUATE STUDIES', {
    font: font({ sz: 8, bold: true, color: { argb: C.GREEN } }),
    fill: fill(C.DARK), alignment: al('left'),
  }); merge(ws, row, 0, row, COLS); rowH(ws, row, 18); row++;

  cell(ws, row, 0, project.code, {
    font: font({ sz: 9, bold: true, color: { argb: 'FF0D7A4E' } }),
    fill: fill(C.GREEN_BG), border: bord(C.GREEN_BD), alignment: al('left'),
  });
  cell(ws, row, 1, 'Expense Report  ·  ' + today, {
    font: font({ sz: 8, color: { argb: C.GRAY_TXT } }),
    fill: fill(C.WHITE), alignment: al('right'),
  }); merge(ws, row, 1, row, COLS); rowH(ws, row, 18); row++;

  cell(ws, row, 0, project.name, {
    font: font({ sz: 15, bold: true, color: { argb: C.DARK } }),
    fill: fill(C.WHITE), alignment: al('left', 'center', true),
  }); merge(ws, row, 0, row, COLS); rowH(ws, row, 42); row++;

  if (project.description) {
    cell(ws, row, 0, project.description, {
      font: font({ sz: 9, color: { argb: C.GRAY_TXT } }),
      fill: fill(C.WHITE), alignment: al('left', 'center', true),
    }); merge(ws, row, 0, row, COLS); rowH(ws, row, 14); row++;
  }

  // green separator line
  for (let c = 0; c <= COLS; c++) cell(ws, row, c, '', { fill: fill(C.GREEN) });
  rowH(ws, row, 4); row++;
  row++; // blank

  // ── Summary cards (6 — matches PDF exactly) ────────────────────────────────
  const cardLabels = ['TOTAL BUDGET', 'TOTAL SPENT', 'REIMBURSED', 'PENDING', 'REMAINING', 'UTILISED'];
  const cardValues = [bdt(budget), bdt(spent), bdt(reimbursed), bdt(pending), bdt(remaining), pct.toFixed(1) + '%'];
  const cardColors = [C.DARK, C.BLUE, C.SUCCESS, C.AMBER, remaining < 0 ? C.RED : C.SUCCESS, pct > 90 ? C.RED : pct > 70 ? C.AMBER : C.DARK];

  cardLabels.forEach((lbl, c) => {
    cell(ws, row, c, lbl, {
      font: font({ sz: 7, bold: true, color: { argb: C.GRAY_TXT } }),
      fill: fill(C.GRAY_HDR), border: bord(), alignment: al('center'),
    });
  });
  rowH(ws, row, 16); row++;

  cardValues.forEach((val, c) => {
    cell(ws, row, c, val, {
      font: font({ sz: 13, bold: true, color: { argb: cardColors[c] } }),
      fill: fill(C.GREEN_BG), border: bord(C.GREEN_BD), alignment: al('center'),
    });
  });
  rowH(ws, row, 28); row++;
  row++; // blank

  // ── Budget utilisation text bar ────────────────────────────────────────────
  cell(ws, row, 0, 'Budget Utilisation', {
    font: font({ sz: 8, color: { argb: C.GRAY_TXT } }), fill: fill(C.WHITE), alignment: al('left'),
  }); merge(ws, row, 0, row, 4);
  cell(ws, row, 5, bdt(spent) + ' of ' + bdt(budget), {
    font: font({ sz: 8, color: { argb: C.GRAY_TXT } }), fill: fill(C.WHITE), alignment: al('right'),
  }); merge(ws, row, 5, row, COLS); row++;

  const barColor = pct > 90 ? C.RED : pct > 70 ? C.AMBER : C.GREEN;
  const filled   = Math.round(pct / 100 * (COLS + 1));
  for (let c = 0; c <= COLS; c++) {
    cell(ws, row, c, '', { fill: fill(c < filled ? barColor : C.GRAY_BD) });
  }
  rowH(ws, row, 6); row++;
  row++; // blank

  // ── Expense Records ────────────────────────────────────────────────────────
  cell(ws, row, 0, 'EXPENSE RECORDS', {
    font: font({ sz: 9, bold: true, color: { argb: C.DARK } }), fill: fill(C.WHITE), alignment: al('left'),
  });
  cell(ws, row, 2, `${expenses.length} entr${expenses.length === 1 ? 'y' : 'ies'}`, {
    font: font({ sz: 8, color: { argb: C.GRAY_TXT } }), fill: fill(C.GRAY_HDR), border: bord(), alignment: al('center'),
  });
  rowH(ws, row, 20); row++;

  ['DATE', 'RESEARCHER', 'CATEGORY', 'DESCRIPTION', 'AMOUNT', 'STATUS'].forEach((h, c) => {
    cell(ws, row, c, h, {
      font: font({ sz: 8, bold: true, color: { argb: C.WHITE } }),
      fill: fill(C.DARK), border: bord(C.GREEN_BD), alignment: al(c === 4 ? 'right' : 'left'),
    });
  });
  rowH(ws, row, 18); row++;

  expenses.forEach((e, i) => {
    const bg  = i % 2 === 0 ? C.ROW_ALT : C.WHITE;
    const isc = e.reimbursed ? C.SUCCESS : C.AMBER;
    [
      fmtDate(e.expense_date),
      e.submitted_by_name || '',
      getCatLabel(e),
      e.description + (e.receipt_note ? '\n' + e.receipt_note : ''),
      num(e.amount),
      e.reimbursed ? '✓ Reimbursed' : 'Pending',
    ].forEach((val, c) => {
      const isAmt = c === 4, isSt = c === 5;
      cell(ws, row, c, val, {
        font: font({ bold: isAmt || isSt, color: { argb: isSt ? isc : 'FF1A1A1A' } }),
        fill: fill(bg), border: bord(), alignment: al(isAmt ? 'right' : 'left', 'center', c === 3),
        numFmt: isAmt ? '#,##0.00' : undefined,
      }, isAmt ? 'n' : 's');
    });
    row++;
  });

  // Totals footer
  cell(ws, row, 0, `Total — ${expenses.length} record${expenses.length !== 1 ? 's' : ''}`, {
    font: font({ bold: true, color: { argb: C.GRAY_TXT } }),
    fill: fill(C.TOTAL_BG), border: bord(C.GREEN_BD, 'medium'), alignment: al('left'),
  }); merge(ws, row, 0, row, 3);
  cell(ws, row, 4, num(stats.total_spent), {
    font: font({ bold: true, color: { argb: C.DARK } }),
    fill: fill(C.TOTAL_BG), border: bord(C.GREEN_BD, 'medium'), alignment: al('right'), numFmt: '#,##0.00',
  }, 'n');
  cell(ws, row, 5, bdt(reimbursed) + ' paid  ·  ' + bdt(pending) + ' pending', {
    font: font({ sz: 9, color: { argb: C.GRAY_TXT } }),
    fill: fill(C.TOTAL_BG), border: bord(C.GREEN_BD, 'medium'), alignment: al('left'),
  }); merge(ws, row, 5, row, COLS);
  rowH(ws, row, 18); row++;
  row++; // blank

  // ── Fund Installments ──────────────────────────────────────────────────────
  if (project.installments && project.installments.length > 0) {
    cell(ws, row, 0, 'FUND INSTALLMENTS', {
      font: font({ sz: 9, bold: true, color: { argb: C.DARK } }), fill: fill(C.WHITE), alignment: al('left'),
    });
    cell(ws, row, 2, `${project.installments.length} installment${project.installments.length !== 1 ? 's' : ''}`, {
      font: font({ sz: 8, color: { argb: C.GRAY_TXT } }), fill: fill(C.GRAY_HDR), border: bord(), alignment: al('center'),
    });
    rowH(ws, row, 20); row++;

    ['#', 'EXPECTED DATE', 'AMOUNT', 'STATUS', 'DATE RECEIVED', 'NOTE'].forEach((h, c) => {
      cell(ws, row, c, h, {
        font: font({ sz: 8, bold: true, color: { argb: C.WHITE } }),
        fill: fill(C.DARK), border: bord(C.GREEN_BD), alignment: al(c === 2 ? 'right' : 'left'),
      });
    });
    rowH(ws, row, 18); row++;

    project.installments.forEach((inst, i) => {
      const bg    = i % 2 === 0 ? C.ROW_ALT : C.WHITE;
      const isRec = inst.status === 'received';
      ['#' + (i + 1), fmtDate(inst.expected_date), num(inst.amount),
        isRec ? '✓ Received' : 'Pending',
        inst.received_date ? fmtDate(inst.received_date) : '—',
        inst.note || '—',
      ].forEach((val, c) => {
        const isAmt = c === 2, isSt = c === 3;
        cell(ws, row, c, val, {
          font: font({ bold: isSt, color: { argb: isSt ? (isRec ? C.SUCCESS : C.AMBER) : 'FF1A1A1A' } }),
          fill: fill(bg), border: bord(), alignment: al(isAmt ? 'right' : 'left'),
          numFmt: isAmt ? '#,##0.00' : undefined,
        }, isAmt ? 'n' : 's');
      });
      row++;
    });

    const instTotal = project.installments.reduce((a, i) => a + num(i.amount), 0);
    cell(ws, row, 0, 'Total', { font: font({ bold: true }), fill: fill(C.TOTAL_BG), border: bord(C.GREEN_BD, 'medium'), alignment: al('left') });
    merge(ws, row, 0, row, 1);
    cell(ws, row, 2, instTotal, {
      font: font({ bold: true, color: { argb: C.DARK } }),
      fill: fill(C.TOTAL_BG), border: bord(C.GREEN_BD, 'medium'), alignment: al('right'), numFmt: '#,##0.00',
    }, 'n');
    rowH(ws, row, 18); row++;
    row++; // blank
  }

  // ── Member Summary ─────────────────────────────────────────────────────────
  cell(ws, row, 0, 'MEMBER SUMMARY', {
    font: font({ sz: 9, bold: true, color: { argb: C.DARK } }), fill: fill(C.WHITE), alignment: al('left'),
  });
  cell(ws, row, 2, `${project.members.length} member${project.members.length !== 1 ? 's' : ''}`, {
    font: font({ sz: 8, color: { argb: C.GRAY_TXT } }), fill: fill(C.GRAY_HDR), border: bord(), alignment: al('center'),
  });
  rowH(ws, row, 20); row++;

  ['NAME', 'EMAIL', 'ROLE', 'EXPENSES', 'TOTAL', 'REIMBURSED', 'PENDING'].forEach((h, c) => {
    cell(ws, row, c, h, {
      font: font({ sz: 8, bold: true, color: { argb: C.WHITE } }),
      fill: fill(C.DARK), border: bord(C.GREEN_BD), alignment: al(c >= 3 ? 'right' : 'left'),
    });
  });
  rowH(ws, row, 18); row++;

  project.members.forEach((m, i) => {
    const me = expenses.filter(e => e.submitted_by === m.id);
    const mS = me.reduce((a, e) => a + num(e.amount), 0);
    const mR = me.filter(e => e.reimbursed).reduce((a, e) => a + num(e.amount), 0);
    const mP = mS - mR;
    const bg = i % 2 === 0 ? C.ROW_ALT : C.WHITE;
    [m.name, m.email, m.role, me.length, mS, mR, mP].forEach((val, c) => {
      const isNum = c >= 3;
      cell(ws, row, c, val, {
        font: font({ bold: c === 0, color: { argb: c === 6 && mP > 0 ? C.AMBER : c === 5 ? C.SUCCESS : 'FF1A1A1A' } }),
        fill: fill(bg), border: bord(), alignment: al(isNum ? 'right' : 'left'),
        numFmt: c >= 4 ? '#,##0.00' : undefined,
      }, isNum ? 'n' : 's');
    });
    row++;
  });
  row++; // blank

  // ── Footer ─────────────────────────────────────────────────────────────────
  cell(ws, row, 0, 'ResearchTrack v2.0  ·  Faculty of Graduate Studies, Daffodil International University', {
    font: font({ sz: 7, color: { argb: C.GRAY_TXT } }), fill: fill(C.WHITE), alignment: al('left'),
  }); merge(ws, row, 0, row, 4);
  cell(ws, row, 5, 'Developed by Tariqul Islam  ·  © 2025 FGS, DIU', {
    font: font({ sz: 7, color: { argb: C.GRAY_TXT } }), fill: fill(C.WHITE), alignment: al('right'),
  }); merge(ws, row, 5, row, COLS);

  ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row + 1, c: COLS } });
  ws['!cols'] = [14, 18, 20, 36, 14, 20, 14].map(w => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');
  XLSX.writeFile(wb, `${project.code}-Report-${new Date().toISOString().split('T')[0]}.xlsx`, { bookType: 'xlsx', cellStyles: true });
}


// ─────────────────────────────────────────────────────────────────────────────
// ALL-EXPENSES PAGE EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function exportExpensesXlsx({ displayed, totals, filters, projects, search, user, getCatLabel, fmtDate, CAT_LABELS }) {
  const wb   = XLSX.utils.book_new();
  const ws   = {};
  const COLS = 6;
  let   row  = 0;
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Header ─────────────────────────────────────────────────────────────────
  cell(ws, row, 0, 'DAFFODIL INTERNATIONAL UNIVERSITY  ·  FACULTY OF GRADUATE STUDIES', {
    font: font({ sz: 8, bold: true, color: { argb: C.GREEN } }),
    fill: fill(C.DARK), alignment: al('left'),
  }); merge(ws, row, 0, row, COLS); rowH(ws, row, 18); row++;

  cell(ws, row, 0, 'RESEARCH EXPENSE REPORT', {
    font: font({ sz: 14, bold: true, color: { argb: C.DARK } }),
    fill: fill(C.WHITE), alignment: al('left'),
  }); merge(ws, row, 0, row, 4);
  cell(ws, row, 5, today, {
    font: font({ sz: 8, color: { argb: C.GRAY_TXT } }), fill: fill(C.WHITE), alignment: al('right'),
  }); merge(ws, row, 5, row, COLS); rowH(ws, row, 30); row++;

  for (let c = 0; c <= COLS; c++) cell(ws, row, c, '', { fill: fill(C.GREEN) });
  rowH(ws, row, 4); row++;
  row++; // blank

  // ── Summary cards ──────────────────────────────────────────────────────────
  const rate = totals.total > 0 ? (totals.reimbursed / totals.total * 100).toFixed(1) + '%' : '0.0%';
  ['TOTAL EXPENSES', 'REIMBURSED', 'PENDING', 'REIMBURSEMENT RATE'].forEach((lbl, c) => {
    cell(ws, row, c * 2, lbl, {
      font: font({ sz: 7, bold: true, color: { argb: C.GRAY_TXT } }),
      fill: fill(C.GRAY_HDR), border: bord(), alignment: al('center'),
    }); merge(ws, row, c * 2, row, c * 2 + (c === 3 ? 0 : 1));
  });
  // last card fills remaining col
  rowH(ws, row, 16); row++;

  [bdt(totals.total), bdt(totals.reimbursed), bdt(totals.pending), rate].forEach((val, c) => {
    const colors = [C.DARK, C.SUCCESS, C.AMBER, C.BLUE];
    cell(ws, row, c * 2, val, {
      font: font({ sz: 13, bold: true, color: { argb: colors[c] } }),
      fill: fill(C.GREEN_BG), border: bord(C.GREEN_BD), alignment: al('center'),
    }); merge(ws, row, c * 2, row, c * 2 + (c === 3 ? 0 : 1));
  });
  rowH(ws, row, 28); row++;
  row++; // blank

  // ── Meta row ───────────────────────────────────────────────────────────────
  cell(ws, row, 0, 'Generated by', { font: font({ sz: 8, bold: true, color: { argb: C.GRAY_TXT } }), fill: fill(C.GRAY_HDR), border: bord() });
  cell(ws, row, 1, user?.name || '', { font: font({ sz: 8 }), fill: fill(C.WHITE), border: bord() }); merge(ws, row, 1, row, 3);
  cell(ws, row, 4, 'Records', { font: font({ sz: 8, bold: true, color: { argb: C.GRAY_TXT } }), fill: fill(C.GRAY_HDR), border: bord() });
  cell(ws, row, 5, displayed.length, { font: font({ sz: 8, bold: true }), fill: fill(C.WHITE), border: bord(), alignment: al('right') }, 'n');
  row++;

  // Active filters
  const af = [];
  if (filters.project_id) { const p = projects.find(p => String(p.id) === String(filters.project_id)); if (p) af.push(`Project: ${p.code}`); }
  if (filters.reimbursed === 'true')  af.push('Status: Reimbursed');
  if (filters.reimbursed === 'false') af.push('Status: Pending');
  if (filters.category) af.push(`Category: ${CAT_LABELS[filters.category] || filters.category}`);
  if (filters.from_date) af.push(`From: ${fmtDate(filters.from_date)}`);
  if (filters.to_date)   af.push(`To: ${fmtDate(filters.to_date)}`);
  if (search) af.push(`Search: "${search}"`);
  if (af.length) {
    cell(ws, row, 0, 'Active Filters', { font: font({ sz: 8, bold: true, color: { argb: C.GRAY_TXT } }), fill: fill(C.GRAY_HDR), border: bord() });
    cell(ws, row, 1, af.join('  |  '), { font: font({ sz: 8 }), fill: fill(C.WHITE), border: bord(), alignment: al('left', 'center', true) }); merge(ws, row, 1, row, COLS);
    row++;
  }
  row++; // blank

  // ── Expense Records table ──────────────────────────────────────────────────
  cell(ws, row, 0, 'EXPENSE RECORDS', {
    font: font({ sz: 9, bold: true, color: { argb: C.DARK } }), fill: fill(C.WHITE), alignment: al('left'),
  });
  cell(ws, row, 2, `${displayed.length} record${displayed.length !== 1 ? 's' : ''}`, {
    font: font({ sz: 8, color: { argb: C.GRAY_TXT } }), fill: fill(C.GRAY_HDR), border: bord(), alignment: al('center'),
  });
  rowH(ws, row, 20); row++;

  ['DATE', 'PROJECT', 'SUBMITTED BY', 'CATEGORY', 'DESCRIPTION', 'AMOUNT', 'STATUS'].forEach((h, c) => {
    cell(ws, row, c, h, {
      font: font({ sz: 8, bold: true, color: { argb: C.WHITE } }),
      fill: fill(C.DARK), border: bord(C.GREEN_BD), alignment: al(c === 5 ? 'right' : 'left'),
    });
  });
  rowH(ws, row, 18); row++;

  displayed.forEach((e, i) => {
    const bg  = i % 2 === 0 ? C.ROW_ALT : C.WHITE;
    const isc = e.reimbursed ? C.SUCCESS : C.AMBER;
    [
      fmtDate(e.expense_date),
      (e.project_code || '') + (e.project_name ? '\n' + e.project_name : ''),
      e.submitted_by_name || '',
      getCatLabel(e),
      e.description + (e.receipt_note ? '\n' + e.receipt_note : ''),
      num(e.amount),
      e.reimbursed ? '✓ Reimbursed' : 'Pending',
    ].forEach((val, c) => {
      const isAmt = c === 5, isSt = c === 6;
      cell(ws, row, c, val, {
        font: font({ bold: isAmt || isSt, color: { argb: isSt ? isc : 'FF1A1A1A' } }),
        fill: fill(bg), border: bord(), alignment: al(isAmt ? 'right' : 'left', 'center', c === 4),
        numFmt: isAmt ? '#,##0.00' : undefined,
      }, isAmt ? 'n' : 's');
    });
    row++;
  });

  // Totals row
  cell(ws, row, 0, `Total  ·  ${displayed.length} records`, {
    font: font({ bold: true, color: { argb: C.GRAY_TXT } }),
    fill: fill(C.TOTAL_BG), border: bord(C.GREEN_BD, 'medium'), alignment: al('left'),
  }); merge(ws, row, 0, row, 4);
  cell(ws, row, 5, num(totals.total), {
    font: font({ bold: true, color: { argb: C.DARK } }),
    fill: fill(C.TOTAL_BG), border: bord(C.GREEN_BD, 'medium'), alignment: al('right'), numFmt: '#,##0.00',
  }, 'n');
  cell(ws, row, 6, bdt(totals.reimbursed) + ' reimbursed  ·  ' + bdt(totals.pending) + ' pending', {
    font: font({ sz: 9, color: { argb: C.GRAY_TXT } }),
    fill: fill(C.TOTAL_BG), border: bord(C.GREEN_BD, 'medium'), alignment: al('left'),
  });
  rowH(ws, row, 18); row++;
  row++; // blank

  // ── Footer ─────────────────────────────────────────────────────────────────
  cell(ws, row, 0, 'ResearchTrack v2.0  ·  Faculty of Graduate Studies, Daffodil International University', {
    font: font({ sz: 7, color: { argb: C.GRAY_TXT } }), fill: fill(C.WHITE), alignment: al('left'),
  }); merge(ws, row, 0, row, 4);
  cell(ws, row, 5, 'Developed by Tariqul Islam  ·  © 2025 FGS, DIU', {
    font: font({ sz: 7, color: { argb: C.GRAY_TXT } }), fill: fill(C.WHITE), alignment: al('right'),
  }); merge(ws, row, 5, row, COLS);

  ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row + 1, c: COLS } });
  ws['!cols'] = [12, 20, 18, 20, 34, 14, 18].map(w => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');
  XLSX.writeFile(wb, `Expenses-Report-${new Date().toISOString().split('T')[0]}.xlsx`, { bookType: 'xlsx', cellStyles: true });
}
