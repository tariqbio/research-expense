// Superadmin routes — only accessible by role=superadmin
// Can see all workspaces, switch context into any, but CANNOT see financial data
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/pool');
const { authenticate, superOnly } = require('../middleware/auth');

// ── GET /api/super/workspaces — list all workspaces ──────────────
router.get('/workspaces', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.*,
         COUNT(DISTINCT u.id)  FILTER (WHERE u.role != 'superadmin') AS user_count,
         COUNT(DISTINCT p.id)                                          AS project_count,
         MAX(u.last_active)                                            AS last_active
       FROM workspaces w
       LEFT JOIN users    u ON u.workspace_id = w.id
       LEFT JOIN projects p ON p.workspace_id = w.id
       GROUP BY w.id ORDER BY w.created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── GET /api/super/workspaces/:id — workspace details (no financial data) ──
router.get('/workspaces/:id', authenticate, superOnly, async (req, res) => {
  try {
    const { rows: ws } = await pool.query('SELECT * FROM workspaces WHERE id=$1', [req.params.id]);
    if (!ws.length) return res.status(404).json({ error: 'Workspace not found' });

    const { rows: users } = await pool.query(
      `SELECT id, name, email, role, position, designation, last_active, created_at
       FROM users WHERE workspace_id=$1 ORDER BY role DESC, name`, [req.params.id]
    );
    const { rows: projects } = await pool.query(
      `SELECT id, code, name, status, created_at FROM projects WHERE workspace_id=$1 ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({ workspace: ws[0], users, projects });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── POST /api/super/switch/:workspace_id — switch into a workspace ──
// Returns a scoped JWT that works as the workspace admin
// Superadmin can browse the UI as that workspace admin WITHOUT seeing financial details
router.post('/switch/:workspace_id', authenticate, superOnly, async (req, res) => {
  const { workspace_id } = req.params;
  try {
    const { rows: ws } = await pool.query('SELECT * FROM workspaces WHERE id=$1', [workspace_id]);
    if (!ws.length) return res.status(404).json({ error: 'Workspace not found' });

    // Issue a token scoped to that workspace, but with a special flag
    const token = jwt.sign({
      id:             req.user.id,
      email:          req.user.email,
      role:           'admin',           // acts as admin in this workspace
      name:           req.user.name,
      workspace_id:   parseInt(workspace_id),
      workspace_name: ws[0].name,
      report_header:  ws[0].report_header,
      is_super_switch: true,             // flag — UI shows "viewing as" banner
    }, process.env.JWT_SECRET, { expiresIn: '2h' });

    res.json({
      token,
      workspace: ws[0],
      message: `Switched to workspace: ${ws[0].name}`,
    });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── DELETE /api/super/workspaces/:id — delete a workspace ────────
router.delete('/workspaces/:id', authenticate, superOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM workspaces WHERE id=$1', [req.params.id]);
    res.json({ message: 'Workspace deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── GET /api/super/stats — platform overview ──────────────────────
router.get('/stats', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM workspaces)                            AS total_workspaces,
        (SELECT COUNT(*) FROM users WHERE role != 'superadmin')      AS total_users,
        (SELECT COUNT(*) FROM projects)                              AS total_projects,
        (SELECT COUNT(*) FROM users
         WHERE last_active > NOW() - INTERVAL '7 days'
           AND role != 'superadmin')                                 AS active_users_7d
    `);
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
