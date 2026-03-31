// Superadmin routes — platform management only
// Superadmin CANNOT see: project names, expense data, member names, financial info
// Superadmin CAN see: workspace count, user count, project count, activity dates
const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate, superOnly } = require('../middleware/auth');

// GET /api/super/stats — platform-level numbers only
router.get('/stats', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM workspaces)                                    AS total_workspaces,
        (SELECT COUNT(*) FROM users WHERE role != 'superadmin')              AS total_users,
        (SELECT COUNT(*) FROM projects)                                      AS total_projects,
        (SELECT COUNT(*) FROM expenses)                                      AS total_expenses,
        (SELECT COUNT(*) FROM users
         WHERE last_active > NOW() - INTERVAL '7 days'
           AND role != 'superadmin')                                         AS active_users_7d,
        (SELECT COUNT(*) FROM workspaces
         WHERE created_at > NOW() - INTERVAL '30 days')                     AS new_workspaces_30d
    `);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/super/workspaces — list workspaces with counts only, NO names of projects/members
router.get('/workspaces', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        w.id,
        w.name,
        w.report_header,
        w.created_at,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'admin')   AS admin_count,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'member')  AS member_count,
        COUNT(DISTINCT p.id)                                    AS project_count,
        MAX(u.last_active)                                      AS last_active
      FROM workspaces w
      LEFT JOIN users    u ON u.workspace_id = w.id
      LEFT JOIN projects p ON p.workspace_id = w.id
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/super/workspaces/:id
router.delete('/workspaces/:id', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM workspaces WHERE id=$1 RETURNING name', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Workspace not found' });
    res.json({ message: `Workspace "${rows[0].name}" deleted` });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
