const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate, adminOnly } = require('../middleware/auth');

// All queries filter by req.user.workspace_id — complete isolation between orgs

// GET /api/projects
router.get('/', authenticate, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = `
        SELECT p.*, u.name AS created_by_name,
          COALESCE(SUM(e.amount), 0) AS total_spent,
          COALESCE(SUM(CASE WHEN e.reimbursed THEN e.amount ELSE 0 END), 0) AS total_reimbursed,
          COALESCE(SUM(CASE WHEN NOT e.reimbursed THEN e.amount ELSE 0 END), 0) AS total_pending
        FROM projects p
        LEFT JOIN users u ON u.id = p.created_by
        LEFT JOIN expenses e ON e.project_id = p.id
        WHERE p.workspace_id = $1
        GROUP BY p.id, u.name ORDER BY p.created_at DESC`;
      params = [req.user.workspace_id];
    } else {
      query = `
        SELECT p.*, u.name AS created_by_name,
          COALESCE(SUM(e.amount), 0) AS total_spent,
          COALESCE(SUM(CASE WHEN e.reimbursed THEN e.amount ELSE 0 END), 0) AS total_reimbursed,
          COALESCE(SUM(CASE WHEN NOT e.reimbursed THEN e.amount ELSE 0 END), 0) AS total_pending
        FROM projects p
        JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
        LEFT JOIN users u ON u.id = p.created_by
        LEFT JOIN expenses e ON e.project_id = p.id
        WHERE p.workspace_id = $2 AND p.archived = FALSE
        GROUP BY p.id, u.name ORDER BY p.created_at DESC`;
      params = [req.user.id, req.user.workspace_id];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/projects/:id
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.role !== 'admin') {
      const { rows: access } = await pool.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (!access.length) return res.status(403).json({ error: 'Access denied' });
    }

    const { rows: project } = await pool.query(
      `SELECT p.*, u.name AS created_by_name FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       WHERE p.id = $1 AND p.workspace_id = $2`,
      [id, req.user.workspace_id]
    );
    if (!project.length) return res.status(404).json({ error: 'Project not found' });

    const { rows: members } = await pool.query(
      `SELECT u.id, u.name, u.email, u.position, pm.role FROM project_members pm
       JOIN users u ON u.id = pm.user_id WHERE pm.project_id = $1`, [id]
    );
    const { rows: installments } = await pool.query(
      'SELECT * FROM fund_installments WHERE project_id = $1 ORDER BY expected_date ASC', [id]
    );
    const { rows: stats } = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total_spent,
              COALESCE(SUM(CASE WHEN reimbursed THEN amount ELSE 0 END),0) AS total_reimbursed,
              COALESCE(SUM(CASE WHEN NOT reimbursed THEN amount ELSE 0 END),0) AS total_pending,
              COUNT(*) AS expense_count
       FROM expenses WHERE project_id = $1`, [id]
    );
    res.json({ ...project[0], members, installments, stats: stats[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/projects — admin only
router.post('/', authenticate, adminOnly, async (req, res) => {
  const { code, name, description, total_budget, payment_type, status, start_date, end_date } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO projects (workspace_id, code, name, description, total_budget, payment_type, status, start_date, end_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.workspace_id, code.trim().toUpperCase(), name.trim(), description || null,
       Number(total_budget) || 0, payment_type || 'installment', status || 'active',
       start_date || null, end_date || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Project code already exists in your organization' });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/projects/:id
router.patch('/:id', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { code, name, description, total_budget, payment_type, status, start_date, end_date } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE projects SET
        code         = COALESCE($1, code),
        name         = COALESCE($2, name),
        description  = COALESCE($3, description),
        total_budget = COALESCE($4, total_budget),
        payment_type = COALESCE($5, payment_type),
        status       = COALESCE($6, status),
        start_date   = COALESCE($7, start_date),
        end_date     = COALESCE($8, end_date)
       WHERE id = $9 AND workspace_id = $10 RETURNING *`,
      [code || null, name || null, description || null,
       total_budget != null ? Number(total_budget) : null,
       payment_type || null, status || null,
       start_date || null, end_date || null,
       id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Project code already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/projects/:id/members
router.post('/:id/members', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { user_id, role = 'researcher' } = req.body;
  try {
    // Ensure project belongs to this org
    const { rows: proj } = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND workspace_id = $2', [id, req.user.workspace_id]
    );
    if (!proj.length) return res.status(404).json({ error: 'Project not found' });
    // Ensure user belongs to this org
    const { rows: usr } = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND workspace_id = $2', [user_id, req.user.workspace_id]
    );
    if (!usr.length) return res.status(400).json({ error: 'User not in your organization' });

    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3`,
      [id, user_id, role]
    );
    res.json({ message: 'Member added' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/projects/:id/members/:uid
router.delete('/:id/members/:uid', authenticate, adminOnly, async (req, res) => {
  const { id, uid } = req.params;
  try {
    await pool.query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [id, uid]);
    res.json({ message: 'Member removed' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Fund installments ────────────────────────────────────────────

// POST /api/projects/:id/installments
router.post('/:id/installments', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { amount, expected_date, received_date, status, note } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount required' });
  try {
    const { rows: proj } = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND workspace_id = $2', [id, req.user.workspace_id]
    );
    if (!proj.length) return res.status(404).json({ error: 'Project not found' });

    const { rows } = await pool.query(
      `INSERT INTO fund_installments (project_id, amount, expected_date, received_date, status, note)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, Number(amount), expected_date || null, received_date || null, status || 'pending', note || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/projects/:id/installments/:iid
router.patch('/:id/installments/:iid', authenticate, adminOnly, async (req, res) => {
  const { iid } = req.params;
  const { amount, expected_date, received_date, status, note } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE fund_installments SET
        amount        = COALESCE($1, amount),
        expected_date = COALESCE($2, expected_date),
        received_date = COALESCE($3, received_date),
        status        = COALESCE($4, status),
        note          = COALESCE($5, note)
       WHERE id = $6 RETURNING *`,
      [amount ? Number(amount) : null, expected_date || null, received_date || null,
       status || null, note || null, iid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Installment not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/projects/:id/installments/:iid
router.delete('/:id/installments/:iid', authenticate, adminOnly, async (req, res) => {
  const { iid } = req.params;
  try {
    await pool.query('DELETE FROM fund_installments WHERE id = $1', [iid]);
    res.json({ message: 'Installment deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});


// PATCH /api/projects/:id/archive — toggle archive status
router.patch('/:id/archive', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { archived } = req.body; // true or false
  try {
    const { rows } = await pool.query(
      `UPDATE projects SET
         archived    = $1,
         archived_at = CASE WHEN $1 THEN NOW() ELSE NULL END
       WHERE id = $2 AND workspace_id = $3
       RETURNING id, name, archived, archived_at`,
      [!!archived, id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/projects/archived — list archived projects
router.get('/archived', authenticate, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = `
        SELECT p.*, u.name AS created_by_name,
          COALESCE(SUM(e.amount),0) AS total_spent,
          COALESCE(SUM(CASE WHEN e.reimbursed THEN e.amount ELSE 0 END),0) AS total_reimbursed,
          COALESCE(SUM(CASE WHEN NOT e.reimbursed THEN e.amount ELSE 0 END),0) AS total_pending
        FROM projects p
        LEFT JOIN users u ON u.id = p.created_by
        LEFT JOIN expenses e ON e.project_id = p.id
        WHERE p.workspace_id = $1 AND p.archived = TRUE
        GROUP BY p.id, u.name ORDER BY p.archived_at DESC`;
      params = [req.user.workspace_id];
    } else {
      query = `
        SELECT p.*, u.name AS created_by_name,
          COALESCE(SUM(e.amount),0) AS total_spent,
          COALESCE(SUM(CASE WHEN e.reimbursed THEN e.amount ELSE 0 END),0) AS total_reimbursed,
          COALESCE(SUM(CASE WHEN NOT e.reimbursed THEN e.amount ELSE 0 END),0) AS total_pending
        FROM projects p
        JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
        LEFT JOIN users u ON u.id = p.created_by
        LEFT JOIN expenses e ON e.project_id = p.id
        WHERE p.workspace_id = $2 AND p.archived = TRUE
        GROUP BY p.id, u.name ORDER BY p.archived_at DESC`;
      params = [req.user.id, req.user.workspace_id];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
