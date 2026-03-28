const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/projects — list projects (admin: all, member: only assigned)
router.get('/', authenticate, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = `
        SELECT p.*,
          u.name AS created_by_name,
          COALESCE(SUM(e.amount), 0) AS total_spent,
          COALESCE(SUM(CASE WHEN e.reimbursed THEN e.amount ELSE 0 END), 0) AS total_reimbursed,
          COALESCE(SUM(CASE WHEN NOT e.reimbursed THEN e.amount ELSE 0 END), 0) AS total_pending
        FROM projects p
        LEFT JOIN users u ON u.id = p.created_by
        LEFT JOIN expenses e ON e.project_id = p.id
        GROUP BY p.id, u.name
        ORDER BY p.created_at DESC`;
      params = [];
    } else {
      query = `
        SELECT p.*,
          u.name AS created_by_name,
          COALESCE(SUM(e.amount), 0) AS total_spent,
          COALESCE(SUM(CASE WHEN e.reimbursed THEN e.amount ELSE 0 END), 0) AS total_reimbursed,
          COALESCE(SUM(CASE WHEN NOT e.reimbursed THEN e.amount ELSE 0 END), 0) AS total_pending
        FROM projects p
        JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
        LEFT JOIN users u ON u.id = p.created_by
        LEFT JOIN expenses e ON e.project_id = p.id
        GROUP BY p.id, u.name
        ORDER BY p.created_at DESC`;
      params = [req.user.id];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:id — project detail with fund installments
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    // Access check for members
    if (req.user.role !== 'admin') {
      const { rows: access } = await pool.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (!access.length) return res.status(403).json({ error: 'Access denied' });
    }

    const { rows: project } = await pool.query(
      `SELECT p.*, u.name AS created_by_name FROM projects p
       LEFT JOIN users u ON u.id = p.created_by WHERE p.id = $1`, [id]
    );
    if (!project.length) return res.status(404).json({ error: 'Project not found' });

    const { rows: members } = await pool.query(
      `SELECT u.id, u.name, u.email, pm.role FROM project_members pm
       JOIN users u ON u.id = pm.user_id WHERE pm.project_id = $1`, [id]
    );

    const { rows: installments } = await pool.query(
      'SELECT * FROM fund_installments WHERE project_id = $1 ORDER BY expected_date ASC', [id]
    );

    const { rows: stats } = await pool.query(
      `SELECT
        COALESCE(SUM(amount), 0) AS total_spent,
        COALESCE(SUM(CASE WHEN reimbursed THEN amount ELSE 0 END), 0) AS total_reimbursed,
        COALESCE(SUM(CASE WHEN NOT reimbursed THEN amount ELSE 0 END), 0) AS total_pending,
        COUNT(*) AS expense_count
       FROM expenses WHERE project_id = $1`, [id]
    );

    res.json({
      ...project[0],
      members,
      installments,
      stats: stats[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects — admin creates project
router.post('/', authenticate, adminOnly, async (req, res) => {
  const { code, name, description, total_budget, payment_type, start_date, end_date, member_ids = [] } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'Code and name are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO projects (code, name, description, total_budget, payment_type, start_date, end_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [code.trim().toUpperCase(), name.trim(), description, total_budget || 0,
       payment_type || 'installment', start_date || null, end_date || null, req.user.id]
    );
    const project = rows[0];

    // Add admin as member always
    const allMembers = [...new Set([req.user.id, ...member_ids.map(Number)])];
    for (const uid of allMembers) {
      await client.query(
        'INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [project.id, uid, uid === req.user.id ? 'PI' : 'researcher']
      );
    }

    await client.query('COMMIT');
    res.status(201).json(project);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Project code already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/projects/:id — admin updates project
router.patch('/:id', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { name, description, total_budget, payment_type, status, start_date, end_date } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE projects SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        total_budget = COALESCE($3, total_budget),
        payment_type = COALESCE($4, payment_type),
        status = COALESCE($5, status),
        start_date = COALESCE($6, start_date),
        end_date = COALESCE($7, end_date)
       WHERE id = $8 RETURNING *`,
      [name, description, total_budget, payment_type, status, start_date, end_date, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:id/members — add member to project
router.post('/:id/members', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { user_id, role = 'researcher' } = req.body;
  try {
    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [id, user_id, role]
    );
    res.json({ message: 'Member added' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id/members/:uid
router.delete('/:id/members/:uid', authenticate, adminOnly, async (req, res) => {
  const { id, uid } = req.params;
  try {
    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [id, uid]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Fund Installments ----

// POST /api/projects/:id/installments
router.post('/:id/installments', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { amount, expected_date, note } = req.body;
  if (!amount) return res.status(400).json({ error: 'Amount required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO fund_installments (project_id, amount, expected_date, note)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, amount, expected_date || null, note || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/projects/:id/installments/:iid — mark received
router.patch('/:id/installments/:iid', authenticate, adminOnly, async (req, res) => {
  const { iid } = req.params;
  const { status, received_date, note } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE fund_installments SET
        status = COALESCE($1, status),
        received_date = COALESCE($2, received_date),
        note = COALESCE($3, note)
       WHERE id = $4 RETURNING *`,
      [status, received_date || null, note, iid]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id — admin deletes project (cascading)
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Delete all expenses for this project
    await client.query('DELETE FROM expenses WHERE project_id = $1', [id]);
    // Delete all project members
    await client.query('DELETE FROM project_members WHERE project_id = $1', [id]);
    // Delete all fund installments
    await client.query('DELETE FROM fund_installments WHERE project_id = $1', [id]);
    // Delete the project
    await client.query('DELETE FROM projects WHERE id = $1', [id]);
    // Log audit
    await client.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_value, changed_at)
       VALUES ('projects', $1, 'deleted', $2, $3, NOW())`,
      [id, req.user.id, JSON.stringify({ id, deleted_by: req.user.id })]
    );
    await client.query('COMMIT');
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/projects/bulk/status — bulk update project status
router.patch('/bulk/status', authenticate, adminOnly, async (req, res) => {
  const { project_ids, status } = req.body;
  if (!Array.isArray(project_ids) || !status) {
    return res.status(400).json({ error: 'project_ids array and status required' });
  }
  try {
    const placeholders = project_ids.map((_, i) => `$${i + 1}`).join(',');
    await pool.query(
      `UPDATE projects SET status = $${project_ids.length + 1} WHERE id IN (${placeholders})`,
      [...project_ids, status]
    );
    // Log each update
    for (const pid of project_ids) {
      await pool.query(
        `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_value, changed_at)
         VALUES ('projects', $1, 'bulk_status_update', $2, $3, NOW())`,
        [pid, req.user.id, JSON.stringify({ status })]
      );
    }
    res.json({ message: `Updated ${project_ids.length} projects` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
