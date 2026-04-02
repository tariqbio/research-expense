// Superadmin routes — platform management only
const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate, superOnly } = require('../middleware/auth');

router.get('/stats', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM workspaces)                                 AS total_workspaces,
        (SELECT COUNT(*) FROM users WHERE role != 'superadmin')          AS total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'admin')                AS total_admins,
        (SELECT COUNT(*) FROM users WHERE role = 'member')               AS total_members,
        (SELECT COUNT(*) FROM projects)                                  AS total_projects,
        (SELECT COUNT(*) FROM projects WHERE status='active')            AS active_projects,
        (SELECT COUNT(*) FROM projects WHERE status='completed')         AS completed_projects,
        (SELECT COUNT(*) FROM expenses)                                  AS total_expenses,
        (SELECT COUNT(*) FROM users
         WHERE last_active > NOW() - INTERVAL '7 days'
           AND role != 'superadmin')                                     AS active_users_7d,
        (SELECT COUNT(*) FROM users
         WHERE last_active > NOW() - INTERVAL '24 hours'
           AND role != 'superadmin')                                     AS active_users_24h,
        (SELECT COUNT(*) FROM workspaces
         WHERE created_at > NOW() - INTERVAL '30 days')                 AS new_workspaces_30d,
        (SELECT COUNT(*) FROM workspaces
         WHERE created_at > NOW() - INTERVAL '7 days')                  AS new_workspaces_7d,
        (SELECT COALESCE(ROUND(AVG(cnt),1),0) FROM (
           SELECT COUNT(u.id) AS cnt FROM workspaces w
           LEFT JOIN users u ON u.workspace_id = w.id AND u.role='member'
           GROUP BY w.id) sub)                                           AS avg_team_size
    `);

    const { rows: growth } = await pool.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS month,
             COUNT(*) AS count
      FROM workspaces
      WHERE created_at > NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    const { rows: degrees } = await pool.query(`
      SELECT COALESCE(academic_degree,'Not specified') AS label, COUNT(*) AS count
      FROM users WHERE role='admin' AND academic_degree IS NOT NULL AND academic_degree!=''
      GROUP BY academic_degree ORDER BY count DESC LIMIT 8
    `);

    const { rows: agencies } = await pool.query(`
      SELECT granting_agency AS label, COUNT(*) AS count
      FROM users WHERE role='admin' AND granting_agency IS NOT NULL AND granting_agency!=''
      GROUP BY granting_agency ORDER BY count DESC LIMIT 8
    `);

    const { rows: areas } = await pool.query(`
      SELECT research_area AS label, COUNT(*) AS count
      FROM users WHERE role='admin' AND research_area IS NOT NULL AND research_area!=''
      GROUP BY research_area ORDER BY count DESC LIMIT 10
    `);

    const { rows: institutions } = await pool.query(`
      SELECT institution AS label, COUNT(*) AS count
      FROM users WHERE role='admin' AND institution IS NOT NULL AND institution!=''
      GROUP BY institution ORDER BY count DESC LIMIT 8
    `);

    res.json({
      ...rows[0],
      monthly_growth: growth,
      degree_breakdown: degrees,
      top_agencies: agencies,
      top_research_areas: areas,
      top_institutions: institutions,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/workspaces', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        w.id, w.name, w.report_header, w.created_at,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role='admin')    AS admin_count,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role='member')   AS member_count,
        COUNT(DISTINCT p.id)                                   AS project_count,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status='active') AS active_project_count,
        MAX(u.last_active)                                     AS last_active,
        MAX(u.institution)   FILTER (WHERE u.role='admin')    AS institution,
        MAX(u.research_area) FILTER (WHERE u.role='admin')    AS research_area,
        MAX(u.granting_agency) FILTER (WHERE u.role='admin')  AS granting_agency,
        MAX(u.academic_degree) FILTER (WHERE u.role='admin')  AS academic_degree,
        MAX(u.position)      FILTER (WHERE u.role='admin')    AS pi_position
      FROM workspaces w
      LEFT JOIN users    u ON u.workspace_id = w.id
      LEFT JOIN projects p ON p.workspace_id = w.id
      GROUP BY w.id ORDER BY w.created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/workspaces/:id/members', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, role, position, designation, last_active, created_at
      FROM users WHERE workspace_id=$1 AND role!='superadmin' ORDER BY role, name
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/workspaces/:id', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM workspaces WHERE id=$1 RETURNING name', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Workspace not found' });
    res.json({ message: `Workspace "${rows[0].name}" deleted` });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
