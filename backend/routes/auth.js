const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { authenticate, adminOnly } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail, EMAIL_ENABLED } = require('../utils/email');

function makeToken() { return crypto.randomBytes(32).toString('hex'); }

function issueJwt(user, workspace) {
  return jwt.sign(
    {
      id:           user.id,
      email:        user.email,
      role:         user.role,
      name:         user.name,
      workspace_id: user.workspace_id,
      workspace_name:   workspace.name,
      report_header:    workspace.report_header || workspace.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── POST /api/auth/register ──────────────────────────────────────
// Creates a new workspace + admin user in one step
router.post('/register', async (req, res) => {
  const { name, email, password, workspace_name, report_header, position } = req.body;
  if (!name || !email || !password || !workspace_name)
    return res.status(400).json({ error: 'name, email, password and workspace_name are required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create workspace
    const { rows: ws } = await client.query(
      `INSERT INTO workspaces (name, report_header) VALUES ($1, $2) RETURNING *`,
      [workspace_name.trim(), (report_header || workspace_name).trim()]
    );
    const workspace = ws[0];

    // Create admin user
    const hashed       = await bcrypt.hash(password, 10);
    const verifyToken  = EMAIL_ENABLED ? makeToken() : null;
    const verifyExpiry = EMAIL_ENABLED ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const { rows: users } = await client.query(
      `INSERT INTO users
         (workspace_id, name, email, password, role, position,
          email_verified, email_verify_token, email_verify_expires)
       VALUES ($1,$2,$3,$4,'admin',$5, $6,$7,$8)
       RETURNING *`,
      [workspace.id, name.trim(), email.toLowerCase().trim(), hashed,
       position || null,
       !EMAIL_ENABLED,   // if no email configured, skip verification
       verifyToken, verifyExpiry]
    );
    const user = users[0];

    await client.query('COMMIT');

    if (EMAIL_ENABLED && verifyToken) {
      try { await sendVerificationEmail(email, name, verifyToken); }
      catch (e) { console.error('Verification email failed:', e.message); }
    }

    res.status(201).json({
      message: EMAIL_ENABLED
        ? 'Workspace created! Check your email to verify your account before signing in.'
        : 'Workspace created! You can sign in now.',
      email_verification_required: EMAIL_ENABLED,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ── GET /api/auth/verify-email?token=... ────────────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });
  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET email_verified = TRUE, email_verify_token = NULL, email_verify_expires = NULL
       WHERE email_verify_token = $1 AND email_verify_expires > NOW()
       RETURNING id, name`,
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired link. Please register again.' });
    res.json({ message: 'Email verified! You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await pool.query(
      `SELECT u.*, w.name AS workspace_name, w.report_header
       FROM users u JOIN workspaces w ON w.id = u.workspace_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.email_verified)
      return res.status(403).json({
        error: 'Please verify your email first. Check your inbox for a verification link.'
      });

    const workspace = { name: user.workspace_name, report_header: user.report_header };
    const token = issueJwt(user, workspace);

    res.json({
      token,
      user: {
        id:             user.id,
        name:           user.name,
        email:          user.email,
        role:           user.role,
        position:       user.position,
        workspace_id:   user.workspace_id,
        workspace_name: user.workspace_name,
        report_header:  user.report_header || user.workspace_name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/forgot-password ──────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Always return success — never reveal if email exists
  res.json({ message: 'If that email is registered, a reset link has been sent.' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]
    );
    if (!rows.length) return;

    const token  = makeToken();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expiry, rows[0].id]
    );

    if (EMAIL_ENABLED) {
      await sendPasswordResetEmail(email, rows[0].name, token);
    } else {
      console.log(`[DEV] Password reset token for ${email}: ${token}`);
    }
  } catch (err) {
    console.error('Forgot password error:', err.message);
  }
});

// ── POST /api/auth/reset-password ───────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `UPDATE users
       SET password = $1, reset_token = NULL, reset_token_expires = NULL
       WHERE reset_token = $2 AND reset_token_expires > NOW()
       RETURNING id, name`,
      [hashed, token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired link. Please request a new one.' });
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/auth/change-password (logged in user) ────────────
router.patch('/change-password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/auth/profile ──────────────────────────────────────
router.patch('/profile', authenticate, async (req, res) => {
  const { name, position } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET
         name     = COALESCE($1, name),
         position = COALESCE($2, position)
       WHERE id = $3
       RETURNING id, name, email, role, position, workspace_id`,
      [name || null, position || null, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/auth/workspace ── admin updates workspace settings ─
router.patch('/workspace', authenticate, adminOnly, async (req, res) => {
  const { name, report_header } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE workspaces SET
         name          = COALESCE($1, name),
         report_header = COALESCE($2, report_header)
       WHERE id = $3
       RETURNING *`,
      [name || null, report_header || null, req.user.workspace_id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.position, u.workspace_id, u.created_at,
              w.name AS workspace_name, w.report_header
       FROM users u JOIN workspaces w ON w.id = u.workspace_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/users — admin lists members of their workspace ──
router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, position, email_verified, created_at
       FROM users WHERE workspace_id = $1 ORDER BY role DESC, name ASC`,
      [req.user.workspace_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/users — admin creates a member directly ───────
// No email verification — admin already trusts this person
router.post('/users', authenticate, adminOnly, async (req, res) => {
  const { name, email, password, role = 'member', position } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!['admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (workspace_id, name, email, password, role, position, email_verified)
       VALUES ($1,$2,$3,$4,$5,$6, TRUE)
       RETURNING id, name, email, role, position, created_at`,
      [req.user.workspace_id, name.trim(), email.toLowerCase().trim(), hashed, role, position || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/auth/users/:id — admin edits a member ─────────────
router.patch('/users/:id', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { name, role, position } = req.body;
  if (role && !['admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const { rows } = await pool.query(
      `UPDATE users SET
         name     = COALESCE($1, name),
         role     = COALESCE($2, role),
         position = COALESCE($3, position)
       WHERE id = $4 AND workspace_id = $5
       RETURNING id, name, email, role, position`,
      [name || null, role || null, position || null, id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found in your workspace' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/auth/users/:id/reset-password ─────────────────────
router.patch('/users/:id/reset-password', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `UPDATE users SET password = $1 WHERE id = $2 AND workspace_id = $3 RETURNING name`,
      [hashed, id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `Password reset for ${rows[0].name}` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/auth/users/:id ────────────────────────────────────
router.delete('/users/:id', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  try {
    const { rows } = await pool.query(
      'DELETE FROM users WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
