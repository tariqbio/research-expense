const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, adminOnly } = require('../middleware/auth');

const VALID_CATEGORIES = [
  'transportation', 'printing_stationery', 'field_work', 'communication', 'miscellaneous'
];

// GET /api/expenses — list expenses (filtered by project, member, status)
router.get('/', authenticate, async (req, res) => {
  const { project_id, user_id, reimbursed, category, from_date, to_date } = req.query;

  try {
    let conditions = [];
    let params = [];
    let idx = 1;

    // Members can only see their own expenses
    if (req.user.role !== 'admin') {
      conditions.push(`e.submitted_by = $${idx++}`);
      params.push(req.user.id);
      // Also restrict to their projects
      conditions.push(`e.project_id IN (
        SELECT project_id FROM project_members WHERE user_id = $${idx++}
      )`);
      params.push(req.user.id);
    } else if (user_id) {
      conditions.push(`e.submitted_by = $${idx++}`);
      params.push(user_id);
    }

    if (project_id) { conditions.push(`e.project_id = $${idx++}`); params.push(project_id); }
    if (reimbursed !== undefined) { conditions.push(`e.reimbursed = $${idx++}`); params.push(reimbursed === 'true'); }
    if (category) { conditions.push(`e.category = $${idx++}`); params.push(category); }
    if (from_date) { conditions.push(`e.expense_date >= $${idx++}`); params.push(from_date); }
    if (to_date) { conditions.push(`e.expense_date <= $${idx++}`); params.push(to_date); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const { rows } = await pool.query(
      `SELECT
        e.*,
        u.name AS submitted_by_name,
        u.email AS submitted_by_email,
        p.name AS project_name,
        p.code AS project_code,
        r.name AS reimbursed_by_name
       FROM expenses e
       JOIN users u ON u.id = e.submitted_by
       JOIN projects p ON p.id = e.project_id
       LEFT JOIN users r ON r.id = e.reimbursed_by
       ${where}
       ORDER BY e.expense_date DESC, e.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/expenses/summary — aggregated stats per project
router.get('/summary', authenticate, async (req, res) => {
  try {
    let projectFilter = '';
    let params = [];

    if (req.user.role !== 'admin') {
      projectFilter = `AND e.project_id IN (
        SELECT project_id FROM project_members WHERE user_id = $1
      )`;
      params.push(req.user.id);
    }

    const { rows } = await pool.query(
      `SELECT
        p.id AS project_id,
        p.code,
        p.name AS project_name,
        p.total_budget,
        COALESCE(SUM(e.amount), 0) AS total_spent,
        COALESCE(SUM(CASE WHEN e.reimbursed THEN e.amount ELSE 0 END), 0) AS reimbursed,
        COALESCE(SUM(CASE WHEN NOT e.reimbursed THEN e.amount ELSE 0 END), 0) AS pending,
        COUNT(e.id) AS expense_count,
        COUNT(CASE WHEN NOT e.reimbursed THEN 1 END) AS pending_count
       FROM projects p
       LEFT JOIN expenses e ON e.project_id = p.id ${projectFilter}
       ${req.user.role !== 'admin' ? 'JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1' : ''}
       GROUP BY p.id
       ORDER BY p.code`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/expenses — submit a new expense
router.post('/', authenticate, async (req, res) => {
  const { project_id, category, description, amount, expense_date, receipt_note } = req.body;

  if (!project_id || !category || !description || !amount || !expense_date)
    return res.status(400).json({ error: 'project_id, category, description, amount, expense_date are required' });

  if (!VALID_CATEGORIES.includes(category))
    return res.status(400).json({ error: 'Invalid category' });

  if (isNaN(amount) || Number(amount) <= 0)
    return res.status(400).json({ error: 'Amount must be a positive number' });

  try {
    // Check project membership (members can only submit for their projects)
    if (req.user.role !== 'admin') {
      const { rows: access } = await pool.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [project_id, req.user.id]
      );
      if (!access.length) return res.status(403).json({ error: 'You are not a member of this project' });
    }

    const { rows } = await pool.query(
      `INSERT INTO expenses
        (project_id, submitted_by, category, description, amount, expense_date, receipt_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [project_id, req.user.id, category, description.trim(),
       Number(amount), expense_date, receipt_note || null]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_value)
       VALUES ('expenses', $1, 'created', $2, $3)`,
      [rows[0].id, req.user.id, JSON.stringify({ amount, category, project_id })]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/expenses/:id — admin marks as reimbursed (ONLY admin)
router.patch('/:id/reimburse', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { reimbursed_from } = req.body; // 'university' or 'project'

  if (!['university', 'project'].includes(reimbursed_from))
    return res.status(400).json({ error: 'reimbursed_from must be university or project' });

  try {
    // Get current state for audit
    const { rows: current } = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (!current.length) return res.status(404).json({ error: 'Expense not found' });
    if (current[0].reimbursed) return res.status(409).json({ error: 'Already marked as reimbursed' });

    const { rows } = await pool.query(
      `UPDATE expenses SET
        reimbursed = TRUE,
        reimbursed_by = $1,
        reimbursed_at = NOW(),
        reimbursed_from = $2,
        updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [req.user.id, reimbursed_from, id]
    );

    // Permanent audit log
    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, old_value, new_value)
       VALUES ('expenses', $1, 'reimbursed', $2, $3, $4)`,
      [id, req.user.id,
       JSON.stringify({ reimbursed: false }),
       JSON.stringify({ reimbursed: true, reimbursed_from, reimbursed_by: req.user.name, at: new Date() })]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/expenses/:id — edit expense details (only submitter, only if not reimbursed)
router.patch('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { description, amount, expense_date, receipt_note, category } = req.body;

  try {
    const { rows: current } = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (!current.length) return res.status(404).json({ error: 'Expense not found' });

    const exp = current[0];

    // Only submitter or admin can edit
    if (req.user.role !== 'admin' && exp.submitted_by !== req.user.id)
      return res.status(403).json({ error: 'Not your expense' });

    // Cannot edit reimbursed expenses
    if (exp.reimbursed)
      return res.status(409).json({ error: 'Cannot edit a reimbursed expense' });

    if (category && !VALID_CATEGORIES.includes(category))
      return res.status(400).json({ error: 'Invalid category' });

    const { rows } = await pool.query(
      `UPDATE expenses SET
        description = COALESCE($1, description),
        amount = COALESCE($2, amount),
        expense_date = COALESCE($3, expense_date),
        receipt_note = COALESCE($4, receipt_note),
        category = COALESCE($5, category),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [description, amount ? Number(amount) : null, expense_date, receipt_note, category, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/expenses/:id — submitter or admin can delete (only if not reimbursed)
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: current } = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (!current.length) return res.status(404).json({ error: 'Expense not found' });

    const exp = current[0];
    if (req.user.role !== 'admin' && exp.submitted_by !== req.user.id)
      return res.status(403).json({ error: 'Not your expense' });
    if (exp.reimbursed)
      return res.status(409).json({ error: 'Cannot delete a reimbursed expense' });

    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, old_value)
       VALUES ('expenses', $1, 'deleted', $2, $3)`,
      [id, req.user.id, JSON.stringify({ amount: exp.amount, category: exp.category })]
    );
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/expenses/audit/:id — admin views audit trail for an expense
router.get('/audit/:id', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT al.*, u.name AS changed_by_name FROM audit_log al
       LEFT JOIN users u ON u.id = al.changed_by
       WHERE al.table_name = 'expenses' AND al.record_id = $1
       ORDER BY al.changed_at ASC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/expenses/bulk/reimburse — admin bulk marks expenses as reimbursed
router.patch('/bulk/reimburse', authenticate, adminOnly, async (req, res) => {
  const { expense_ids, reimbursed_from } = req.body;
  if (!Array.isArray(expense_ids) || !reimbursed_from) {
    return res.status(400).json({ error: 'expense_ids array and reimbursed_from required' });
  }
  try {
    const placeholders = expense_ids.map((_, i) => `$${i + 1}`).join(',');
    await pool.query(
      `UPDATE expenses SET reimbursed = true, reimbursed_by = $${expense_ids.length + 1}, reimbursed_from = $${expense_ids.length + 2}, reimbursed_at = NOW() WHERE id IN (${placeholders})`,
      [...expense_ids, req.user.id, reimbursed_from]
    );
    // Log each update
    for (const eid of expense_ids) {
      await pool.query(
        `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_value, changed_at)
         VALUES ('expenses', $1, 'bulk_reimbursed', $2, $3, NOW())`,
        [eid, req.user.id, JSON.stringify({ reimbursed: true, reimbursed_from })]
      );
    }
    res.json({ message: `Marked ${expense_ids.length} expenses as reimbursed` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/expenses/bulk — admin bulk deletes expenses
router.delete('/bulk', authenticate, adminOnly, async (req, res) => {
  const { expense_ids } = req.body;
  if (!Array.isArray(expense_ids)) {
    return res.status(400).json({ error: 'expense_ids array required' });
  }
  try {
    const placeholders = expense_ids.map((_, i) => `$${i + 1}`).join(',');
    // Only delete if not reimbursed
    await pool.query(
      `DELETE FROM expenses WHERE id IN (${placeholders}) AND reimbursed = false`,
      expense_ids
    );
    // Log each deletion
    for (const eid of expense_ids) {
      await pool.query(
        `INSERT INTO audit_log (table_name, record_id, action, changed_by, changed_at)
         VALUES ('expenses', $1, 'bulk_deleted', $2, NOW())`,
        [eid, req.user.id]
      );
    }
    res.json({ message: `Deleted ${expense_ids.length} expenses` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/expenses/bulk/category — admin bulk updates expense category
router.patch('/bulk/category', authenticate, adminOnly, async (req, res) => {
  const { expense_ids, category } = req.body;
  if (!Array.isArray(expense_ids) || !category) {
    return res.status(400).json({ error: 'expense_ids array and category required' });
  }
  try {
    const placeholders = expense_ids.map((_, i) => `$${i + 1}`).join(',');
    await pool.query(
      `UPDATE expenses SET category = $${expense_ids.length + 1} WHERE id IN (${placeholders})`,
      [...expense_ids, category]
    );
    // Log each update
    for (const eid of expense_ids) {
      await pool.query(
        `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_value, changed_at)
         VALUES ('expenses', $1, 'bulk_category_update', $2, $3, NOW())`,
        [eid, req.user.id, JSON.stringify({ category })]
      );
    }
    res.json({ message: `Updated ${expense_ids.length} expenses` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
