const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate, superOnly } = require('../middleware/auth');

// GET /api/super/stats
router.get('/stats', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM workspaces)                                         AS total_workspaces,
        (SELECT COUNT(*) FROM users WHERE role = 'admin')                        AS total_admins,
        (SELECT COUNT(*) FROM users WHERE role = 'member')                       AS total_members,
        (SELECT COUNT(*) FROM projects WHERE archived = FALSE)                   AS active_projects,
        (SELECT COUNT(*) FROM projects)                                          AS total_projects,
        (SELECT COUNT(*) FROM expenses)                                          AS total_expenses,
        (SELECT COUNT(*) FROM workspaces
         WHERE id IN (SELECT workspace_id FROM projects WHERE archived=FALSE GROUP BY workspace_id))
                                                                                 AS workspaces_with_projects,
        (SELECT COUNT(*) FROM workspaces
         WHERE id NOT IN (SELECT DISTINCT workspace_id FROM projects WHERE workspace_id IS NOT NULL))
                                                                                 AS ghost_workspaces,
        (SELECT COUNT(*) FROM users
         WHERE last_active > NOW() - INTERVAL '7 days' AND role != 'superadmin') AS active_users_7d,
        (SELECT COUNT(*) FROM workspaces
         WHERE created_at > NOW() - INTERVAL '30 days')                          AS new_workspaces_30d,
        (SELECT COUNT(*) FROM workspaces
         WHERE last_active > NOW() - INTERVAL '7 days' OR
               id IN (SELECT DISTINCT workspace_id FROM users
                      WHERE last_active > NOW() - INTERVAL '7 days'))            AS active_workspaces_7d
    `);
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/super/workspaces — full list with admin contact info
router.get('/workspaces', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        w.id, w.name, w.report_header, w.created_at,
        -- Admin info (first admin found)
        (SELECT u.name  FROM users u WHERE u.workspace_id=w.id AND u.role='admin' ORDER BY u.created_at LIMIT 1) AS admin_name,
        (SELECT u.email FROM users u WHERE u.workspace_id=w.id AND u.role='admin' ORDER BY u.created_at LIMIT 1) AS admin_email,
        (SELECT u.institution FROM users u WHERE u.workspace_id=w.id AND u.role='admin' ORDER BY u.created_at LIMIT 1) AS admin_institution,
        (SELECT u.role_in_project FROM users u WHERE u.workspace_id=w.id AND u.role='admin' ORDER BY u.created_at LIMIT 1) AS admin_role_in_project,
        -- Counts
        COUNT(DISTINCT u.id) FILTER (WHERE u.role='admin')  AS admin_count,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role='member') AS member_count,
        COUNT(DISTINCT p.id) FILTER (WHERE p.archived=FALSE) AS active_project_count,
        COUNT(DISTINCT p.id)                                  AS total_project_count,
        COUNT(DISTINCT e.id)                                  AS expense_count,
        -- Activity
        MAX(u.last_active) AS last_active
      FROM workspaces w
      LEFT JOIN users    u ON u.workspace_id = w.id
      LEFT JOIN projects p ON p.workspace_id = w.id
      LEFT JOIN expenses e ON e.project_id = p.id
      GROUP BY w.id
      ORDER BY MAX(u.last_active) DESC NULLS LAST
    `);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/super/workspaces/:id — workspace detail with team list
router.get('/workspaces/:id', authenticate, superOnly, async (req, res) => {
  try {
    const { rows: ws } = await pool.query('SELECT * FROM workspaces WHERE id=$1', [req.params.id]);
    if (!ws.length) return res.status(404).json({ error: 'Not found' });

    const { rows: members } = await pool.query(
      `SELECT id, name, email, role, position, designation, institution,
              role_in_project, research_area, last_active, created_at
       FROM users WHERE workspace_id=$1 ORDER BY role DESC, name ASC`,
      [req.params.id]
    );

    const { rows: projects } = await pool.query(
      `SELECT id, code, name, status, archived, total_budget, created_at
       FROM projects WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 10`,
      [req.params.id]
    );

    res.json({ workspace: ws[0], members, projects });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/super/growth — monthly new workspace registrations (last 12 months)
router.get('/growth', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(created_at, 'Mon YY') AS month,
        COUNT(*) AS count
      FROM workspaces
      WHERE created_at > NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon YY')
      ORDER BY DATE_TRUNC('month', created_at)
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/super/workspaces/:id
router.delete('/workspaces/:id', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM workspaces WHERE id=$1 RETURNING name', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: `Workspace "${rows[0].name}" deleted` });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
