const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { authenticate, adminOnly, superOnly } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail, EMAIL_ENABLED } = require('../utils/email');

const makeToken = () => crypto.randomBytes(32).toString('hex');
const makeCode  = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code; // e.g. "ABCD-EF23"
};

function issueJwt(user, workspace) {
  return jwt.sign({
    id:             user.id,
    email:          user.email,
    role:           user.role,
    name:           user.name,
    workspace_id:   user.workspace_id,
    workspace_name: workspace?.name         || null,
    report_header:  workspace?.report_header || null,
  }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ════════════════════════════════════════════════════════════
// WAY 1 — Public signup → pending superadmin approval
// ════════════════════════════════════════════════════════════

// POST /api/auth/request-access
router.post('/request-access', async (req, res) => {
  const { name, email, password, workspace_name, report_header, position, message,
          institution, funding_source, project_nature, research_area, role_in_project } = req.body;
  if (!name || !email || !password || !workspace_name)
    return res.status(400).json({ error: 'name, email, password and workspace_name are required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    // Check not already registered
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email=$1', [email.toLowerCase().trim()]
    );
    if (existing.length)
      return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO pending_signups
         (name, email, password, workspace_name, report_header, position, message,
          institution, funding_source, project_nature, research_area, role_in_project)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (email) DO UPDATE SET
         name=$1, password=$3, workspace_name=$4, report_header=$5,
         position=$6, message=$7, institution=$8, funding_source=$9,
         project_nature=$10, research_area=$11, role_in_project=$12, created_at=NOW()`,
      [name.trim(), email.toLowerCase().trim(), hashed,
       workspace_name.trim(), (report_header||workspace_name).trim(),
       position||null, message||null,
       institution||null, funding_source||null, project_nature||null,
       research_area||null, role_in_project||null]
    );
    res.status(201).json({
      message: 'Access request submitted. You will be notified when approved.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/pending-signups — superadmin lists pending requests
router.get('/pending-signups', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id,name,email,workspace_name,report_header,position,message,
              institution,funding_source,project_nature,research_area,role_in_project,
              created_at FROM pending_signups ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/pending-signups/:id/approve — superadmin approves
router.post('/pending-signups/:id/approve', authenticate, superOnly, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT * FROM pending_signups WHERE id=$1', [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Request not found' });
    const p = rows[0];

    // Create workspace
    const { rows: ws } = await client.query(
      `INSERT INTO workspaces (name, report_header) VALUES ($1,$2) RETURNING *`,
      [p.workspace_name, p.report_header]
    );
    // Create admin user — already email-verified since superadmin approved
    await client.query(
      `INSERT INTO users (workspace_id,name,email,password,role,position,email_verified)
       VALUES ($1,$2,$3,$4,'admin',$5,TRUE)`,
      [ws[0].id, p.name, p.email, p.password, p.position]
    );
    // Remove from pending
    await client.query('DELETE FROM pending_signups WHERE id=$1', [id]);
    await client.query('COMMIT');

    res.json({ message: `${p.name} approved. Workspace "${p.workspace_name}" created.` });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally { client.release(); }
});

// DELETE /api/auth/pending-signups/:id — superadmin rejects
router.delete('/pending-signups/:id', authenticate, superOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM pending_signups WHERE id=$1', [req.params.id]);
    res.json({ message: 'Request rejected and removed' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════
// WAY 2 — Admin generates invite link for a specific email
// ════════════════════════════════════════════════════════════

// POST /api/auth/invites — admin creates invite token
router.post('/invites', authenticate, adminOnly, async (req, res) => {
  const { email, role='member', project_id } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    // Check not already a user
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email=$1', [email.toLowerCase().trim()]
    );
    if (existing.length)
      return res.status(409).json({ error: 'That email is already registered' });

    const token     = makeToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO invite_tokens
         (token, workspace_id, created_by, email, role, project_id, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [token, req.user.workspace_id, req.user.id,
       email.toLowerCase().trim(), role, project_id||null, expiresAt]
    );

    const APP_URL = process.env.APP_URL || 'http://localhost:5173';
    res.status(201).json({
      token,
      email: email.toLowerCase().trim(),
      expires_at: expiresAt,
      invite_link: `${APP_URL}/join?token=${token}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/invites — admin lists their invite tokens
router.get('/invites', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, u.name AS created_by_name, p.name AS project_name
       FROM invite_tokens i
       LEFT JOIN users u ON u.id = i.created_by
       LEFT JOIN projects p ON p.id = i.project_id
       WHERE i.workspace_id=$1
       ORDER BY i.created_at DESC`,
      [req.user.workspace_id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/auth/invites/:id — admin revokes an invite
router.delete('/invites/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM invite_tokens WHERE id=$1 AND workspace_id=$2',
      [req.params.id, req.user.workspace_id]
    );
    res.json({ message: 'Invite revoked' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/auth/join?token=... — validate invite token (public, no auth)
router.get('/join', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });
  try {
    const { rows } = await pool.query(
      `SELECT i.*, w.name AS workspace_name, w.report_header, p.name AS project_name
       FROM invite_tokens i
       JOIN workspaces w ON w.id = i.workspace_id
       LEFT JOIN projects p ON p.id = i.project_id
       WHERE i.token=$1`,
      [token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invalid invite link' });
    const inv = rows[0];
    if (inv.used_at) return res.status(410).json({ error: 'This invite has already been used' });
    if (new Date() > new Date(inv.expires_at))
      return res.status(410).json({ error: 'This invite link has expired. Ask your admin for a new one.' });

    res.json({
      email:          inv.email,
      workspace_name: inv.workspace_name,
      report_header:  inv.report_header,
      project_name:   inv.project_name,
      role:           inv.role,
      expires_at:     inv.expires_at,
    });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/join — complete registration via invite token
router.post('/join', async (req, res) => {
  const { token, name, password, position } = req.body;
  if (!token || !name || !password)
    return res.status(400).json({ error: 'token, name and password required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT i.*, w.name AS workspace_name, w.report_header
       FROM invite_tokens i JOIN workspaces w ON w.id=i.workspace_id
       WHERE i.token=$1 FOR UPDATE`,
      [token]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Invalid invite link' }); }
    const inv = rows[0];
    if (inv.used_at) { await client.query('ROLLBACK'); return res.status(410).json({ error: 'Already used' }); }
    if (new Date() > new Date(inv.expires_at)) { await client.query('ROLLBACK'); return res.status(410).json({ error: 'Expired' }); }

    const hashed = await bcrypt.hash(password, 10);
    const { rows: newUser } = await client.query(
      `INSERT INTO users (workspace_id,name,email,password,role,position,email_verified)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING *`,
      [inv.workspace_id, name.trim(), inv.email, hashed, inv.role, position||null]
    );

    // Auto-join project if invite was for a specific project
    if (inv.project_id) {
      await client.query(
        `INSERT INTO project_members (project_id,user_id,role) VALUES ($1,$2,'researcher')
         ON CONFLICT DO NOTHING`,
        [inv.project_id, newUser[0].id]
      );
    }

    // Mark invite as used
    await client.query(
      'UPDATE invite_tokens SET used_at=NOW(), used_by=$1 WHERE id=$2',
      [newUser[0].id, inv.id]
    );

    await client.query('COMMIT');

    const workspace = { name: inv.workspace_name, report_header: inv.report_header };
    const jwtToken  = issueJwt(newUser[0], workspace);

    res.status(201).json({
      message: 'Account created successfully!',
      token: jwtToken,
      user: {
        id: newUser[0].id, name: newUser[0].name, email: newUser[0].email,
        role: newUser[0].role, workspace_id: inv.workspace_id,
        workspace_name: inv.workspace_name, report_header: inv.report_header,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error(err); res.status(500).json({ error: 'Server error' });
  } finally { client.release(); }
});

// ════════════════════════════════════════════════════════════
// WAY 3 — Admin generates invite code for a project
// ════════════════════════════════════════════════════════════

// POST /api/auth/invite-codes
router.post('/invite-codes', authenticate, adminOnly, async (req, res) => {
  const { project_id, max_uses=20 } = req.body;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });

  try {
    // Verify project belongs to this workspace
    const { rows: proj } = await pool.query(
      'SELECT id,name FROM projects WHERE id=$1 AND workspace_id=$2',
      [project_id, req.user.workspace_id]
    );
    if (!proj.length) return res.status(404).json({ error: 'Project not found' });

    // Generate unique code
    let code, attempts = 0;
    while (attempts < 10) {
      code = makeCode();
      const { rows: exists } = await pool.query(
        'SELECT id FROM invite_codes WHERE code=$1', [code]
      );
      if (!exists.length) break;
      attempts++;
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { rows } = await pool.query(
      `INSERT INTO invite_codes (code,workspace_id,created_by,project_id,max_uses,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [code, req.user.workspace_id, req.user.id, project_id, max_uses, expiresAt]
    );

    const APP_URL = process.env.APP_URL || 'http://localhost:5173';
    res.status(201).json({
      ...rows[0],
      project_name: proj[0].name,
      join_link: `${APP_URL}/code/${code}`,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/auth/invite-codes — admin lists codes for their workspace
router.get('/invite-codes', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ic.*, p.name AS project_name, u.name AS created_by_name
       FROM invite_codes ic
       LEFT JOIN projects p ON p.id=ic.project_id
       LEFT JOIN users u ON u.id=ic.created_by
       WHERE ic.workspace_id=$1 ORDER BY ic.created_at DESC`,
      [req.user.workspace_id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/auth/invite-codes/:id — admin deactivates a code
router.delete('/invite-codes/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await pool.query(
      'UPDATE invite_codes SET active=FALSE WHERE id=$1 AND workspace_id=$2',
      [req.params.id, req.user.workspace_id]
    );
    res.json({ message: 'Code deactivated' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/auth/code/:code — validate invite code (public)
router.get('/code/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT ic.*, w.name AS workspace_name, p.name AS project_name
       FROM invite_codes ic
       JOIN workspaces w ON w.id=ic.workspace_id
       LEFT JOIN projects p ON p.id=ic.project_id
       WHERE ic.code=$1`,
      [code.toUpperCase()]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invalid code' });
    const inv = rows[0];
    if (!inv.active) return res.status(410).json({ error: 'This code has been deactivated' });
    if (new Date() > new Date(inv.expires_at)) return res.status(410).json({ error: 'This code has expired' });
    if (inv.use_count >= inv.max_uses) return res.status(410).json({ error: 'This code has reached its maximum uses' });

    res.json({
      workspace_name: inv.workspace_name,
      project_name:   inv.project_name,
      uses_left:      inv.max_uses - inv.use_count,
      expires_at:     inv.expires_at,
    });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/code/:code — register via invite code
router.post('/code/:code', async (req, res) => {
  const { code } = req.params;
  const { name, email, password, position } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Min 8 characters' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT ic.*, w.name AS workspace_name, w.report_header
       FROM invite_codes ic JOIN workspaces w ON w.id=ic.workspace_id
       WHERE ic.code=$1 FOR UPDATE`,
      [code.toUpperCase()]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Invalid code' }); }
    const inv = rows[0];
    if (!inv.active || new Date()>new Date(inv.expires_at) || inv.use_count>=inv.max_uses) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'This code is no longer valid' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const { rows: newUser } = await client.query(
      `INSERT INTO users (workspace_id,name,email,password,role,position,email_verified)
       VALUES ($1,$2,$3,$4,'member',$5,TRUE) RETURNING *`,
      [inv.workspace_id, name.trim(), email.toLowerCase().trim(), hashed, position||null]
    );

    // Auto-join the project
    await client.query(
      `INSERT INTO project_members (project_id,user_id,role) VALUES ($1,$2,'researcher')
       ON CONFLICT DO NOTHING`,
      [inv.project_id, newUser[0].id]
    );

    // Increment use count
    await client.query(
      'UPDATE invite_codes SET use_count=use_count+1 WHERE id=$1', [inv.id]
    );

    await client.query('COMMIT');

    const workspace = { name: inv.workspace_name, report_header: inv.report_header };
    const jwtToken  = issueJwt(newUser[0], workspace);

    res.status(201).json({
      message: `Welcome! You have joined the project.`,
      token: jwtToken,
      user: {
        id: newUser[0].id, name: newUser[0].name, email: newUser[0].email,
        role: 'member', workspace_id: inv.workspace_id,
        workspace_name: inv.workspace_name, report_header: inv.report_header,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error(err); res.status(500).json({ error: 'Server error' });
  } finally { client.release(); }
});

// ════════════════════════════════════════════════════════════
// Standard auth routes (login, reset, profile, etc)
// ════════════════════════════════════════════════════════════

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await pool.query(
      `SELECT u.*, w.name AS workspace_name, w.report_header
       FROM users u LEFT JOIN workspaces w ON w.id=u.workspace_id
       WHERE u.email=$1`,
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    if (!await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.email_verified)
      return res.status(403).json({ error: 'Please verify your email first.' });

    const workspace = user.workspace_id
      ? { name: user.workspace_name, report_header: user.report_header } : null;
    const token = issueJwt(user, workspace);

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        position: user.position, designation: user.designation,
        workspace_id: user.workspace_id, workspace_name: user.workspace_name,
        report_header: user.report_header, avatar_url: user.avatar_url,
      },
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase().trim()]);
    if (!rows.length) return;
    const token = makeToken();
    await pool.query('UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3',
      [token, new Date(Date.now()+3600000), rows[0].id]);
    if (EMAIL_ENABLED) await sendPasswordResetEmail(email, rows[0].name, token);
    else console.log(`[DEV] Reset: ${process.env.APP_URL}/reset-password?token=${token}`);
  } catch (err) { console.error(err.message); }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token||!password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length<8) return res.status(400).json({ error: 'Min 8 characters' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `UPDATE users SET password=$1,reset_token=NULL,reset_token_expires=NULL
       WHERE reset_token=$2 AND reset_token_expires>NOW() RETURNING id`,
      [hashed, token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired link' });
    res.json({ message: 'Password reset. You can now sign in.' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/change-password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password||!new_password) return res.status(400).json({ error: 'Both required' });
  if (new_password.length<8) return res.status(400).json({ error: 'Min 8 characters' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!await bcrypt.compare(current_password, rows[0].password))
      return res.status(401).json({ error: 'Current password is incorrect' });
    await pool.query('UPDATE users SET password=$1 WHERE id=$2',
      [await bcrypt.hash(new_password,10), req.user.id]);
    res.json({ message: 'Password changed' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/change-email', authenticate, async (req, res) => {
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Only superadmin can change email' });
  const { new_email, password } = req.body;
  if (!new_email||!password) return res.status(400).json({ error: 'new_email and password required' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!await bcrypt.compare(password, rows[0].password))
      return res.status(401).json({ error: 'Password incorrect' });
    const { rows: updated } = await pool.query(
      'UPDATE users SET email=$1 WHERE id=$2 RETURNING email',
      [new_email.toLowerCase().trim(), req.user.id]
    );
    res.json({ message: 'Email updated. Please sign in again.', email: updated[0].email });
  } catch (err) {
    if (err.code==='23505') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/profile', authenticate, async (req, res) => {
  const { name,position,designation,gender,blood_type,location,phone,date_of_birth,avatar_url } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET
         name=COALESCE($1,name), position=COALESCE($2,position),
         designation=COALESCE($3,designation), gender=COALESCE($4,gender),
         blood_type=COALESCE($5,blood_type), location=COALESCE($6,location),
         phone=COALESCE($7,phone), date_of_birth=COALESCE($8,date_of_birth),
         avatar_url=COALESCE($9,avatar_url)
       WHERE id=$10
       RETURNING id,name,email,role,position,designation,gender,
                 blood_type,location,phone,date_of_birth,avatar_url,workspace_id`,
      [name||null,position||null,designation||null,gender||null,
       blood_type||null,location||null,phone||null,date_of_birth||null,
       avatar_url||null, req.user.id]
    );
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/workspace', authenticate, adminOnly, async (req, res) => {
  const { name, report_header } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE workspaces SET name=COALESCE($1,name),report_header=COALESCE($2,report_header)
       WHERE id=$3 RETURNING *`,
      [name||null, report_header||null, req.user.workspace_id]
    );
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.*,w.name AS workspace_name,w.report_header
       FROM users u LEFT JOIN workspaces w ON w.id=u.workspace_id WHERE u.id=$1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const u = rows[0];
    delete u.password; delete u.reset_token; delete u.email_verify_token;
    res.json(u);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id,name,email,role,position,designation,email_verified,
              phone,location,last_active,created_at,avatar_url
       FROM users WHERE workspace_id=$1 ORDER BY role DESC, name ASC`,
      [req.user.workspace_id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/users/:id/profile', authenticate, async (req, res) => {
  if (!['admin','member'].includes(req.user.role))
    return res.status(403).json({ error: 'Access denied' });
  try {
    const { rows } = await pool.query(
      `SELECT id,name,email,role,position,designation,gender,blood_type,
              location,phone,date_of_birth,avatar_url,last_active,created_at
       FROM users WHERE id=$1 AND workspace_id=$2`,
      [req.params.id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/users', authenticate, adminOnly, async (req, res) => {
  const { name,email,password,role='member',position,designation } = req.body;
  if (!name||!email||!password) return res.status(400).json({ error: 'name, email, password required' });
  if (password.length<8) return res.status(400).json({ error: 'Min 8 characters' });
  if (!['admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const hashed = await bcrypt.hash(password,10);
    const { rows } = await pool.query(
      `INSERT INTO users (workspace_id,name,email,password,role,position,designation,email_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)
       RETURNING id,name,email,role,position,designation,created_at`,
      [req.user.workspace_id,name.trim(),email.toLowerCase().trim(),hashed,role,position||null,designation||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code==='23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/users/:id', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { name,role,position,designation } = req.body;
  if (role && !['admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const { rows } = await pool.query(
      `UPDATE users SET name=COALESCE($1,name),role=COALESCE($2,role),
         position=COALESCE($3,position),designation=COALESCE($4,designation)
       WHERE id=$5 AND workspace_id=$6 RETURNING id,name,email,role,position,designation`,
      [name||null,role||null,position||null,designation||null,id,req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/users/:id/reset-password', authenticate, adminOnly, async (req, res) => {
  const { password } = req.body;
  if (!password||password.length<8) return res.status(400).json({ error: 'Min 8 characters' });
  try {
    const { rows } = await pool.query(
      `UPDATE users SET password=$1 WHERE id=$2 AND workspace_id=$3 RETURNING name`,
      [await bcrypt.hash(password,10), req.params.id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `Password reset for ${rows[0].name}` });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/users/:id', authenticate, adminOnly, async (req, res) => {
  if (parseInt(req.params.id)===req.user.id)
    return res.status(400).json({ error: 'Cannot delete yourself' });
  try {
    const { rows } = await pool.query(
      'DELETE FROM users WHERE id=$1 AND workspace_id=$2 RETURNING id',
      [req.params.id, req.user.workspace_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Member removed' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Pending signups count for superadmin dashboard
router.get('/pending-signups/count', authenticate, superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM pending_signups');
    res.json({ count: parseInt(rows[0].count) });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
