require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const pool = require('./db/pool');

// ── Auto-run schema on first boot ─────────────────────────────
async function initDB() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Database schema ready');

    const hash = await bcrypt.hash('Admin@1234', 10);
    await pool.query(
      `UPDATE users SET password = $1 WHERE email = 'admin@fgs.diu.edu'`,
      [hash]
    );
    console.log('✅ Admin password synced, hash prefix:', hash.substring(0, 15));
  } catch (err) {
    console.error('⚠️  Schema init error:', err.message);
  }
}
initDB();

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/expenses', require('./routes/expenses'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Debug endpoint (remove after login works) ─────────────────
app.get('/api/debug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, password FROM users WHERE email = 'admin@fgs.diu.edu'`
    );
    if (!rows.length) return res.json({ error: 'Admin user not found in DB' });
    const user = rows[0];
    const match = await bcrypt.compare('Admin@1234', user.password);
    res.json({
      found: true,
      email: user.email,
      role: user.role,
      hash_prefix: user.password.substring(0, 20),
      password_matches: match
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ── Serve frontend ────────────────────────────────────────────
const frontendBuild = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Frontend not built' });
  });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
