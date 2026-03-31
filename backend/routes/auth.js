const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { authenticate, adminOnly } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail, EMAIL_ENABLED } = require('../utils/email');

const makeToken = () => crypto.randomBytes(32).toString('hex');

function issueJwt(user, workspace) {
  return jwt.sign({
    id:             user.id,
    email:          user.email,
    role:           user.role,
    name:           user.name,
    workspace_id:   user.workspace_id,
    workspace_name: workspace?.name        || null,
    report_header:  workspace?.report_header || null,
  }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ── POST /api/auth/register ─────────────────────────────────────
// Creates workspace + admin user in one transaction
router.post('/register', async (req, res) => {
  const { name, email, password, workspace_name, report_header, position } = req.body;
  if (!name || !email || !password || !workspace_name)
    return res.status(400).json({ error: 'name, email, password and workspace_name are required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: ws } = await client.query(
      `INSERT INTO workspaces (name, report_header) VALUES ($1,$2) RETURNING *`,
      [workspace_name.trim(), (report_header || workspace_name).trim()]
    );
    const workspace = ws[0];

    const hashed      = await bcrypt.hash(password, 10);
    const needVerify  = EMAIL_ENABLED;
    const verifyToken = needVerify ? makeToken() : null;
    const verifyExp   = needVerify ? new Date(Date.now() + 86400000) : null;

    const { rows: users } = await client.query(
      `INSERT INTO users
         (workspace_id, name, email, password, role, position,
          email_verified, email_verify_token, email_verify_expires)
       VALUES ($1,$2,$3,$4,'admin',$5,$6,$7,$8) RETURNING *`,
      [workspace.id, name.trim(), email.toLowerCase().trim(), hashed,
       position || null, !needVerify, verifyToken, verifyExp]
    );

    await client.query('COMMIT');

    if (needVerify) {
      try { await sendVerificationEmail(email, name, verifyToken); } catch(e) { console.error(e.message); }
    }

    res.status(201).json({
      message: needVerify
        ? 'Workspace created! Check your email to verify before signing in.'
        : 'Workspace created! You can sign in now.',
      email_verification_required: needVerify,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally { client.release(); }
});

// ── GET /api/auth/verify-email?token=... ────────────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });
  try {
    const { rows } = await pool.query(
      `UPDATE users SET email_verified=TRUE, email_verify_token=NULL, email_verify_expires=NULL
       WHERE email_verify_token=$1 AND email_verify_expires > NOW() RETURNING id`,
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired link.' });
    res.json({ message: 'Email verified! You can now sign in.' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── POST /api/auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await pool.query(
      `SELECT u.*, w.name AS workspace_name, w.report_header
       FROM users u
       LEFT JOIN workspaces w ON w.id = u.workspace_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.email_verified)
      return res.status(403).json({ error: 'Please verify your email first. Check your inbox.' });

    const workspace = user.workspace_id
      ? { name: user.workspace_name, report_header: user.report_header }
      : null;

    const token = issueJwt(user, workspace);

    res.json({
      token,
      user: {
        id:             user.id,
        name:           user.name,
        email:          user.email,
        role:           user.role,
        position:       user.position,
        designation:    user.designation,
        workspace_id:   user.workspace_id,
        workspace_name: user.workspace_name,
        report_header:  user.report_header,
      },
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── POST /api/auth/forgot-password ──────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase().trim()]);
    if (!rows.length) return;
    const token = makeToken();
    await pool.query(
      'UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3',
      [token, new Date(Date.now() + 3600000), rows[0].id]
    );
    if (EMAIL_ENABLED) {
      await sendPasswordResetEmail(email, rows[0].name, token);
    } else {
      console.log(`[DEV] Reset token for ${email}: ${token}`);
      console.log(`[DEV] Reset link: ${process.env.APP_URL}/reset-password?token=${token}`);
    }
  } catch (err) { console.error('Forgot password error:', err.message); }
});

// ── POST /api/auth/reset-password ───────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `UPDATE users SET password=$1, reset_token=NULL, reset_token_expires=NULL
       WHERE reset_token=$2 AND reset_token_expires > NOW() RETURNING id`,
      [hashed, token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired link. Request a new one.' });
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── PATCH /api/auth/change-password ─────────────────────────────
router.patch('/change-password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  if (new_password.length < 8) return res.status(400).json({ error: 'Min 8 characters' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!await bcrypt.compare(current_password, rows[0].password))
      return res.status(401).json({ error: 'Current password is incorrect' });
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [await bcrypt.hash(new_password, 10), req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── PATCH /api/auth/profile ──────────────────────────────────────
// Every user can update their own profile
router.patch('/profile', authenticate, async (req, res) => {
  const { name, position, designation, gender, blood_type, location, phone, date_of_birth, avatar_url } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET
         name         = COALESCE($1, name),
         position     = COALESCE($2, position),
         designation  = COALESCE($3, designation),
         gender       = COALESCE($4, gender),
         blood_type   = COALESCE($5, blood_type),
         location     = COALESCE($6, location),
         phone        = COALESCE($7, phone),
         date_of_birth= COALESCE($8, date_of_birth),
         avatar_url   = COALESCE($9, avatar_url)
       WHERE id=$10
       RETURNING id, name, email, role, position, designation, gender,
                 blood_type, location, phone, date_of_birth, avatar_url, workspace_id`,
      [name||null, position||null, designation||null, gender||null,
       blood_type||null, location||null, phone||null, date_of_birth||null,
       avatar_url||null, req.user.id]
    );
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── PATCH /api/auth/workspace ────────────────────────────────────
router.patch('/workspace', authenticate, adminOnly, async (req, res) => {
  const { name, report_header } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE workspaces SET
         name          = COALESCE($1, name),
         report_header = COALESCE($2, report_header)
       WHERE id=$3 RETURNING *`,
      [name||null, report_header||null, req.user.workspace_id]
    );
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.*, w.name AS workspace_name, w.report_header
       FROM users u LEFT JOIN workspaces w ON w.id = u.workspace_id
       WHERE u.id=$1`, [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    delete u.password; delete u.reset_token; delete u.email_verify_token;
    res.json(u);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── GET /api/auth/users ──────────────────────────────────────────
router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, position, designation, email_verified,
              phone, location, last_active, created_at
       FROM users WHERE workspace_id=$1 ORDER BY role DESC, name ASC`,
      [req.user.workspace_id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── POST /api/auth/users — admin creates member ──────────────────
router.post('/users', authenticate, adminOnly, async (req, res) => {
  const { name, email, password, role='member', position, designation } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Min 8 characters' });
  if (!['admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (workspace_id,name,email,password,role,position,designation,email_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING id,name,email,role,position,designation,created_at`,
      [req.user.workspace_id, name.trim(), email.toLowerCase().trim(), hashed, role, position||null, designation||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/auth/users/:id ────────────────────────────────────
router.patch('/users/:id', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { name, role, position, designation } = req.body;
  if (role && !['admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const { rows } = await pool.query(
      `UPDATE users SET
         name        = COALESCE($1, name),
         role        = COALESCE($2, role),
         position    = COALESCE($3, position),
         designation = COALESCE($4, designation)
       WHERE id=$5 AND workspace_id=$6
       RETURNING id,name,email,role,position,designation`,
      [name||null, role||null, position||null, designation||null, id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── PATCH /api/auth/users/:id/reset-password ─────────────────────
router.patch('/users/:id/reset-password', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ error: 'Min 8 characters' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `UPDATE users SET password=$1 WHERE id=$2 AND workspace_id=$3 RETURNING name`,
      [hashed, id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `Password reset for ${rows[0].name}` });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── DELETE /api/auth/users/:id ────────────────────────────────────
router.delete('/users/:id', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  try {
    const { rows } = await pool.query(
      'DELETE FROM users WHERE id=$1 AND workspace_id=$2 RETURNING id',
      [id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Member removed' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});


// ── PATCH /api/auth/change-email (superadmin only) ───────────────
router.patch('/change-email', authenticate, async (req, res) => {
  // Only superadmin can change their own email (no workspace admin above them to do it)
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Only superadmin can change email this way' });
  const { new_email, password } = req.body;
  if (!new_email || !password) return res.status(400).json({ error: 'new_email and password required' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!await bcrypt.compare(password, rows[0].password))
      return res.status(401).json({ error: 'Password is incorrect' });
    const { rows: updated } = await pool.query(
      'UPDATE users SET email=$1 WHERE id=$2 RETURNING id, email',
      [new_email.toLowerCase().trim(), req.user.id]
    );
    res.json({ message: 'Email updated. Please sign in again.', email: updated[0].email });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Server error' });
  }
});


// ── GET /api/auth/users/:id/profile — admin views a member's full profile ──
router.get('/users/:id/profile', authenticate, async (req, res) => {
  const { id } = req.params;
  // Admin can view members in their own workspace
  // Superadmin cannot view member profiles (privacy)
  if (!['admin','member'].includes(req.user.role))
    return res.status(403).json({ error: 'Access denied' });
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, position, designation, gender,
              blood_type, location, phone, date_of_birth, avatar_url,
              last_active, created_at
       FROM users WHERE id=$1 AND workspace_id=$2`,
      [id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
