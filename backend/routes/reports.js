const router   = require('express').Router();
const ExcelJS  = require('exceljs');
const pool     = require('../db/pool');
const { authenticate } = require('../middleware/auth');

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const num     = n => Number(n || 0);
const bdt     = n => num(n).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CAT_LABELS = {
  transportation:       'Transportation',
  printing_stationery:  'Printing & Stationery',
  field_work:           'Field Work',
  communication:        'Communication',
  other:                'Other',
  miscellaneous:        'Miscellaneous',
};
const getCatLabel = e => e.category === 'other' ? (e.other_label || 'Other') : (CAT_LABELS[e.category] || e.category);

// ── Brand palette ────────────────────────────────────────────────────────────
const DARK       = '0D1F17';
const GREEN      = '28E98C';
const GREEN_BG   = 'E8FFF4';
const GREEN_BD   = 'A7F3D0';
const AMBER      = 'D97706';
const AMBER_BG   = 'FFFCE8';
const SUCCESS    = '16A34A';
const RED        = 'DC2626';
const BLUE       = '0891B2';
const WHITE      = 'FFFFFF';
const GRAY_HDR   = 'F3F4F6';
const GRAY_TXT   = '6B7280';
const ROW_ALT    = 'FAFAFA';
const TOTAL_BG   = 'F0FFF8';
const TOTAL_BD   = 'D1FAE5';

// ── Style factories ───────────────────────────────────────────────────────────
const solidFill   = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thinBorder  = argb => ({ style: 'thin', color: { argb } });
const allBorders  = (argb = 'D1D5DB') => ({ top: thinBorder(argb), bottom: thinBorder(argb), left: thinBorder(argb), right: thinBorder(argb) });
const medBorders  = (argb = GREEN_BD) => ({ top: { style:'medium', color:{ argb } }, bottom: { style:'medium', color:{ argb } }, left: { style:'medium', color:{ argb } }, right: { style:'medium', color:{ argb } } });

function applyStyle(cell, { bg, color, bold, sz, align, italic, numFmt, border, wrapText } = {}) {
  if (bg)      cell.fill    = solidFill(bg);
  if (numFmt)  cell.numFmt  = numFmt;
  cell.font = { name: 'Segoe UI', size: sz || 10, bold: !!bold, color: { argb: color || '1A1A1A' }, italic: !!italic };
  cell.alignment = { horizontal: align || 'left', vertical: 'middle', wrapText: !!wrapText };
  if (border)  cell.border  = border;
}

// ── Title row helper ──────────────────────────────────────────────────────────
function titleRow(ws, text, cols, rowHeight = 28) {
  const row = ws.addRow([text]);
  row.height = rowHeight;
  const cell = row.getCell(1);
  applyStyle(cell, { bg: DARK, color: WHITE, bold: true, sz: 13 });
  ws.mergeCells(row.number, 1, row.number, cols);
  // fill merged cells too
  for (let c = 2; c <= cols; c++) {
    const mc = row.getCell(c);
    mc.fill = solidFill(DARK);
  }
  return row;
}

function subTitleRow(ws, text, cols, rowHeight = 18) {
  const row = ws.addRow([text]);
  row.height = rowHeight;
  const cell = row.getCell(1);
  applyStyle(cell, { bg: DARK, color: GREEN, bold: true, sz: 9 });
  ws.mergeCells(row.number, 1, row.number, cols);
  for (let c = 2; c <= cols; c++) row.getCell(c).fill = solidFill(DARK);
  return row;
}

function headerRow(ws, headers, bgColor = DARK, fgColor = WHITE) {
  const row = ws.addRow(headers);
  row.height = 22;
  headers.forEach((_, i) => {
    const cell = row.getCell(i + 1);
    const isRight = ['Amount', 'BDT', 'Total', 'Budget', 'Spent', 'Reimb', 'Pending', 'Count', 'Expenses'].some(k => (headers[i] || '').includes(k));
    applyStyle(cell, { bg: bgColor, color: fgColor, bold: true, sz: 9, align: isRight ? 'right' : 'left', border: allBorders(GREEN_BD) });
  });
  return row;
}

function blankRow(ws) { ws.addRow([]); }

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/project/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/project/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    // Access check
    if (req.user.role !== 'admin') {
      const { rows: access } = await pool.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (!access.length) return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch all data
    const { rows: [project] } = await pool.query(
      `SELECT p.*,
        COALESCE(SUM(e.amount), 0) AS total_spent,
        COALESCE(SUM(CASE WHEN e.reimbursed THEN e.amount ELSE 0 END), 0) AS total_reimbursed,
        COALESCE(SUM(CASE WHEN NOT e.reimbursed THEN e.amount ELSE 0 END), 0) AS total_pending
       FROM projects p
       LEFT JOIN expenses e ON e.project_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`, [id]
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { rows: members } = await pool.query(
      `SELECT u.id, u.name, u.email, pm.role FROM project_members pm
       JOIN users u ON u.id = pm.user_id WHERE pm.project_id = $1 ORDER BY u.name`, [id]
    );
    const { rows: installments } = await pool.query(
      'SELECT * FROM fund_installments WHERE project_id = $1 ORDER BY expected_date ASC', [id]
    );
    const { rows: expenses } = await pool.query(
      `SELECT e.*, u.name AS submitted_by_name, r.name AS reimbursed_by_name
       FROM expenses e
       JOIN users u ON u.id = e.submitted_by
       LEFT JOIN users r ON r.id = e.reimbursed_by
       WHERE e.project_id = $1
       ORDER BY e.expense_date DESC`, [id]
    );

    const budget    = num(project.total_budget);
    const spent     = num(project.total_spent);
    const reimbursed= num(project.total_reimbursed);
    const pending   = num(project.total_pending);
    const remaining = budget - spent;
    const pct       = budget > 0 ? (spent / budget * 100) : 0;
    const today     = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
    const COLS      = 11;

    // ── Build workbook ─────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ResearchTrack';
    wb.created = new Date();

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 1 — Summary
    // ════════════════════════════════════════════════════════════════════════
    const s1 = wb.addWorksheet('Summary', { views: [{ showGridLines: false }] });
    s1.columns = [
      { width: 22 }, { width: 34 }, { width: 18 }, { width: 18 },
      { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 },
    ];

    titleRow(s1, 'PROJECT EXPENSE REPORT', 8);
    subTitleRow(s1, 'Faculty of Graduate Studies · Daffodil International University', 8);
    blankRow(s1);

    // Project info block
    const infoData = [
      ['Project Code',  project.code],
      ['Project Title', project.name],
      ['Description',   project.description || '—'],
      ['Status',        project.status],
      ['Payment Type',  project.payment_type],
      ['Start Date',    fmtDate(project.start_date)],
      ['End Date',      fmtDate(project.end_date)],
      ['Report Date',   today],
    ];
    infoData.forEach(([label, val]) => {
      const row = s1.addRow([label, val]);
      row.height = label === 'Project Title' || label === 'Description' ? 24 : 20;
      applyStyle(row.getCell(1), { bg: GRAY_HDR, color: GRAY_TXT, bold: true, sz: 9, border: allBorders() });
      applyStyle(row.getCell(2), { bg: WHITE, bold: label === 'Project Code', sz: 10, border: allBorders(), wrapText: true });
      s1.mergeCells(row.number, 2, row.number, 8);
    });

    blankRow(s1);
    titleRow(s1, 'FINANCIAL SUMMARY', 8, 24);

    // Summary label row
    const sumLbls = ['Total Budget (BDT)', 'Total Spent (BDT)', 'Reimbursed (BDT)', 'Pending (BDT)', 'Remaining (BDT)', 'Utilised %'];
    const sumRow1 = s1.addRow(sumLbls);
    sumRow1.height = 18;
    sumLbls.forEach((_, i) => {
      applyStyle(sumRow1.getCell(i + 1), { bg: GRAY_HDR, color: GRAY_TXT, bold: true, sz: 8, align: 'center', border: allBorders() });
    });

    // Summary value row — with REAL Excel formulas
    // We need to know which rows the info data is on:
    // Row 1=title, 2=subtitle, 3=blank, 4..11=info (8 rows), 12=blank, 13=FINANCIAL SUMMARY title, 14=labels
    // Budget is in info row "Total Budget" — but we stored it as text in col B, so use literals + formulas
    // For a live sheet the values ARE the source, so we use Excel number formulas for derived cells
    const sumVals = [budget, spent, reimbursed, pending, remaining, pct / 100];
    const sumColors = [DARK, BLUE, SUCCESS, AMBER, remaining < 0 ? RED : SUCCESS, pct > 90 ? RED : pct > 70 ? AMBER : SUCCESS];
    const sumNumFmts = ['#,##0.00', '#,##0.00', '#,##0.00', '#,##0.00', '#,##0.00', '0.0%'];
    const sumRow2 = s1.addRow(sumVals);
    sumRow2.height = 30;
    sumVals.forEach((_, i) => {
      const cell = sumRow2.getCell(i + 1);
      // Use formulas for derived values
      if (i === 4) cell.value = { formula: `A${sumRow2.number}-B${sumRow2.number}`, result: remaining };
      if (i === 5) cell.value = { formula: `IF(A${sumRow2.number}=0,0,B${sumRow2.number}/A${sumRow2.number})`, result: pct / 100 };
      applyStyle(cell, { bg: GREEN_BG, color: sumColors[i], bold: true, sz: 14, align: 'center', numFmt: sumNumFmts[i], border: medBorders(GREEN_BD) });
    });

    blankRow(s1);

    // Category breakdown
    titleRow(s1, 'BREAKDOWN BY CATEGORY', 8, 22);
    headerRow(s1, ['Category', 'Count', 'Total (BDT)', 'Reimbursed (BDT)', 'Pending (BDT)', '% of Total']);

    const catMap = {};
    expenses.forEach(e => {
      const key = getCatLabel(e);
      if (!catMap[key]) catMap[key] = { count: 0, total: 0, reimbursed: 0 };
      catMap[key].count++;
      catMap[key].total += num(e.amount);
      if (e.reimbursed) catMap[key].reimbursed += num(e.amount);
    });

    Object.entries(catMap).sort((a, b) => b[1].total - a[1].total).forEach(([cat, d], i) => {
      const bg = i % 2 === 0 ? ROW_ALT : WHITE;
      const row = s1.addRow([cat, d.count, d.total, d.reimbursed, d.total - d.reimbursed, spent > 0 ? d.total / spent : 0]);
      row.height = 18;
      applyStyle(row.getCell(1), { bg, sz: 10, border: allBorders() });
      applyStyle(row.getCell(2), { bg, sz: 10, align: 'right', border: allBorders() });
      applyStyle(row.getCell(3), { bg, sz: 10, align: 'right', numFmt: '#,##0.00', border: allBorders() });
      applyStyle(row.getCell(4), { bg, color: SUCCESS, sz: 10, align: 'right', numFmt: '#,##0.00', border: allBorders() });
      // Pending = formula: total - reimbursed
      row.getCell(5).value = { formula: `C${row.number}-D${row.number}`, result: d.total - d.reimbursed };
      applyStyle(row.getCell(5), { bg, color: AMBER, sz: 10, align: 'right', numFmt: '#,##0.00', border: allBorders() });
      // % of total = formula
      row.getCell(6).value = { formula: spent > 0 ? `C${row.number}/C${sumRow2.number}` : '0', result: spent > 0 ? d.total / spent : 0 };
      applyStyle(row.getCell(6), { bg, sz: 10, align: 'right', numFmt: '0.0%', border: allBorders() });
    });

    // Category totals with SUM formulas
    const catDataStart = s1.lastRow.number - Object.keys(catMap).length + 1;
    const catDataEnd   = s1.lastRow.number;
    const totRow = s1.addRow(['TOTAL',
      { formula: `SUM(B${catDataStart}:B${catDataEnd})`, result: expenses.length },
      { formula: `SUM(C${catDataStart}:C${catDataEnd})`, result: spent },
      { formula: `SUM(D${catDataStart}:D${catDataEnd})`, result: reimbursed },
      { formula: `SUM(E${catDataStart}:E${catDataEnd})`, result: pending },
      { formula: 'IF(C' + (s1.lastRow.number+1) + '=0,0,D' + (s1.lastRow.number+1) + '/C' + (s1.lastRow.number+1) + ')', result: spent > 0 ? reimbursed / spent : 0 },
    ]);
    totRow.height = 22;
    [1,2,3,4,5,6].forEach(c => {
      const cell = totRow.getCell(c);
      applyStyle(cell, { bg: TOTAL_BG, bold: true, sz: 10, align: c > 1 ? 'right' : 'left', border: medBorders(GREEN_BD),
        numFmt: c === 2 ? '0' : c === 6 ? '0.0%' : c > 2 ? '#,##0.00' : undefined });
    });

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 2 — Expense Records
    // ════════════════════════════════════════════════════════════════════════
    const s2 = wb.addWorksheet('Expenses', { views: [{ showGridLines: false }] });
    s2.columns = [
      { width: 4 }, { width: 13 }, { width: 20 }, { width: 22 },
      { width: 35 }, { width: 22 }, { width: 15 }, { width: 14 },
      { width: 17 }, { width: 14 }, { width: 13 },
    ];

    titleRow(s2, 'EXPENSE RECORDS', 11);
    subTitleRow(s2, `${project.code} — ${project.name}  ·  ${expenses.length} record${expenses.length !== 1 ? 's' : ''}`, 11);
    blankRow(s2);
    const expHdrRow = headerRow(s2, ['#', 'Date', 'Researcher', 'Category', 'Description', 'Receipt / Note', 'Amount (BDT)', 'Status', 'Reimb. By', 'Reimb. On', 'Source']);
    expHdrRow.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };

    const expDataStart = s2.lastRow.number + 1;
    expenses.forEach((e, i) => {
      const bg = i % 2 === 0 ? ROW_ALT : WHITE;
      const reimbed = e.reimbursed;
      const row = s2.addRow([
        i + 1,
        fmtDate(e.expense_date),
        e.submitted_by_name || '',
        getCatLabel(e),
        e.description || '',
        e.receipt_note || '',
        num(e.amount),
        reimbed ? 'Reimbursed' : 'Pending',
        reimbed ? (e.reimbursed_by_name || '') : '',
        reimbed ? fmtDate(e.reimbursed_at) : '',
        reimbed ? (e.reimbursed_from === 'university' ? 'University' : 'Project') : '',
      ]);
      row.height = 18;
      [1,2,3,4,5,6,7,8,9,10,11].forEach(c => {
        const cell = row.getCell(c);
        const opts = { bg, border: allBorders(), sz: 10 };
        if (c === 7) { opts.numFmt = '#,##0.00'; opts.align = 'right'; opts.bold = true; }
        if (c === 8) { opts.color = reimbed ? SUCCESS : AMBER; opts.bold = true; }
        if (c === 5 || c === 6) opts.wrapText = true;
        applyStyle(cell, opts);
      });
    });

    const expDataEnd = s2.lastRow.number;

    // Totals row with SUM formula
    const expTotRow = s2.addRow(['', '', '', '', `${expenses.length} records`, 'TOTAL',
      { formula: `SUM(G${expDataStart}:G${expDataEnd})`, result: spent },
      `${bdt(reimbursed)} reimb. · ${bdt(pending)} pending`,
      '', '', '',
    ]);
    expTotRow.height = 22;
    [1,2,3,4,5,6,7,8,9,10,11].forEach(c => {
      const cell = expTotRow.getCell(c);
      applyStyle(cell, { bg: TOTAL_BG, bold: true, border: medBorders(GREEN_BD), sz: 10,
        align: c === 7 ? 'right' : 'left',
        numFmt: c === 7 ? '#,##0.00' : undefined,
      });
    });

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 3 — Installments (if any)
    // ════════════════════════════════════════════════════════════════════════
    if (installments.length > 0) {
      const s3 = wb.addWorksheet('Installments', { views: [{ showGridLines: false }] });
      s3.columns = [{ width: 4 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 18 }, { width: 30 }];

      titleRow(s3, 'FUND INSTALLMENTS', 6);
      subTitleRow(s3, `${project.code} — ${installments.length} installment${installments.length !== 1 ? 's' : ''}`, 6);
      blankRow(s3);
      headerRow(s3, ['#', 'Expected Date', 'Amount (BDT)', 'Status', 'Date Received', 'Note']);

      const instStart = s3.lastRow.number + 1;
      installments.forEach((inst, i) => {
        const bg = i % 2 === 0 ? ROW_ALT : WHITE;
        const isRecv = inst.status === 'received';
        const row = s3.addRow([
          i + 1,
          fmtDate(inst.expected_date),
          num(inst.amount),
          isRecv ? 'Received' : 'Pending',
          inst.received_date ? fmtDate(inst.received_date) : '',
          inst.note || '',
        ]);
        row.height = 18;
        [1,2,3,4,5,6].forEach(c => {
          const cell = row.getCell(c);
          const opts = { bg, border: allBorders(), sz: 10 };
          if (c === 3) { opts.numFmt = '#,##0.00'; opts.align = 'right'; opts.bold = true; }
          if (c === 4) { opts.color = isRecv ? SUCCESS : AMBER; opts.bold = true; }
          applyStyle(cell, opts);
        });
      });

      const instEnd = s3.lastRow.number;
      const instTotRow = s3.addRow(['', 'TOTAL',
        { formula: `SUM(C${instStart}:C${instEnd})`, result: installments.reduce((a, i) => a + num(i.amount), 0) },
        '', '', '',
      ]);
      instTotRow.height = 22;
      [1,2,3,4,5,6].forEach(c => {
        applyStyle(instTotRow.getCell(c), { bg: TOTAL_BG, bold: true, border: medBorders(GREEN_BD), sz: 10,
          align: c === 3 ? 'right' : 'left', numFmt: c === 3 ? '#,##0.00' : undefined });
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 4 — Members
    // ════════════════════════════════════════════════════════════════════════
    const s4 = wb.addWorksheet('Members', { views: [{ showGridLines: false }] });
    s4.columns = [
      { width: 4 }, { width: 24 }, { width: 30 }, { width: 14 },
      { width: 11 }, { width: 17 }, { width: 19 }, { width: 17 },
    ];

    titleRow(s4, 'MEMBER SUMMARY', 8);
    subTitleRow(s4, `${project.code} — ${members.length} member${members.length !== 1 ? 's' : ''}`, 8);
    blankRow(s4);
    headerRow(s4, ['#', 'Name', 'Email', 'Role', 'Expenses', 'Total (BDT)', 'Reimbursed (BDT)', 'Pending (BDT)']);

    members.forEach((m, i) => {
      const bg = i % 2 === 0 ? ROW_ALT : WHITE;
      const me = expenses.filter(e => e.submitted_by === m.id);
      const mS = me.reduce((a, e) => a + num(e.amount), 0);
      const mR = me.filter(e => e.reimbursed).reduce((a, e) => a + num(e.amount), 0);
      const mP = mS - mR;
      const row = s4.addRow([i + 1, m.name, m.email, m.role, me.length, mS, mR, mP]);
      row.height = 20;
      [1,2,3,4,5,6,7,8].forEach(c => {
        const cell = row.getCell(c);
        const opts = { bg, border: allBorders(), sz: 10 };
        if (c >= 5) opts.align = 'right';
        if (c >= 6) opts.numFmt = '#,##0.00';
        if (c === 7) opts.color = SUCCESS;
        if (c === 8) { opts.color = mP > 0 ? AMBER : 'A7F3D0'; }
        // Pending = formula
        if (c === 8) row.getCell(c).value = { formula: `F${row.number}-G${row.number}`, result: mP };
        applyStyle(cell, opts);
      });
    });

    // ── Stream response ──────────────────────────────────────────────────────
    const filename = `${project.code}-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/expenses  (query params: project_id, user_id, reimbursed, category, from_date, to_date)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/expenses', authenticate, async (req, res) => {
  try {
    const { project_id, user_id, reimbursed, category, from_date, to_date } = req.query;

    let conditions = [];
    let params = [];
    let idx = 1;

    if (req.user.role !== 'admin') {
      conditions.push(`e.project_id IN (SELECT project_id FROM project_members WHERE user_id = $${idx++})`);
      params.push(req.user.id);
    } else if (user_id) {
      conditions.push(`e.submitted_by = $${idx++}`);
      params.push(user_id);
    }
    if (project_id) { conditions.push(`e.project_id = $${idx++}`); params.push(project_id); }
    if (reimbursed !== undefined && reimbursed !== '') { conditions.push(`e.reimbursed = $${idx++}`); params.push(reimbursed === 'true'); }
    if (category)   { conditions.push(`e.category = $${idx++}`); params.push(category); }
    if (from_date)  { conditions.push(`e.expense_date >= $${idx++}`); params.push(from_date); }
    if (to_date)    { conditions.push(`e.expense_date <= $${idx++}`); params.push(to_date); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows: expenses } = await pool.query(
      `SELECT e.*, u.name AS submitted_by_name, p.name AS project_name, p.code AS project_code, r.name AS reimbursed_by_name
       FROM expenses e
       JOIN users u ON u.id = e.submitted_by
       JOIN projects p ON p.id = e.project_id
       LEFT JOIN users r ON r.id = e.reimbursed_by
       ${where}
       ORDER BY e.expense_date DESC, e.created_at DESC`,
      params
    );

    const totalAmt  = expenses.reduce((a, e) => a + num(e.amount), 0);
    const totalReim = expenses.filter(e => e.reimbursed).reduce((a, e) => a + num(e.amount), 0);
    const totalPend = totalAmt - totalReim;
    const today     = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
    const COLS      = 13;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ResearchTrack';
    wb.created = new Date();

    const ws = wb.addWorksheet('Expense Report', { views: [{ showGridLines: false }] });
    ws.columns = [
      { width: 4 },  { width: 13 }, { width: 14 }, { width: 30 },
      { width: 20 }, { width: 22 }, { width: 34 }, { width: 22 },
      { width: 15 }, { width: 14 }, { width: 13 }, { width: 17 }, { width: 14 },
    ];

    // Header
    titleRow(ws, 'RESEARCH EXPENSE REPORT', COLS);
    subTitleRow(ws, 'Faculty of Graduate Studies · Daffodil International University', COLS);
    blankRow(ws);

    // Meta info row
    const metaRow = ws.addRow([
      'Generated On', today, '', 'Total Records', expenses.length, '', 'Exported By', req.user.name || '', '', '', '', '', '',
    ]);
    metaRow.height = 20;
    [1, 4, 7].forEach(c => applyStyle(metaRow.getCell(c), { bg: GRAY_HDR, color: GRAY_TXT, bold: true, sz: 9, border: allBorders() }));
    [2, 5, 8].forEach(c => applyStyle(metaRow.getCell(c), { bg: WHITE, sz: 10, border: allBorders() }));
    blankRow(ws);

    // Financial summary
    titleRow(ws, 'FINANCIAL SUMMARY', COLS, 22);
    const fSumLbls = ['Total Expenses (BDT)', 'Reimbursed (BDT)', 'Pending (BDT)', 'Reimbursement Rate'];
    const fSumRow1 = ws.addRow(fSumLbls);
    fSumRow1.height = 18;
    fSumLbls.forEach((_, i) => applyStyle(fSumRow1.getCell(i + 1), { bg: GRAY_HDR, color: GRAY_TXT, bold: true, sz: 8, align: 'center', border: allBorders() }));

    const fSumRow2 = ws.addRow([totalAmt, totalReim, totalPend, totalAmt > 0 ? totalReim / totalAmt : 0]);
    fSumRow2.height = 32;
    [1, 2, 3, 4].forEach(c => {
      const cell = fSumRow2.getCell(c);
      if (c === 2) cell.value = { formula: `A${fSumRow2.number}`, result: totalReim }; // will be overridden below — keep literal
      if (c === 3) cell.value = { formula: `A${fSumRow2.number}-B${fSumRow2.number}`, result: totalPend };
      if (c === 4) cell.value = { formula: `IF(A${fSumRow2.number}=0,0,B${fSumRow2.number}/A${fSumRow2.number})`, result: totalAmt > 0 ? totalReim / totalAmt : 0 };
      // restore correct literal for B
      if (c === 2) cell.value = totalReim;
      applyStyle(cell, {
        bg: GREEN_BG, color: c === 1 ? DARK : c === 2 ? SUCCESS : c === 3 ? AMBER : BLUE,
        bold: true, sz: 14, align: 'center',
        numFmt: c <= 3 ? '#,##0.00' : '0.0%',
        border: medBorders(GREEN_BD),
      });
    });
    blankRow(ws);

    // Category breakdown
    titleRow(ws, 'BREAKDOWN BY CATEGORY', COLS, 22);
    const catHdrRow = ws.addRow(['Category', 'Count', 'Total (BDT)', 'Reimbursed (BDT)', 'Pending (BDT)', '% of Total', '', '', '', '', '', '', '']);
    catHdrRow.height = 22;
    [1,2,3,4,5,6].forEach(c => applyStyle(catHdrRow.getCell(c), { bg: DARK, color: WHITE, bold: true, sz: 9, align: c > 1 ? 'right' : 'left', border: allBorders(GREEN_BD) }));

    const catMap = {};
    expenses.forEach(e => {
      const key = getCatLabel(e);
      if (!catMap[key]) catMap[key] = { count: 0, total: 0, reimbursed: 0 };
      catMap[key].count++;
      catMap[key].total += num(e.amount);
      if (e.reimbursed) catMap[key].reimbursed += num(e.amount);
    });

    Object.entries(catMap).sort((a, b) => b[1].total - a[1].total).forEach(([cat, d], i) => {
      const bg = i % 2 === 0 ? ROW_ALT : WHITE;
      const row = ws.addRow([cat, d.count, d.total, d.reimbursed, d.total - d.reimbursed, totalAmt > 0 ? d.total / totalAmt : 0, '', '', '', '', '', '', '']);
      row.height = 18;
      row.getCell(5).value = { formula: `C${row.number}-D${row.number}`, result: d.total - d.reimbursed };
      row.getCell(6).value = { formula: totalAmt > 0 ? `C${row.number}/$C$${fSumRow2.number}` : '0', result: totalAmt > 0 ? d.total / totalAmt : 0 };
      [1,2,3,4,5,6].forEach(c => applyStyle(row.getCell(c), {
        bg, sz: 10, border: allBorders(),
        align: c > 1 ? 'right' : 'left',
        color: c === 4 ? SUCCESS : c === 5 ? AMBER : '1A1A1A',
        numFmt: c === 2 ? '0' : c >= 3 && c <= 5 ? '#,##0.00' : c === 6 ? '0.0%' : undefined,
      }));
    });

    const catStart = catHdrRow.number + 1;
    const catEnd   = ws.lastRow.number;
    const catTotRow = ws.addRow([
      'TOTAL',
      { formula: `SUM(B${catStart}:B${catEnd})`, result: expenses.length },
      { formula: `SUM(C${catStart}:C${catEnd})`, result: totalAmt },
      { formula: `SUM(D${catStart}:D${catEnd})`, result: totalReim },
      { formula: `SUM(E${catStart}:E${catEnd})`, result: totalPend },
      { formula: `IF(C${catEnd+1}=0,0,D${catEnd+1}/C${catEnd+1})`, result: totalAmt > 0 ? totalReim / totalAmt : 0 },
      '', '', '', '', '', '', '',
    ]);
    catTotRow.height = 22;
    [1,2,3,4,5,6].forEach(c => applyStyle(catTotRow.getCell(c), {
      bg: TOTAL_BG, bold: true, sz: 10, border: medBorders(GREEN_BD),
      align: c > 1 ? 'right' : 'left',
      numFmt: c === 2 ? '0' : c >= 3 && c <= 5 ? '#,##0.00' : c === 6 ? '0.0%' : undefined,
    }));
    blankRow(ws);

    // Expense records
    titleRow(ws, 'EXPENSE RECORDS', COLS, 22);
    const expHdr = ['#', 'Date', 'Project Code', 'Project Name', 'Submitted By', 'Category', 'Description', 'Receipt / Note', 'Amount (BDT)', 'Status', 'Source', 'Reimb. By', 'Reimb. On'];
    const expHdrR = ws.addRow(expHdr);
    expHdrR.height = 22;
    expHdr.forEach((_, i) => applyStyle(expHdrR.getCell(i + 1), {
      bg: DARK, color: WHITE, bold: true, sz: 9,
      align: i === 8 ? 'right' : 'left',
      border: allBorders(GREEN_BD),
    }));

    const expStart = ws.lastRow.number + 1;
    expenses.forEach((e, i) => {
      const bg = i % 2 === 0 ? ROW_ALT : WHITE;
      const row = ws.addRow([
        i + 1,
        fmtDate(e.expense_date),
        e.project_code || '',
        e.project_name || '',
        e.submitted_by_name || '',
        getCatLabel(e),
        e.description || '',
        e.receipt_note || '',
        num(e.amount),
        e.reimbursed ? 'Reimbursed' : 'Pending',
        e.reimbursed ? (e.reimbursed_from === 'university' ? 'University' : 'Project') : '',
        e.reimbursed ? (e.reimbursed_by_name || '') : '',
        e.reimbursed ? fmtDate(e.reimbursed_at) : '',
      ]);
      row.height = 18;
      expHdr.forEach((_, c_) => {
        const c = c_ + 1;
        const opts = { bg, border: allBorders(), sz: 10 };
        if (c === 9) { opts.numFmt = '#,##0.00'; opts.align = 'right'; opts.bold = true; }
        if (c === 10) { opts.color = e.reimbursed ? SUCCESS : AMBER; opts.bold = true; }
        if (c === 7 || c === 8) opts.wrapText = true;
        applyStyle(row.getCell(c), opts);
      });
    });

    const expEnd = ws.lastRow.number;
    const expTotRow = ws.addRow([
      '', '', '', '', `${expenses.length} records`, '', '', 'TOTAL',
      { formula: `SUM(I${expStart}:I${expEnd})`, result: totalAmt },
      `${bdt(totalReim)} reimb · ${bdt(totalPend)} pending`,
      '', '', '',
    ]);
    expTotRow.height = 22;
    expHdr.forEach((_, c_) => {
      const c = c_ + 1;
      applyStyle(expTotRow.getCell(c), {
        bg: TOTAL_BG, bold: true, sz: 10, border: medBorders(GREEN_BD),
        align: c === 9 ? 'right' : 'left',
        numFmt: c === 9 ? '#,##0.00' : undefined,
      });
    });

    // ── Stream response ──────────────────────────────────────────────────────
    const filename = `Expenses-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Expenses report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
