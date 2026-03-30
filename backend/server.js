require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const bcrypt  = require('bcryptjs');
const pool    = require('./db/pool');

async function initDB() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Schema ready');

    // ── Ensure superadmin exists ──────────────────────────────
    const superEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@researchtrack.app';
    const superPass  = process.env.SUPERADMIN_PASS  || 'SuperAdmin@1234';

    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE role = $1 LIMIT 1', ['superadmin']
    );
    if (!existing.length) {
      // Superadmin has no workspace — they float above all workspaces
      const hash = await bcrypt.hash(superPass, 10);
      await pool.query(
        `INSERT INTO users (name, email, password, role, email_verified, workspace_id)
         VALUES ('Super Admin', $1, $2, 'superadmin', TRUE, NULL)
         ON CONFLICT (email) DO NOTHING`,
        [superEmail, hash]
      );
      console.log(`✅ Superadmin created: ${superEmail}`);
    }

    // ── Migrate existing v7/v8 data ───────────────────────────
    const { rows: orphans } = await pool.query(
      `SELECT COUNT(*) FROM users WHERE workspace_id IS NULL AND role != 'superadmin'`
    );
    if (parseInt(orphans[0].count) > 0) {
      const { rows: ws } = await pool.query(
        `INSERT INTO workspaces (name, report_header)
         VALUES ('My Workspace', 'ResearchTrack') RETURNING id`
      );
      const wsId = ws[0].id;
      await pool.query(
        `UPDATE users    SET workspace_id = $1 WHERE workspace_id IS NULL AND role != 'superadmin'`,
        [wsId]
      );
      await pool.query(
        `UPDATE projects SET workspace_id = $1 WHERE workspace_id IS NULL`, [wsId]
      );
      await pool.query(`UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE`);
      console.log('✅ Migrated existing data into default workspace');
    }
  } catch (err) {
    console.error('⚠️  Init error:', err.message);
  }
}
initDB();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

// Update last_active on every authenticated request
app.use((req, res, next) => {
  const auth = req.headers['authorization'];
  if (auth) {
    try {
      const jwt  = require('jsonwebtoken');
      const data = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
      if (data?.id) {
        pool.query('UPDATE users SET last_active = NOW() WHERE id = $1', [data.id]).catch(() => {});
      }
    } catch {}
  }
  next();
});

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/projects',  require('./routes/projects'));
app.use('/api/expenses',  require('./routes/expenses'));
app.use('/api/super',     require('./routes/super'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

const frontendBuild = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'), err => {
    if (err) res.status(404).json({ error: 'Frontend not built' });
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
