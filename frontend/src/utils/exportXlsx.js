/**
 * exportXlsx.js — Professional XLSX matching the PDF design.
 * Uses xlsx-js-style ^1.2.0
 *
 * KEY FIX: Every cell in a merged range must have its style explicitly set.
 * Unset cells default to transparent/black in some Excel versions.
 */
import * as XLSX from 'xlsx-js-style';

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  DARK:     'FF0D1F17',
  GREEN:    'FF28E98C',
  GREEN_LT: 'FFE8FFF4',
  GREEN_BD: 'FFA7F3D0',
  SUCCESS:  'FF16A34A',
  AMBER:    'FFD97706',
  AMBER_LT: 'FFFEFCE8',
  RED:      'FFDC2626',
  BLUE:     'FF0891B2',
  WHITE:    'FFFFFFFF',
  ALT:      'FFFAFAFA',
  SECT_BG:  'FFF3F4F6',
  SECT_TXT: 'FF6B7280',
  BORD:     'FFE5E7EB',
  TOTAL_BG: 'FFF0FFF8',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const F   = (o = {}) => ({ name: 'Segoe UI', sz: o.sz ?? 10, bold: o.bold ?? false, italic: o.italic ?? false, color: { argb: o.color ?? 'FF1A1A1A' } });
const BG  = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb }, bgColor: { argb: 'FFFFFFFF' } });
const AL  = (h = 'left', v = 'center', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap });
const TH  = (argb = P.BORD) => ({ style: 'thin',   color: { argb } });
const MD  = (argb = P.GREEN_BD) => ({ style: 'medium', color: { argb } });
const NO  = () => ({ style: 'none', color: { argb: P.WHITE } });

const N   = v => Number(v || 0);
const BDT = v => '৳' + N(v).toLocaleString('en-BD', { minimumFractionDigits: 2 });

// Write a single cell
function W(ws, r, c, v, s = {}, t = null) {
  const addr = XLSX.utils.encode_cell({ r, c });
  ws[addr] = { v: v ?? '', t: t ?? (typeof v === 'number' ? 'n' : 's'), s };
}

// Write the same style across a full row range (critical — prevents black cells)
function WR(ws, r, c1, c2, v, s = {}, t = null) {
  for (let c = c1; c <= c2; c++) {
    W(ws, r, c, c === c1 ? v : '', s, c === c1 ? t : 's');
  }
}

// Merge helper
function M(ws, r1, c1, r2, c2) {
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
}

// Row height helper
function RH(ws, r, hpt) {
  if (!ws['!rows']) ws['!rows'] = [];
  ws['!rows'][r] = { hpt };
}

// Write a blank spacer row — WHITE fill across all cols
function SPACER(ws, r, hpt, cols) {
  for (let c = 0; c <= cols; c++) W(ws, r, c, '', { fill: BG(P.WHITE) });
  RH(ws, r, hpt);
}

// Write a solid colour band row (e.g. green separator)
function BAND(ws, r, hpt, argb, cols) {
  for (let c = 0; c <= cols; c++) W(ws, r, c, '', { fill: BG(argb) });
  RH(ws, r, hpt);
}


// ═════════════════════════════════════════════════════════════════════════════
//  PROJECT DETAIL EXPORT
// ═════════════════════════════════════════════════════════════════════════════
export function exportProjectXlsx({ project, expenses, stats, getCatLabel, fmtDate }) {
  const wb   = XLSX.utils.book_new();
  const ws   = {};
  const COLS = 6; // 0–6 = 7 columns
  let   row  = 0;

  const budget     = N(project.total_budget);
  const spent      = N(stats.total_spent);
  const reimbursed = N(stats.total_reimbursed);
  const pending    = N(stats.total_pending);
  const remaining  = budget - spent;
  const pct        = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const today      = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── HEADER ─────────────────────────────────────────────────────────────────
  // Row 1: dark band — institution name
  WR(ws, row, 0, COLS,
    'DAFFODIL INTERNATIONAL UNIVERSITY  ·  FACULTY OF GRADUATE STUDIES', {
      font: F({ sz: 8, bold: true, color: P.GREEN }),
      fill: BG(P.DARK), alignment: AL('left'),
    }
  ); M(ws, row, 0, row, COLS); RH(ws, row, 20); row++;

  // Row 2: dark band — code badge + date
  WR(ws, row, 0, COLS, '', { fill: BG(P.DARK) });
  W(ws, row, 0, ' ' + project.code + ' ', {
    font: F({ sz: 9, bold: true, color: 'FF0D7A4E' }),
    fill: BG(P.GREEN_LT), alignment: AL('left'),
    border: { top: TH(P.GREEN_BD), bottom: TH(P.GREEN_BD), left: TH(P.GREEN_BD), right: TH(P.GREEN_BD) },
  });
  WR(ws, row, 1, COLS, 'Expense Report  ·  ' + today, {
    font: F({ sz: 8, italic: true, color: P.GREEN_BD }),
    fill: BG(P.DARK), alignment: AL('right'),
  }); M(ws, row, 1, row, COLS); RH(ws, row, 18); row++;

  // Row 3: project title
  WR(ws, row, 0, COLS, project.name, {
    font: F({ sz: 16, bold: true, color: P.DARK }),
    fill: BG(P.WHITE), alignment: AL('left', 'center', true),
  }); M(ws, row, 0, row, COLS); RH(ws, row, 44); row++;

  // Row 4: description (optional)
  if (project.description) {
    WR(ws, row, 0, COLS, project.description, {
      font: F({ sz: 9, italic: true, color: P.SECT_TXT }),
      fill: BG(P.WHITE), alignment: AL('left', 'center', true),
    }); M(ws, row, 0, row, COLS); RH(ws, row, 16); row++;
  }

  // Green separator line
  BAND(ws, row, 4, P.GREEN, COLS); row++;
  SPACER(ws, row, 10, COLS); row++;

  // ── SUMMARY CARDS ──────────────────────────────────────────────────────────
  const cardLabels = ['TOTAL BUDGET', 'TOTAL SPENT', 'REIMBURSED', 'PENDING', 'REMAINING', 'UTILISED'];
  const cardValues = [BDT(budget), BDT(spent), BDT(reimbursed), BDT(pending), BDT(remaining), pct.toFixed(1) + '%'];
  const cardColors = [P.DARK, P.BLUE, P.SUCCESS, P.AMBER, remaining < 0 ? P.RED : P.SUCCESS, pct > 90 ? P.RED : pct > 70 ? P.AMBER : P.DARK];

  cardLabels.forEach((lbl, c) => {
    W(ws, row, c, lbl, {
      font: F({ sz: 7, bold: true, color: P.SECT_TXT }),
      fill: BG(P.SECT_BG), alignment: AL('center'),
      border: { top: MD(), left: TH(P.GREEN_BD), right: TH(P.GREEN_BD), bottom: NO() },
    });
  });
  RH(ws, row, 18); row++;

  cardValues.forEach((val, c) => {
    W(ws, row, c, val, {
      font: F({ sz: 13, bold: true, color: cardColors[c] }),
      fill: BG(P.GREEN_LT), alignment: AL('center'),
      border: { bottom: MD(), left: TH(P.GREEN_BD), right: TH(P.GREEN_BD), top: NO() },
    });
  });
  RH(ws, row, 30); row++;
  SPACER(ws, row, 8, COLS); row++;

  // ── PROGRESS BAR ───────────────────────────────────────────────────────────
  WR(ws, row, 0, 4, 'Budget Utilisation', {
    font: F({ sz: 8, color: P.SECT_TXT }), fill: BG(P.WHITE), alignment: AL('left'),
  }); M(ws, row, 0, row, 4);
  WR(ws, row, 5, COLS, BDT(spent) + ' of ' + BDT(budget), {
    font: F({ sz: 8, color: P.SECT_TXT }), fill: BG(P.WHITE), alignment: AL('right'),
  }); M(ws, row, 5, row, COLS); row++;

  const barColor = pct > 90 ? P.RED : pct > 70 ? P.AMBER : P.GREEN;
  const filled   = Math.max(1, Math.round(pct / 100 * (COLS + 1)));
  for (let c = 0; c <= COLS; c++) {
    W(ws, row, c, '', { fill: BG(c < filled ? barColor : P.BORD) });
  }
  RH(ws, row, 7); row++;
  SPACER(ws, row, 14, COLS); row++;

  // ── EXPENSE RECORDS ────────────────────────────────────────────────────────
  // Section label
  WR(ws, row, 0, 3, 'EXPENSE RECORDS', {
    font: F({ sz: 9, bold: true, color: P.DARK }), fill: BG(P.WHITE), alignment: AL('left'),
  }); M(ws, row, 0, row, 3);
  WR(ws, row, 4, COLS, expenses.length + ' entr' + (expenses.length === 1 ? 'y' : 'ies'), {
    font: F({ sz: 8, color: P.SECT_TXT }), fill: BG(P.SECT_BG), alignment: AL('center'),
    border: { top: TH(), bottom: TH(), left: TH(), right: TH() },
  }); M(ws, row, 4, row, COLS); RH(ws, row, 20); row++;

  // Table header
  ['DATE', 'RESEARCHER', 'CATEGORY', 'DESCRIPTION', 'AMOUNT', 'STATUS', ''].forEach((h, c) => {
    W(ws, row, c, h, {
      font: F({ sz: 8, bold: true, color: P.WHITE }),
      fill: BG(P.DARK), alignment: AL(c === 4 ? 'right' : 'left'),
      border: { bottom: TH(P.GREEN) },
    });
  });
  RH(ws, row, 20); row++;

  // Data rows
  expenses.forEach((e, i) => {
    const bg  = i % 2 === 0 ? P.ALT : P.WHITE;
    const stC = e.reimbursed ? P.SUCCESS : P.AMBER;
    [
      fmtDate(e.expense_date),
      e.submitted_by_name || '',
      getCatLabel(e),
      e.description + (e.receipt_note ? '\n' + e.receipt_note : ''),
      N(e.amount),
      e.reimbursed ? '✓ Reimbursed' : 'Pending',
      '',
    ].forEach((val, c) => {
      const isAmt = c === 4, isSt = c === 5;
      W(ws, row, c, val, {
        font: F({ bold: isAmt || isSt, color: isSt ? stC : 'FF1A1A1A' }),
        fill: BG(isSt && !e.reimbursed ? P.AMBER_LT : bg),
        alignment: AL(isAmt ? 'right' : 'left', 'center', c === 3),
        border: { bottom: TH() },
        numFmt: isAmt ? '#,##0.00' : undefined,
      }, isAmt ? 'n' : 's');
    });
    RH(ws, row, e.receipt_note ? 28 : 20); row++;
  });

  // Totals footer
  WR(ws, row, 0, 3, 'Total — ' + expenses.length + ' record' + (expenses.length !== 1 ? 's' : ''), {
    font: F({ bold: true, color: P.SECT_TXT }), fill: BG(P.TOTAL_BG), alignment: AL('left'),
    border: { top: MD(), bottom: MD() },
  }); M(ws, row, 0, row, 3);
  W(ws, row, 4, N(stats.total_spent), {
    font: F({ bold: true, sz: 11, color: P.DARK }), fill: BG(P.TOTAL_BG), alignment: AL('right'),
    border: { top: MD(), bottom: MD() }, numFmt: '#,##0.00',
  }, 'n');
  WR(ws, row, 5, COLS, BDT(reimbursed) + ' paid  ·  ' + BDT(pending) + ' pending', {
    font: F({ sz: 8, color: P.SECT_TXT }), fill: BG(P.TOTAL_BG), alignment: AL('left'),
    border: { top: MD(), bottom: MD() },
  }); M(ws, row, 5, row, COLS);
  RH(ws, row, 22); row++;
  SPACER(ws, row, 14, COLS); row++;

  // ── FUND INSTALLMENTS ──────────────────────────────────────────────────────
  if (project.installments && project.installments.length > 0) {
    WR(ws, row, 0, 3, 'FUND INSTALLMENTS', {
      font: F({ sz: 9, bold: true, color: P.DARK }), fill: BG(P.WHITE), alignment: AL('left'),
    }); M(ws, row, 0, row, 3);
    WR(ws, row, 4, COLS, project.installments.length + ' installment' + (project.installments.length !== 1 ? 's' : ''), {
      font: F({ sz: 8, color: P.SECT_TXT }), fill: BG(P.SECT_BG), alignment: AL('center'),
      border: { top: TH(), bottom: TH(), left: TH(), right: TH() },
    }); M(ws, row, 4, row, COLS); RH(ws, row, 20); row++;

    ['#', 'EXPECTED DATE', 'AMOUNT', 'STATUS', 'DATE RECEIVED', 'NOTE', ''].forEach((h, c) => {
      W(ws, row, c, h, {
        font: F({ sz: 8, bold: true, color: P.WHITE }),
        fill: BG(P.DARK), alignment: AL(c === 2 ? 'right' : 'left'),
        border: { bottom: TH(P.GREEN) },
      });
    });
    RH(ws, row, 20); row++;

    let instTotal = 0;
    project.installments.forEach((inst, i) => {
      const bg    = i % 2 === 0 ? P.ALT : P.WHITE;
      const isRec = inst.status === 'received';
      instTotal  += N(inst.amount);
      ['#' + (i + 1), fmtDate(inst.expected_date), N(inst.amount),
        isRec ? '✓ Received' : 'Pending',
        inst.received_date ? fmtDate(inst.received_date) : '—',
        inst.note || '—', '',
      ].forEach((val, c) => {
        const isAmt = c === 2, isSt = c === 3;
        W(ws, row, c, val, {
          font: F({ bold: isSt, color: isSt ? (isRec ? P.SUCCESS : P.AMBER) : 'FF1A1A1A' }),
          fill: BG(bg), alignment: AL(isAmt ? 'right' : 'left'),
          border: { bottom: TH() }, numFmt: isAmt ? '#,##0.00' : undefined,
        }, isAmt ? 'n' : 's');
      });
      RH(ws, row, 20); row++;
    });

    WR(ws, row, 0, 1, 'Total', {
      font: F({ bold: true }), fill: BG(P.TOTAL_BG), alignment: AL('left'),
      border: { top: MD(), bottom: MD() },
    }); M(ws, row, 0, row, 1);
    W(ws, row, 2, instTotal, {
      font: F({ bold: true, sz: 11, color: P.DARK }), fill: BG(P.TOTAL_BG), alignment: AL('right'),
      border: { top: MD(), bottom: MD() }, numFmt: '#,##0.00',
    }, 'n');
    for (let c = 3; c <= COLS; c++) W(ws, row, c, '', { fill: BG(P.TOTAL_BG), border: { top: MD(), bottom: MD() } });
    RH(ws, row, 22); row++;
    SPACER(ws, row, 14, COLS); row++;
  }

  // ── MEMBER SUMMARY ─────────────────────────────────────────────────────────
  WR(ws, row, 0, 3, 'MEMBER SUMMARY', {
    font: F({ sz: 9, bold: true, color: P.DARK }), fill: BG(P.WHITE), alignment: AL('left'),
  }); M(ws, row, 0, row, 3);
  WR(ws, row, 4, COLS, project.members.length + ' member' + (project.members.length !== 1 ? 's' : ''), {
    font: F({ sz: 8, color: P.SECT_TXT }), fill: BG(P.SECT_BG), alignment: AL('center'),
    border: { top: TH(), bottom: TH(), left: TH(), right: TH() },
  }); M(ws, row, 4, row, COLS); RH(ws, row, 20); row++;

  ['NAME', 'EMAIL', 'ROLE', 'EXPENSES', 'TOTAL', 'REIMBURSED', 'PENDING'].forEach((h, c) => {
    W(ws, row, c, h, {
      font: F({ sz: 8, bold: true, color: P.WHITE }),
      fill: BG(P.DARK), alignment: AL(c >= 3 ? 'right' : 'left'),
      border: { bottom: TH(P.GREEN) },
    });
  });
  RH(ws, row, 20); row++;

  project.members.forEach((m, i) => {
    const me = expenses.filter(e => e.submitted_by === m.id);
    const mS = me.reduce((a, e) => a + N(e.amount), 0);
    const mR = me.filter(e => e.reimbursed).reduce((a, e) => a + N(e.amount), 0);
    const mP = mS - mR;
    const bg = i % 2 === 0 ? P.ALT : P.WHITE;
    [m.name, m.email, m.role, me.length, mS, mR, mP].forEach((val, c) => {
      const isNum = c >= 3;
      W(ws, row, c, val, {
        font: F({ bold: c === 0, color: c === 6 && mP > 0 ? P.AMBER : c === 5 ? P.SUCCESS : 'FF1A1A1A' }),
        fill: BG(bg), alignment: AL(isNum ? 'right' : 'left'),
        border: { bottom: TH() }, numFmt: c >= 4 ? '#,##0.00' : undefined,
      }, isNum ? 'n' : 's');
    });
    RH(ws, row, 20); row++;
  });
  SPACER(ws, row, 14, COLS); row++;

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  BAND(ws, row, 3, P.GREEN, COLS); row++;
  WR(ws, row, 0, 3, 'ResearchTrack v2.0  ·  Faculty of Graduate Studies, Daffodil International University', {
    font: F({ sz: 7, italic: true, color: P.SECT_TXT }), fill: BG(P.WHITE), alignment: AL('left'),
  }); M(ws, row, 0, row, 3);
  WR(ws, row, 4, COLS, 'Developed by Tariqul Islam  ·  © 2025 FGS, DIU', {
    font: F({ sz: 7, italic: true, color: P.SECT_TXT }), fill: BG(P.WHITE), alignment: AL('right'),
  }); M(ws, row, 4, row, COLS); RH(ws, row, 14); row++;

  ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: COLS } });
  ws['!cols'] = [14, 18, 20, 36, 14, 22, 14].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');
  XLSX.writeFile(wb, project.code + '-Report-' + new Date().toISOString().split('T')[0] + '.xlsx', { bookType: 'xlsx', cellStyles: true });
}


// ═════════════════════════════════════════════════════════════════════════════
//  ALL-EXPENSES PAGE EXPORT
// ═════════════════════════════════════════════════════════════════════════════
export function exportExpensesXlsx({ displayed, totals, filters, projects, search, user, getCatLabel, fmtDate, CAT_LABELS }) {
  const wb    = XLSX.utils.book_new();
  const ws    = {};
  const COLS  = 6;
  let   row   = 0;
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── HEADER ─────────────────────────────────────────────────────────────────
  WR(ws, row, 0, COLS, 'DAFFODIL INTERNATIONAL UNIVERSITY  ·  FACULTY OF GRADUATE STUDIES', {
    font: F({ sz: 8, bold: true, color: P.GREEN }),
    fill: BG(P.DARK), alignment: AL('left'),
  }); M(ws, row, 0, row, COLS); RH(ws, row, 20); row++;

  WR(ws, row, 0, 4, 'RESEARCH EXPENSE REPORT', {
    font: F({ sz: 16, bold: true, color: P.DARK }),
    fill: BG(P.WHITE), alignment: AL('left', 'center'),
  }); M(ws, row, 0, row, 4);
  WR(ws, row, 5, COLS, today, {
    font: F({ sz: 8, italic: true, color: P.SECT_TXT }),
    fill: BG(P.WHITE), alignment: AL('right', 'center'),
  }); M(ws, row, 5, row, COLS); RH(ws, row, 36); row++;

  BAND(ws, row, 4, P.GREEN, COLS); row++;
  SPACER(ws, row, 10, COLS); row++;

  // ── SUMMARY CARDS ──────────────────────────────────────────────────────────
  const rate      = totals.total > 0 ? (totals.reimbursed / totals.total * 100).toFixed(1) + '%' : '0.0%';
  const sumLabels = ['TOTAL EXPENSES', 'REIMBURSED', 'PENDING', 'REIMBURSEMENT RATE'];
  const sumValues = [BDT(totals.total), BDT(totals.reimbursed), BDT(totals.pending), rate];
  const sumColors = [P.DARK, P.SUCCESS, P.AMBER, P.BLUE];
  // Spans: cols 0-1, 2-3, 4-5, 6-6
  const spans = [[0,1],[2,3],[4,5],[6,6]];

  sumLabels.forEach((lbl, i) => {
    const [c1, c2] = spans[i];
    WR(ws, row, c1, c2, lbl, {
      font: F({ sz: 7, bold: true, color: P.SECT_TXT }), fill: BG(P.SECT_BG), alignment: AL('center'),
      border: { top: MD(), left: TH(P.GREEN_BD), right: TH(P.GREEN_BD), bottom: NO() },
    }); if (c1 !== c2) M(ws, row, c1, row, c2);
  });
  RH(ws, row, 18); row++;

  sumValues.forEach((val, i) => {
    const [c1, c2] = spans[i];
    WR(ws, row, c1, c2, val, {
      font: F({ sz: 13, bold: true, color: sumColors[i] }), fill: BG(P.GREEN_LT), alignment: AL('center'),
      border: { bottom: MD(), left: TH(P.GREEN_BD), right: TH(P.GREEN_BD), top: NO() },
    }); if (c1 !== c2) M(ws, row, c1, row, c2);
  });
  RH(ws, row, 30); row++;
  SPACER(ws, row, 10, COLS); row++;

  // ── META ───────────────────────────────────────────────────────────────────
  W(ws, row, 0, 'Generated by', { font: F({ sz: 8, bold: true, color: P.SECT_TXT }), fill: BG(P.SECT_BG), border: { top: TH(), bottom: TH(), left: TH(), right: TH() }, alignment: AL('left') });
  WR(ws, row, 1, 3, user?.name || '', { font: F({ sz: 8 }), fill: BG(P.WHITE), border: { top: TH(), bottom: TH(), left: TH(), right: TH() }, alignment: AL('left') }); M(ws, row, 1, row, 3);
  W(ws, row, 4, 'Total Records', { font: F({ sz: 8, bold: true, color: P.SECT_TXT }), fill: BG(P.SECT_BG), border: { top: TH(), bottom: TH(), left: TH(), right: TH() }, alignment: AL('left') });
  WR(ws, row, 5, COLS, displayed.length, { font: F({ sz: 8, bold: true }), fill: BG(P.WHITE), border: { top: TH(), bottom: TH(), left: TH(), right: TH() }, alignment: AL('right') }, 'n'); M(ws, row, 5, row, COLS);
  RH(ws, row, 18); row++;

  // Active filters
  const af = [];
  if (filters.project_id) { const p = projects.find(p => String(p.id) === String(filters.project_id)); if (p) af.push('Project: ' + p.code); }
  if (filters.reimbursed === 'true')  af.push('Status: Reimbursed');
  if (filters.reimbursed === 'false') af.push('Status: Pending');
  if (filters.category)  af.push('Category: ' + (CAT_LABELS[filters.category] || filters.category));
  if (filters.from_date) af.push('From: ' + fmtDate(filters.from_date));
  if (filters.to_date)   af.push('To: ' + fmtDate(filters.to_date));
  if (search) af.push('Search: "' + search + '"');
  if (af.length) {
    W(ws, row, 0, 'Active Filters', { font: F({ sz: 8, bold: true, color: P.SECT_TXT }), fill: BG(P.SECT_BG), border: { top: TH(), bottom: TH(), left: TH(), right: TH() }, alignment: AL('left') });
    WR(ws, row, 1, COLS, af.join('  |  '), { font: F({ sz: 8 }), fill: BG(P.WHITE), border: { top: TH(), bottom: TH(), left: TH(), right: TH() }, alignment: AL('left') }); M(ws, row, 1, row, COLS);
    RH(ws, row, 18); row++;
  }
  SPACER(ws, row, 14, COLS); row++;

  // ── EXPENSE RECORDS TABLE ──────────────────────────────────────────────────
  WR(ws, row, 0, 4, 'EXPENSE RECORDS', {
    font: F({ sz: 9, bold: true, color: P.DARK }), fill: BG(P.WHITE), alignment: AL('left'),
  }); M(ws, row, 0, row, 4);
  WR(ws, row, 5, COLS, displayed.length + ' record' + (displayed.length !== 1 ? 's' : ''), {
    font: F({ sz: 8, color: P.SECT_TXT }), fill: BG(P.SECT_BG), alignment: AL('center'),
    border: { top: TH(), bottom: TH(), left: TH(), right: TH() },
  }); M(ws, row, 5, row, COLS); RH(ws, row, 20); row++;

  ['DATE', 'PROJECT', 'SUBMITTED BY', 'CATEGORY', 'DESCRIPTION', 'AMOUNT', 'STATUS'].forEach((h, c) => {
    W(ws, row, c, h, {
      font: F({ sz: 8, bold: true, color: P.WHITE }),
      fill: BG(P.DARK), alignment: AL(c === 5 ? 'right' : 'left'),
      border: { bottom: TH(P.GREEN) },
    });
  });
  RH(ws, row, 20); row++;

  displayed.forEach((e, i) => {
    const bg  = i % 2 === 0 ? P.ALT : P.WHITE;
    const stC = e.reimbursed ? P.SUCCESS : P.AMBER;
    [
      fmtDate(e.expense_date),
      (e.project_code || '') + (e.project_name ? '\n' + e.project_name : ''),
      e.submitted_by_name || '',
      getCatLabel(e),
      e.description + (e.receipt_note ? '\n' + e.receipt_note : ''),
      N(e.amount),
      e.reimbursed ? '✓ Reimbursed' : 'Pending',
    ].forEach((val, c) => {
      const isAmt = c === 5, isSt = c === 6;
      W(ws, row, c, val, {
        font: F({ bold: isAmt || isSt, color: isSt ? stC : 'FF1A1A1A' }),
        fill: BG(isSt && !e.reimbursed ? P.AMBER_LT : bg),
        alignment: AL(isAmt ? 'right' : 'left', 'center', c === 4),
        border: { bottom: TH() }, numFmt: isAmt ? '#,##0.00' : undefined,
      }, isAmt ? 'n' : 's');
    });
    RH(ws, row, e.receipt_note || e.project_name ? 28 : 20); row++;
  });

  // Totals
  WR(ws, row, 0, 4, 'Total  ·  ' + displayed.length + ' records', {
    font: F({ bold: true, color: P.SECT_TXT }), fill: BG(P.TOTAL_BG), alignment: AL('left'),
    border: { top: MD(), bottom: MD() },
  }); M(ws, row, 0, row, 4);
  W(ws, row, 5, N(totals.total), {
    font: F({ bold: true, sz: 11, color: P.DARK }), fill: BG(P.TOTAL_BG), alignment: AL('right'),
    border: { top: MD(), bottom: MD() }, numFmt: '#,##0.00',
  }, 'n');
  W(ws, row, 6, BDT(totals.reimbursed) + ' reimb  ·  ' + BDT(totals.pending) + ' pending', {
    font: F({ sz: 8, color: P.SECT_TXT }), fill: BG(P.TOTAL_BG), alignment: AL('left'),
    border: { top: MD(), bottom: MD() },
  });
  RH(ws, row, 22); row++;
  SPACER(ws, row, 14, COLS); row++;

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  BAND(ws, row, 3, P.GREEN, COLS); row++;
  WR(ws, row, 0, 3, 'ResearchTrack v2.0  ·  Faculty of Graduate Studies, Daffodil International University', {
    font: F({ sz: 7, italic: true, color: P.SECT_TXT }), fill: BG(P.WHITE), alignment: AL('left'),
  }); M(ws, row, 0, row, 3);
  WR(ws, row, 4, COLS, 'Developed by Tariqul Islam  ·  © 2025 FGS, DIU', {
    font: F({ sz: 7, italic: true, color: P.SECT_TXT }), fill: BG(P.WHITE), alignment: AL('right'),
  }); M(ws, row, 4, row, COLS); RH(ws, row, 14); row++;

  ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: COLS } });
  ws['!cols'] = [12, 20, 18, 20, 32, 14, 18].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');
  XLSX.writeFile(wb, 'Expenses-Report-' + new Date().toISOString().split('T')[0] + '.xlsx', { bookType: 'xlsx', cellStyles: true });
}
