const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate, adminOnly } = require('../middleware/auth');

const VALID_CATEGORIES = [
  'transportation','printing_stationery','field_work','communication','other','miscellaneous'
];

// Helper: verify project belongs to user's org
async function checkProjectOrg(project_id, workspace_id) {
  const { rows } = await pool.query(
    'SELECT id FROM projects WHERE id = $1 AND workspace_id = $2', [project_id, workspace_id]
  );
  return rows.length > 0;
}

// GET /api/expenses
router.get('/', authenticate, async (req, res) => {
  const { project_id, user_id, reimbursed, category, from_date, to_date } = req.query;
  try {
    let conditions = ['p.workspace_id = $1'];
    let params = [req.user.workspace_id];
    let idx = 2;

    if (req.user.role !== 'admin') {
      conditions.push(`e.project_id IN (SELECT project_id FROM project_members WHERE user_id = $${idx++})`);
      params.push(req.user.id);
    } else if (user_id) {
      conditions.push(`e.submitted_by = $${idx++}`); params.push(user_id);
    }

    if (project_id) { conditions.push(`e.project_id = $${idx++}`); params.push(project_id); }
    if (reimbursed !== undefined && reimbursed !== '') { conditions.push(`e.reimbursed = $${idx++}`); params.push(reimbursed === 'true'); }
    if (category)   { conditions.push(`e.category = $${idx++}`); params.push(category); }
    if (from_date)  { conditions.push(`e.expense_date >= $${idx++}`); params.push(from_date); }
    if (to_date)    { conditions.push(`e.expense_date <= $${idx++}`); params.push(to_date); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT e.*, u.name AS submitted_by_name, u.email AS submitted_by_email,
              p.name AS project_name, p.code AS project_code,
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
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/expenses/summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = `SELECT p.id AS project_id, p.code, p.name AS project_name, p.total_budget,
                COALESCE(SUM(e.amount),0) AS total_spent,
                COALESCE(SUM(CASE WHEN e.reimbursed THEN e.amount ELSE 0 END),0) AS reimbursed,
                COALESCE(SUM(CASE WHEN NOT e.reimbursed THEN e.amount ELSE 0 END),0) AS pending,
                COUNT(e.id) AS expense_count,
                COUNT(CASE WHEN NOT e.reimbursed THEN 1 END) AS pending_count
               FROM projects p LEFT JOIN expenses e ON e.project_id = p.id
               WHERE p.workspace_id = $1 GROUP BY p.id ORDER BY p.code`;
      params = [req.user.workspace_id];
    } else {
      query = `SELECT p.id AS project_id, p.code, p.name AS project_name, p.total_budget,
                COALESCE(SUM(e.amount),0) AS total_spent,
                COALESCE(SUM(CASE WHEN e.reimbursed THEN e.amount ELSE 0 END),0) AS reimbursed,
                COALESCE(SUM(CASE WHEN NOT e.reimbursed THEN e.amount ELSE 0 END),0) AS pending,
                COUNT(e.id) AS expense_count,
                COUNT(CASE WHEN NOT e.reimbursed THEN 1 END) AS pending_count
               FROM projects p
               JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
               LEFT JOIN expenses e ON e.project_id = p.id
               WHERE p.workspace_id = $2 GROUP BY p.id ORDER BY p.code`;
      params = [req.user.id, req.user.workspace_id];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/expenses
router.post('/', authenticate, async (req, res) => {
  const { project_id, category, description, amount, expense_date, receipt_note, other_label } = req.body;
  if (!project_id || !category || !description || !amount || !expense_date)
    return res.status(400).json({ error: 'project_id, category, description, amount, expense_date are required' });
  if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  if (isNaN(amount) || Number(amount) <= 0) return res.status(400).json({ error: 'Amount must be positive' });

  try {
    // Verify project is in user's org
    if (!await checkProjectOrg(project_id, req.user.workspace_id))
      return res.status(403).json({ error: 'Project not found in your organization' });

    if (req.user.role !== 'admin') {
      const { rows: access } = await pool.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2', [project_id, req.user.id]
      );
      if (!access.length) return res.status(403).json({ error: 'You are not a member of this project' });
    }

    const { rows } = await pool.query(
      `INSERT INTO expenses (project_id, submitted_by, category, description, amount, expense_date, receipt_note, other_label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [project_id, req.user.id, category, description.trim(), Number(amount), expense_date,
       receipt_note || null, category === 'other' ? (other_label || null) : null]
    );
    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_value)
       VALUES ('expenses', $1, 'created', $2, $3)`,
      [rows[0].id, req.user.id, JSON.stringify({ amount, category, project_id })]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/expenses/:id/reimburse
router.patch('/:id/reimburse', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { reimbursed_from } = req.body;
  if (!['university','project'].includes(reimbursed_from))
    return res.status(400).json({ error: 'reimbursed_from must be university or project' });
  try {
    const { rows: current } = await pool.query(
      `SELECT e.* FROM expenses e JOIN projects p ON p.id = e.project_id
       WHERE e.id = $1 AND p.workspace_id = $2`, [id, req.user.workspace_id]
    );
    if (!current.length) return res.status(404).json({ error: 'Expense not found' });
    if (current[0].reimbursed) return res.status(409).json({ error: 'Already reimbursed' });

    const { rows } = await pool.query(
      `UPDATE expenses SET reimbursed=TRUE, reimbursed_by=$1, reimbursed_at=NOW(), reimbursed_from=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [req.user.id, reimbursed_from, id]
    );
    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, old_value, new_value)
       VALUES ('expenses', $1, 'reimbursed', $2, $3, $4)`,
      [id, req.user.id, JSON.stringify({ reimbursed: false }),
       JSON.stringify({ reimbursed: true, reimbursed_from, by: req.user.name, at: new Date() })]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/expenses/:id (edit)
router.patch('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { description, amount, expense_date, receipt_note, category, other_label } = req.body;
  try {
    const { rows: current } = await pool.query(
      `SELECT e.* FROM expenses e JOIN projects p ON p.id = e.project_id
       WHERE e.id = $1 AND p.workspace_id = $2`, [id, req.user.workspace_id]
    );
    if (!current.length) return res.status(404).json({ error: 'Expense not found' });
    const exp = current[0];
    if (req.user.role !== 'admin' && exp.submitted_by !== req.user.id)
      return res.status(403).json({ error: 'Not your expense' });
    if (req.user.role !== 'admin' && exp.reimbursed)
      return res.status(409).json({ error: 'Cannot edit a reimbursed expense' });
    if (category && !VALID_CATEGORIES.includes(category))
      return res.status(400).json({ error: 'Invalid category' });

    const { rows } = await pool.query(
      `UPDATE expenses SET
        description = COALESCE($1, description), amount = COALESCE($2, amount),
        expense_date = COALESCE($3, expense_date), receipt_note = COALESCE($4, receipt_note),
        category = COALESCE($5, category),
        other_label = CASE WHEN $5 = 'other' THEN COALESCE($6, other_label) ELSE NULL END,
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [description, amount ? Number(amount) : null, expense_date, receipt_note, category, other_label || null, id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/expenses/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: current } = await pool.query(
      `SELECT e.* FROM expenses e JOIN projects p ON p.id = e.project_id
       WHERE e.id = $1 AND p.workspace_id = $2`, [id, req.user.workspace_id]
    );
    if (!current.length) return res.status(404).json({ error: 'Expense not found' });
    const exp = current[0];
    if (req.user.role !== 'admin' && exp.submitted_by !== req.user.id)
      return res.status(403).json({ error: 'Not your expense' });
    if (req.user.role !== 'admin' && exp.reimbursed)
      return res.status(409).json({ error: 'Cannot delete a reimbursed expense' });
    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, old_value)
       VALUES ('expenses', $1, 'deleted', $2, $3)`,
      [id, req.user.id, JSON.stringify({ amount: exp.amount, category: exp.category })]
    );
    res.json({ message: 'Expense deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/expenses/bulk/reimburse
router.patch('/bulk/reimburse', authenticate, adminOnly, async (req, res) => {
  const { expense_ids, reimbursed_from } = req.body;
  if (!Array.isArray(expense_ids) || !reimbursed_from)
    return res.status(400).json({ error: 'expense_ids array and reimbursed_from required' });
  try {
    const placeholders = expense_ids.map((_, i) => `$${i + 1}`).join(',');
    await pool.query(
      `UPDATE expenses SET reimbursed=true, reimbursed_by=$${expense_ids.length+1}, reimbursed_from=$${expense_ids.length+2}, reimbursed_at=NOW()
       WHERE id IN (${placeholders})`,
      [...expense_ids, req.user.id, reimbursed_from]
    );
    for (const eid of expense_ids) {
      await pool.query(
        `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_value, changed_at)
         VALUES ('expenses', $1, 'bulk_reimbursed', $2, $3, NOW())`,
        [eid, req.user.id, JSON.stringify({ reimbursed: true, reimbursed_from })]
      );
    }
    res.json({ message: `Marked ${expense_ids.length} expenses as reimbursed` });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/expenses/bulk
router.delete('/bulk', authenticate, adminOnly, async (req, res) => {
  const { expense_ids } = req.body;
  if (!Array.isArray(expense_ids)) return res.status(400).json({ error: 'expense_ids array required' });
  try {
    const placeholders = expense_ids.map((_, i) => `$${i + 1}`).join(',');
    await pool.query(`DELETE FROM expenses WHERE id IN (${placeholders}) AND reimbursed = false`, expense_ids);
    for (const eid of expense_ids) {
      await pool.query(
        `INSERT INTO audit_log (table_name, record_id, action, changed_by, changed_at) VALUES ('expenses', $1, 'bulk_deleted', $2, NOW())`,
        [eid, req.user.id]
      );
    }
    res.json({ message: `Deleted ${expense_ids.length} expenses` });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/expenses/bulk/category
router.patch('/bulk/category', authenticate, adminOnly, async (req, res) => {
  const { expense_ids, category } = req.body;
  if (!Array.isArray(expense_ids) || !category) return res.status(400).json({ error: 'expense_ids and category required' });
  try {
    const placeholders = expense_ids.map((_, i) => `$${i + 1}`).join(',');
    await pool.query(`UPDATE expenses SET category=$${expense_ids.length+1} WHERE id IN (${placeholders})`, [...expense_ids, category]);
    for (const eid of expense_ids) {
      await pool.query(
        `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_value, changed_at) VALUES ('expenses', $1, 'bulk_category_update', $2, $3, NOW())`,
        [eid, req.user.id, JSON.stringify({ category })]
      );
    }
    res.json({ message: `Updated ${expense_ids.length} expenses` });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/expenses/audit/:id
router.get('/audit/:id', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT al.*, u.name AS changed_by_name FROM audit_log al
       LEFT JOIN users u ON u.id = al.changed_by
       WHERE al.table_name = 'expenses' AND al.record_id = $1 ORDER BY al.changed_at ASC`, [id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
