/**
 * exportXlsx.js — Professional XLSX report matching the PDF design exactly.
 * Requires: xlsx-js-style ^1.2.0  (writeFile with cellStyles:true)
 *
 * Sections (same order as PDF):
 *   1. Header band      — dark bg, institution name, project code badge, title, date
 *   2. Summary cards    — 6 cards: Budget | Spent | Reimbursed | Pending | Remaining | Utilised%
 *   3. Progress bar     — colour-coded cell bar
 *   4. Expense Records  — dark header, alternating rows, status colours, totals footer
 *   5. Fund Installments— (if any)
 *   6. Member Summary
 *   7. Footer band
 */
import * as XLSX from 'xlsx-js-style';

// ─── Palette (ARGB — matches PDF CSS exactly) ────────────────────────────────
const P = {
  DARK:      'FF0D1F17',   // #0d1f17  header/table-head bg
  GREEN:     'FF28E98C',   // #28e98c  accent green
  GREEN_LT:  'FFE8FFF4',   // #e8fff4  card / badge bg
  GREEN_BD:  'FFA7F3D0',   // #a7f3d0  card / badge border
  GREEN_MID: 'FF34D399',   // progress fill mid-shade
  SUCCESS:   'FF16A34A',   // #16a34a  reimbursed text
  AMBER:     'FFD97706',   // #d97706  pending text
  AMBER_LT:  'FFFEFCE8',   // pending badge bg
  RED:       'FFDC2626',
  BLUE:      'FF0891B2',   // total-spent / rate colour
  WHITE:     'FFFFFFFF',
  OFF_WHITE: 'FFFAFAFA',   // alternating row
  SECT_BG:   'FFF3F4F6',   // section label bg  #f3f4f6
  SECT_TXT:  'FF6B7280',   // muted label text   #6b7280
  BORD:      'FFE5E7EB',   // default thin border #e5e7eb
  TOTAL_BG:  'FFF0FFF8',   // totals row bg
  DARK_TXT:  'FF0D1F17',   // primary text same as header
};

// ─── Style factories ─────────────────────────────────────────────────────────
const F = (o = {}) => ({               // font
  name: 'Segoe UI', sz: o.sz ?? 10,
  bold:   o.bold   ?? false,
  italic: o.italic ?? false,
  color: { argb: o.color ?? 'FF1A1A1A' },
});
const BG  = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const AL  = (h = 'left', v = 'center', wrap = false) =>
              ({ horizontal: h, vertical: v, wrapText: wrap });

// Border helpers — top/right/bottom/left can be set individually
const BD = {
  none:  side => ({ style: 'none', color: { argb: P.WHITE } }),
  thin:  (argb = P.BORD)     => ({ style: 'thin',   color: { argb } }),
  med:   (argb = P.GREEN_BD) => ({ style: 'medium', color: { argb } }),
  thick: (argb = P.DARK)     => ({ style: 'thick',  color: { argb } }),
};
const allBD  = (fn)  => ({ top: fn(), bottom: fn(), left: fn(), right: fn() });
const allThin = (argb = P.BORD)     => allBD(() => BD.thin(argb));
const allMed  = (argb = P.GREEN_BD) => allBD(() => BD.med(argb));

// ─── Cell writer ─────────────────────────────────────────────────────────────
function W(ws, r, c, v, s = {}, t = null) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const type = t ?? (typeof v === 'number' ? 'n' : 's');
  ws[addr] = { v: v ?? '', t: type, s };
  return addr;
}

// ─── Merge ───────────────────────────────────────────────────────────────────
function M(ws, r1, c1, r2, c2) {
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
}

// ─── Row height ──────────────────────────────────────────────────────────────
function RH(ws, r, hpt) {
  if (!ws['!rows']) ws['!rows'] = [];
  ws['!rows'][r] = { hpt };
}

// ─── Fill an entire row with a bg colour (for blank spacer rows) ─────────────
function fillRow(ws, r, c1, c2, argb) {
  for (let c = c1; c <= c2; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!ws[addr]) ws[addr] = { v: '', t: 's' };
    ws[addr].s = { ...(ws[addr].s || {}), fill: BG(argb) };
  }
}

// ─── Number helpers ──────────────────────────────────────────────────────────
const N   = v  => Number(v || 0);
const BDT = v  => '৳' + N(v).toLocaleString('en-BD', { minimumFractionDigits: 2 });
const PCT = v  => N(v).toFixed(1) + '%';


// ═════════════════════════════════════════════════════════════════════════════
//  PROJECT DETAIL EXPORT
//  One sheet — matches the PDF page layout section by section
// ═════════════════════════════════════════════════════════════════════════════
export function exportProjectXlsx({ project, expenses, stats, getCatLabel, fmtDate }) {
  const wb   = XLSX.utils.book_new();
  const ws   = {};
  const LAST = 6;   // columns A–G  (indices 0–6)
  let   row  = 0;

  // Pre-computed numbers
  const budget      = N(project.total_budget);
  const spent       = N(stats.total_spent);
  const reimbursed  = N(stats.total_reimbursed);
  const pending     = N(stats.total_pending);
  const remaining   = budget - spent;
  const pct         = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const todayStr    = new Date().toLocaleDateString('en-GB',
                        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── 1. HEADER BAND ────────────────────────────────────────────────────────
  // Row A: dark bg — institution name in green
  W(ws, row, 0, 'DAFFODIL INTERNATIONAL UNIVERSITY  ·  FACULTY OF GRADUATE STUDIES', {
    font: F({ sz: 8, bold: true, color: P.GREEN }),
    fill: BG(P.DARK), alignment: AL('left'),
    border: { bottom: BD.thin(P.GREEN) },
  }); M(ws, row, 0, row, LAST); RH(ws, row, 20); row++;

  // Row B: project code (badge style left) + "Expense Report · date" right
  W(ws, row, 0, ' ' + project.code + ' ', {
    font: F({ sz: 9, bold: true, color: '0D7A4E' }),
    fill: BG(P.GREEN_LT),
    alignment: AL('left'),
    border: {
      top: BD.thin(P.GREEN_BD), bottom: BD.thin(P.GREEN_BD),
      left: BD.thin(P.GREEN_BD), right: BD.thin(P.GREEN_BD),
    },
  });
  W(ws, row, 1, 'Expense Report  ·  ' + todayStr, {
    font: F({ sz: 8, italic: true, color: P.SECT_TXT }),
    fill: BG(P.DARK), alignment: AL('right'),
  }); M(ws, row, 1, row, LAST); RH(ws, row, 18); row++;

  // Row C: project title — large bold
  W(ws, row, 0, project.name, {
    font: F({ sz: 16, bold: true, color: P.DARK }),
    fill: BG(P.WHITE), alignment: AL('left', 'center', true),
  }); M(ws, row, 0, row, LAST); RH(ws, row, 48); row++;

  // Row D: description (if any)
  if (project.description) {
    W(ws, row, 0, project.description, {
      font: F({ sz: 9, italic: true, color: P.SECT_TXT }),
      fill: BG(P.WHITE), alignment: AL('left', 'center', true),
    }); M(ws, row, 0, row, LAST); RH(ws, row, 16); row++;
  }

  // Accent separator (3 pt green band — like the PDF's border-bottom: 3pt solid #28e98c)
  for (let c = 0; c <= LAST; c++) {
    W(ws, row, c, '', { fill: BG(P.GREEN) });
  }
  RH(ws, row, 4); row++;

  // Blank spacer
  fillRow(ws, row, 0, LAST, P.WHITE); RH(ws, row, 8); row++;

  // ── 2. SUMMARY CARDS (6 columns, matches PDF exactly) ────────────────────
  // Label row
  const cardLabels = ['TOTAL BUDGET', 'TOTAL SPENT', 'REIMBURSED', 'PENDING', 'REMAINING', 'UTILISED'];
  const cardValues = [BDT(budget), BDT(spent), BDT(reimbursed), BDT(pending), BDT(remaining), PCT(pct)];
  const cardColors = [
    P.DARK_TXT, P.BLUE, P.SUCCESS, P.AMBER,
    remaining < 0 ? P.RED : P.SUCCESS,
    pct > 90 ? P.RED : pct > 70 ? P.AMBER : P.DARK_TXT,
  ];

  cardLabels.forEach((lbl, c) => {
    W(ws, row, c, lbl, {
      font: F({ sz: 7, bold: true, color: P.SECT_TXT }),
      fill: BG(P.SECT_BG),
      alignment: AL('center'),
      border: {
        top:   BD.med(P.GREEN_BD), left:  BD.thin(P.GREEN_BD),
        right: BD.thin(P.GREEN_BD), bottom: BD.none(),
      },
    });
  });
  RH(ws, row, 18); row++;

  cardValues.forEach((val, c) => {
    W(ws, row, c, val, {
      font: F({ sz: 14, bold: true, color: cardColors[c] }),
      fill: BG(P.GREEN_LT),
      alignment: AL('center'),
      border: {
        top:    BD.none(),
        bottom: BD.med(P.GREEN_BD),
        left:   BD.thin(P.GREEN_BD),
        right:  BD.thin(P.GREEN_BD),
      },
    });
  });
  RH(ws, row, 32); row++;

  // Spacer
  fillRow(ws, row, 0, LAST, P.WHITE); RH(ws, row, 6); row++;

  // ── 3. PROGRESS BAR ───────────────────────────────────────────────────────
  W(ws, row, 0, 'Budget Utilisation', {
    font: F({ sz: 8, color: P.SECT_TXT }),
    fill: BG(P.WHITE), alignment: AL('left'),
    border: { bottom: BD.thin() },
  }); M(ws, row, 0, row, 4);
  W(ws, row, 5, BDT(spent) + ' of ' + BDT(budget), {
    font: F({ sz: 8, color: P.SECT_TXT }),
    fill: BG(P.WHITE), alignment: AL('right'),
    border: { bottom: BD.thin() },
  }); M(ws, row, 5, row, LAST); row++;

  // Colour bar — filled cells = progress, rest = bg track
  const barColor  = pct > 90 ? P.RED : pct > 70 ? P.AMBER : P.GREEN;
  const filledN   = Math.max(1, Math.round(pct / 100 * (LAST + 1)));
  for (let c = 0; c <= LAST; c++) {
    W(ws, row, c, '', { fill: BG(c < filledN ? barColor : P.BORD) });
  }
  RH(ws, row, 7); row++;

  // Spacer
  fillRow(ws, row, 0, LAST, P.WHITE); RH(ws, row, 14); row++;

  // ── 4. EXPENSE RECORDS ────────────────────────────────────────────────────
  // Section label
  W(ws, row, 0, 'EXPENSE RECORDS', {
    font: F({ sz: 9, bold: true, color: P.DARK_TXT }),
    fill: BG(P.WHITE), alignment: AL('left'),
  }); M(ws, row, 0, row, 3);
  W(ws, row, 4, expenses.length + ' entr' + (expenses.length === 1 ? 'y' : 'ies'), {
    font: F({ sz: 8, color: P.SECT_TXT }),
    fill: BG(P.SECT_BG),
    alignment: AL('center'),
    border: allThin(P.BORD),
  }); M(ws, row, 4, row, LAST); RH(ws, row, 20); row++;

  // Column headers — dark bg like PDF
  const expCols = ['DATE', 'RESEARCHER', 'CATEGORY', 'DESCRIPTION', 'AMOUNT', 'STATUS'];
  // Map to actual columns: 0,1,2,3,4,5  (col 6 stays empty / merged away)
  expCols.forEach((h, c) => {
    W(ws, row, c, h, {
      font: F({ sz: 8, bold: true, color: P.WHITE }),
      fill: BG(P.DARK),
      alignment: AL(c === 4 ? 'right' : 'left'),
      border: { bottom: BD.thin(P.GREEN) },
    });
  });
  W(ws, row, 6, '', { fill: BG(P.DARK) }); // fill last col same dark
  RH(ws, row, 20); row++;

  // Data rows
  expenses.forEach((e, i) => {
    const bg      = i % 2 === 0 ? P.OFF_WHITE : P.WHITE;
    const statClr = e.reimbursed ? P.SUCCESS : P.AMBER;
    const rowData = [
      fmtDate(e.expense_date),
      e.submitted_by_name || '',
      getCatLabel(e),
      e.description + (e.receipt_note ? '\n' + e.receipt_note : ''),
      N(e.amount),
      e.reimbursed ? '✓ Reimbursed' : 'Pending',
    ];
    rowData.forEach((val, c) => {
      const isAmt = c === 4;
      const isSt  = c === 5;
      W(ws, row, c, val, {
        font: F({
          bold:  isAmt || isSt,
          color: isSt ? statClr : isAmt ? P.DARK_TXT : 'FF1A1A1A',
        }),
        fill: BG(isSt && !e.reimbursed ? P.AMBER_LT : bg),
        alignment: AL(isAmt ? 'right' : 'left', 'center', c === 3),
        border: { bottom: BD.thin() },
        numFmt: isAmt ? '#,##0.00' : undefined,
      }, isAmt ? 'n' : 's');
    });
    W(ws, row, 6, '', { fill: BG(bg), border: { bottom: BD.thin() } });
    RH(ws, row, e.receipt_note ? 28 : 20); row++;
  });

  // Totals footer — green-tinted
  W(ws, row, 0, 'Total — ' + expenses.length + ' record' + (expenses.length !== 1 ? 's' : ''), {
    font: F({ bold: true, color: P.SECT_TXT }),
    fill: BG(P.TOTAL_BG),
    alignment: AL('left'),
    border: { top: BD.med(P.GREEN_BD), bottom: BD.med(P.GREEN_BD) },
  }); M(ws, row, 0, row, 3);
  W(ws, row, 4, N(stats.total_spent), {
    font: F({ bold: true, sz: 11, color: P.DARK_TXT }),
    fill: BG(P.TOTAL_BG),
    alignment: AL('right'),
    border: { top: BD.med(P.GREEN_BD), bottom: BD.med(P.GREEN_BD) },
    numFmt: '#,##0.00',
  }, 'n');
  W(ws, row, 5, BDT(reimbursed) + ' paid  ·  ' + BDT(pending) + ' pending', {
    font: F({ sz: 8, color: P.SECT_TXT }),
    fill: BG(P.TOTAL_BG),
    alignment: AL('left'),
    border: { top: BD.med(P.GREEN_BD), bottom: BD.med(P.GREEN_BD) },
  }); M(ws, row, 5, row, LAST);
  RH(ws, row, 20); row++;

  // Spacer
  fillRow(ws, row, 0, LAST, P.WHITE); RH(ws, row, 14); row++;

  // ── 5. FUND INSTALLMENTS ──────────────────────────────────────────────────
  if (project.installments && project.installments.length > 0) {
    W(ws, row, 0, 'FUND INSTALLMENTS', {
      font: F({ sz: 9, bold: true, color: P.DARK_TXT }),
      fill: BG(P.WHITE), alignment: AL('left'),
    }); M(ws, row, 0, row, 3);
    W(ws, row, 4, project.installments.length + ' installment' + (project.installments.length !== 1 ? 's' : ''), {
      font: F({ sz: 8, color: P.SECT_TXT }),
      fill: BG(P.SECT_BG), alignment: AL('center'), border: allThin(),
    }); M(ws, row, 4, row, LAST); RH(ws, row, 20); row++;

    ['#', 'EXPECTED DATE', 'AMOUNT', 'STATUS', 'DATE RECEIVED', 'NOTE'].forEach((h, c) => {
      W(ws, row, c, h, {
        font: F({ sz: 8, bold: true, color: P.WHITE }),
        fill: BG(P.DARK), alignment: AL(c === 2 ? 'right' : 'left'),
        border: { bottom: BD.thin(P.GREEN) },
      });
    });
    W(ws, row, 6, '', { fill: BG(P.DARK) }); RH(ws, row, 20); row++;

    let instTotal = 0;
    project.installments.forEach((inst, i) => {
      const bg    = i % 2 === 0 ? P.OFF_WHITE : P.WHITE;
      const isRec = inst.status === 'received';
      instTotal  += N(inst.amount);
      ['#' + (i + 1), fmtDate(inst.expected_date), N(inst.amount),
        isRec ? '✓ Received' : 'Pending',
        inst.received_date ? fmtDate(inst.received_date) : '—',
        inst.note || '—',
      ].forEach((val, c) => {
        const isAmt = c === 2, isSt = c === 3;
        W(ws, row, c, val, {
          font: F({ bold: isSt, color: isSt ? (isRec ? P.SUCCESS : P.AMBER) : 'FF1A1A1A' }),
          fill: BG(bg),
          alignment: AL(isAmt ? 'right' : 'left'),
          border: { bottom: BD.thin() },
          numFmt: isAmt ? '#,##0.00' : undefined,
        }, isAmt ? 'n' : 's');
      });
      W(ws, row, 6, '', { fill: BG(bg), border: { bottom: BD.thin() } });
      RH(ws, row, 20); row++;
    });

    // Installments total
    W(ws, row, 0, 'Total', {
      font: F({ bold: true }), fill: BG(P.TOTAL_BG),
      alignment: AL('left'),
      border: { top: BD.med(P.GREEN_BD), bottom: BD.med(P.GREEN_BD) },
    }); M(ws, row, 0, row, 1);
    W(ws, row, 2, instTotal, {
      font: F({ bold: true, sz: 11, color: P.DARK_TXT }),
      fill: BG(P.TOTAL_BG), alignment: AL('right'),
      border: { top: BD.med(P.GREEN_BD), bottom: BD.med(P.GREEN_BD) },
      numFmt: '#,##0.00',
    }, 'n');
    for (let c = 3; c <= LAST; c++) {
      W(ws, row, c, '', { fill: BG(P.TOTAL_BG), border: { top: BD.med(P.GREEN_BD), bottom: BD.med(P.GREEN_BD) } });
    }
    RH(ws, row, 20); row++;
    fillRow(ws, row, 0, LAST, P.WHITE); RH(ws, row, 14); row++;
  }

  // ── 6. MEMBER SUMMARY ─────────────────────────────────────────────────────
  W(ws, row, 0, 'MEMBER SUMMARY', {
    font: F({ sz: 9, bold: true, color: P.DARK_TXT }),
    fill: BG(P.WHITE), alignment: AL('left'),
  }); M(ws, row, 0, row, 3);
  W(ws, row, 4, project.members.length + ' member' + (project.members.length !== 1 ? 's' : ''), {
    font: F({ sz: 8, color: P.SECT_TXT }),
    fill: BG(P.SECT_BG), alignment: AL('center'), border: allThin(),
  }); M(ws, row, 4, row, LAST); RH(ws, row, 20); row++;

  ['NAME', 'EMAIL', 'ROLE', 'EXPENSES', 'TOTAL', 'REIMBURSED', 'PENDING'].forEach((h, c) => {
    W(ws, row, c, h, {
      font: F({ sz: 8, bold: true, color: P.WHITE }),
      fill: BG(P.DARK), alignment: AL(c >= 3 ? 'right' : 'left'),
      border: { bottom: BD.thin(P.GREEN) },
    });
  });
  RH(ws, row, 20); row++;

  project.members.forEach((m, i) => {
    const me = expenses.filter(e => e.submitted_by === m.id);
    const mS = me.reduce((a, e) => a + N(e.amount), 0);
    const mR = me.filter(e => e.reimbursed).reduce((a, e) => a + N(e.amount), 0);
    const mP = mS - mR;
    const bg = i % 2 === 0 ? P.OFF_WHITE : P.WHITE;
    [m.name, m.email, m.role, me.length, mS, mR, mP].forEach((val, c) => {
      const isNum = c >= 3;
      W(ws, row, c, val, {
        font: F({
          bold:  c === 0,
          color: c === 6 && mP > 0 ? P.AMBER : c === 5 ? P.SUCCESS : 'FF1A1A1A',
        }),
        fill: BG(bg),
        alignment: AL(isNum ? 'right' : 'left'),
        border: { bottom: BD.thin() },
        numFmt: c >= 4 ? '#,##0.00' : undefined,
      }, isNum ? 'n' : 's');
    });
    RH(ws, row, 20); row++;
  });

  fillRow(ws, row, 0, LAST, P.WHITE); RH(ws, row, 14); row++;

  // ── 7. FOOTER BAND ────────────────────────────────────────────────────────
  for (let c = 0; c <= LAST; c++) W(ws, row, c, '', { fill: BG(P.GREEN) });
  RH(ws, row, 3); row++;

  W(ws, row, 0, 'ResearchTrack v2.0  ·  Faculty of Graduate Studies, Daffodil International University', {
    font: F({ sz: 7, italic: true, color: P.SECT_TXT }),
    fill: BG(P.WHITE), alignment: AL('left'),
  }); M(ws, row, 0, row, 3);
  W(ws, row, 4, 'Developed by Tariqul Islam  ·  © 2025 FGS, DIU', {
    font: F({ sz: 7, italic: true, color: P.SECT_TXT }),
    fill: BG(P.WHITE), alignment: AL('right'),
  }); M(ws, row, 4, row, LAST); RH(ws, row, 14); row++;

  // ── Sheet metadata ─────────────────────────────────────────────────────────
  ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: LAST } });
  ws['!cols'] = [14, 18, 20, 36, 14, 22, 14].map(w => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');
  XLSX.writeFile(wb,
    `${project.code}-Report-${new Date().toISOString().split('T')[0]}.xlsx`,
    { bookType: 'xlsx', cellStyles: true }
  );
}


// ═════════════════════════════════════════════════════════════════════════════
//  ALL-EXPENSES PAGE EXPORT
// ═════════════════════════════════════════════════════════════════════════════
export function exportExpensesXlsx({ displayed, totals, filters, projects, search, user, getCatLabel, fmtDate, CAT_LABELS }) {
  const wb   = XLSX.utils.book_new();
  const ws   = {};
  const LAST = 6;
  let   row  = 0;
  const todayStr = new Date().toLocaleDateString('en-GB',
                     { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── 1. HEADER BAND ────────────────────────────────────────────────────────
  W(ws, row, 0, 'DAFFODIL INTERNATIONAL UNIVERSITY  ·  FACULTY OF GRADUATE STUDIES', {
    font: F({ sz: 8, bold: true, color: P.GREEN }),
    fill: BG(P.DARK), alignment: AL('left'),
    border: { bottom: BD.thin(P.GREEN) },
  }); M(ws, row, 0, row, LAST); RH(ws, row, 20); row++;

  W(ws, row, 0, 'RESEARCH EXPENSE REPORT', {
    font: F({ sz: 16, bold: true, color: P.DARK }),
    fill: BG(P.WHITE), alignment: AL('left', 'center'),
  }); M(ws, row, 0, row, 4);
  W(ws, row, 5, todayStr, {
    font: F({ sz: 8, italic: true, color: P.SECT_TXT }),
    fill: BG(P.WHITE), alignment: AL('right', 'center'),
  }); M(ws, row, 5, row, LAST); RH(ws, row, 36); row++;

  // Green separator
  for (let c = 0; c <= LAST; c++) W(ws, row, c, '', { fill: BG(P.GREEN) });
  RH(ws, row, 4); row++;
  fillRow(ws, row, 0, LAST, P.WHITE); RH(ws, row, 10); row++;

  // ── 2. SUMMARY CARDS ──────────────────────────────────────────────────────
  const rate      = totals.total > 0 ? (totals.reimbursed / totals.total * 100).toFixed(1) + '%' : '0.0%';
  const sumLabels = ['TOTAL EXPENSES', 'REIMBURSED', 'PENDING', 'REIMBURSEMENT RATE'];
  const sumValues = [BDT(totals.total), BDT(totals.reimbursed), BDT(totals.pending), rate];
  const sumColors = [P.DARK_TXT, P.SUCCESS, P.AMBER, P.BLUE];
  // Each card spans 2 cols (0-1, 2-3, 4-5, 6-6 last one single)
  const cardSpan  = [[0,1],[2,3],[4,5],[6,6]];

  sumLabels.forEach((lbl, i) => {
    const [c1, c2] = cardSpan[i];
    W(ws, row, c1, lbl, {
      font: F({ sz: 7, bold: true, color: P.SECT_TXT }),
      fill: BG(P.SECT_BG), alignment: AL('center'),
      border: { top: BD.med(P.GREEN_BD), left: BD.thin(P.GREEN_BD), right: BD.thin(P.GREEN_BD), bottom: BD.none() },
    }); if (c1 !== c2) M(ws, row, c1, row, c2);
  });
  RH(ws, row, 18); row++;

  sumValues.forEach((val, i) => {
    const [c1, c2] = cardSpan[i];
    W(ws, row, c1, val, {
      font: F({ sz: 14, bold: true, color: sumColors[i] }),
      fill: BG(P.GREEN_LT), alignment: AL('center'),
      border: { bottom: BD.med(P.GREEN_BD), left: BD.thin(P.GREEN_BD), right: BD.thin(P.GREEN_BD), top: BD.none() },
    }); if (c1 !== c2) M(ws, row, c1, row, c2);
  });
  RH(ws, row, 32); row++;
  fillRow(ws, row, 0, LAST, P.WHITE); RH(ws, row, 10); row++;

  // ── 3. META INFO ──────────────────────────────────────────────────────────
  W(ws, row, 0, 'Generated by', {
    font: F({ sz: 8, bold: true, color: P.SECT_TXT }),
    fill: BG(P.SECT_BG), border: allThin(), alignment: AL('left'),
  });
  W(ws, row, 1, user?.name || '', {
    font: F({ sz: 8 }), fill: BG(P.WHITE), border: allThin(), alignment: AL('left'),
  }); M(ws, row, 1, row, 3);
  W(ws, row, 4, 'Total Records', {
    font: F({ sz: 8, bold: true, color: P.SECT_TXT }),
    fill: BG(P.SECT_BG), border: allThin(), alignment: AL('left'),
  });
  W(ws, row, 5, displayed.length, {
    font: F({ sz: 8, bold: true }), fill: BG(P.WHITE), border: allThin(), alignment: AL('right'),
  }, 'n'); M(ws, row, 5, row, LAST);
  RH(ws, row, 18); row++;

  // Active filters
  const af = [];
  if (filters.project_id) {
    const p = projects.find(p => String(p.id) === String(filters.project_id));
    if (p) af.push('Project: ' + p.code);
  }
  if (filters.reimbursed === 'true')  af.push('Status: Reimbursed');
  if (filters.reimbursed === 'false') af.push('Status: Pending');
  if (filters.category) af.push('Category: ' + (CAT_LABELS[filters.category] || filters.category));
  if (filters.from_date) af.push('From: ' + fmtDate(filters.from_date));
  if (filters.to_date)   af.push('To: ' + fmtDate(filters.to_date));
  if (search) af.push('Search: "' + search + '"');
  if (af.length) {
    W(ws, row, 0, 'Active Filters', {
      font: F({ sz: 8, bold: true, color: P.SECT_TXT }),
      fill: BG(P.SECT_BG), border: allThin(), alignment: AL('left'),
    });
    W(ws, row, 1, af.join('  |  '), {
      font: F({ sz: 8 }), fill: BG(P.WHITE), border: allThin(), alignment: AL('left'),
    }); M(ws, row, 1, row, LAST);
    RH(ws, row, 18); row++;
  }
  fillRow(ws, row, 0, LAST, P.WHITE); RH(ws, row, 14); row++;

  // ── 4. EXPENSE RECORDS TABLE ──────────────────────────────────────────────
  W(ws, row, 0, 'EXPENSE RECORDS', {
    font: F({ sz: 9, bold: true, color: P.DARK_TXT }),
    fill: BG(P.WHITE), alignment: AL('left'),
  }); M(ws, row, 0, row, 4);
  W(ws, row, 5, displayed.length + ' record' + (displayed.length !== 1 ? 's' : ''), {
    font: F({ sz: 8, color: P.SECT_TXT }),
    fill: BG(P.SECT_BG), alignment: AL('center'), border: allThin(),
  }); M(ws, row, 5, row, LAST); RH(ws, row, 20); row++;

  // Column headers
  ['DATE', 'PROJECT', 'SUBMITTED BY', 'CATEGORY', 'DESCRIPTION', 'AMOUNT', 'STATUS'].forEach((h, c) => {
    W(ws, row, c, h, {
      font: F({ sz: 8, bold: true, color: P.WHITE }),
      fill: BG(P.DARK), alignment: AL(c === 5 ? 'right' : 'left'),
      border: { bottom: BD.thin(P.GREEN) },
    });
  });
  RH(ws, row, 20); row++;

  // Data rows
  displayed.forEach((e, i) => {
    const bg      = i % 2 === 0 ? P.OFF_WHITE : P.WHITE;
    const statClr = e.reimbursed ? P.SUCCESS : P.AMBER;
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
        font: F({ bold: isAmt || isSt, color: isSt ? statClr : 'FF1A1A1A' }),
        fill: BG(isSt && !e.reimbursed ? P.AMBER_LT : bg),
        alignment: AL(isAmt ? 'right' : 'left', 'center', c === 4),
        border: { bottom: BD.thin() },
        numFmt: isAmt ? '#,##0.00' : undefined,
      }, isAmt ? 'n' : 's');
    });
    RH(ws, row, e.receipt_note || e.project_name ? 28 : 20); row++;
  });

  // Totals footer
  W(ws, row, 0, 'Total  ·  ' + displayed.length + ' records', {
    font: F({ bold: true, color: P.SECT_TXT }),
    fill: BG(P.TOTAL_BG), alignment: AL('left'),
    border: { top: BD.med(P.GREEN_BD), bottom: BD.med(P.GREEN_BD) },
  }); M(ws, row, 0, row, 4);
  W(ws, row, 5, N(totals.total), {
    font: F({ bold: true, sz: 11, color: P.DARK_TXT }),
    fill: BG(P.TOTAL_BG), alignment: AL('right'),
    border: { top: BD.med(P.GREEN_BD), bottom: BD.med(P.GREEN_BD) },
    numFmt: '#,##0.00',
  }, 'n');
  W(ws, row, 6, BDT(totals.reimbursed) + ' reimb  ·  ' + BDT(totals.pending) + ' pending', {
    font: F({ sz: 8, color: P.SECT_TXT }),
    fill: BG(P.TOTAL_BG), alignment: AL('left'),
    border: { top: BD.med(P.GREEN_BD), bottom: BD.med(P.GREEN_BD) },
  });
  RH(ws, row, 20); row++;
  fillRow(ws, row, 0, LAST, P.WHITE); RH(ws, row, 14); row++;

  // ── 5. FOOTER BAND ────────────────────────────────────────────────────────
  for (let c = 0; c <= LAST; c++) W(ws, row, c, '', { fill: BG(P.GREEN) });
  RH(ws, row, 3); row++;

  W(ws, row, 0, 'ResearchTrack v2.0  ·  Faculty of Graduate Studies, Daffodil International University', {
    font: F({ sz: 7, italic: true, color: P.SECT_TXT }),
    fill: BG(P.WHITE), alignment: AL('left'),
  }); M(ws, row, 0, row, 3);
  W(ws, row, 4, 'Developed by Tariqul Islam  ·  © 2025 FGS, DIU', {
    font: F({ sz: 7, italic: true, color: P.SECT_TXT }),
    fill: BG(P.WHITE), alignment: AL('right'),
  }); M(ws, row, 4, row, LAST); RH(ws, row, 14); row++;

  // ── Sheet metadata ─────────────────────────────────────────────────────────
  ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: LAST } });
  ws['!cols'] = [12, 20, 18, 20, 32, 14, 18].map(w => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');
  XLSX.writeFile(wb,
    'Expenses-Report-' + new Date().toISOString().split('T')[0] + '.xlsx',
    { bookType: 'xlsx', cellStyles: true }
  );
}
