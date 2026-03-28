require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const pool = require('./db/pool');

// ── Auto-run schema + migrations on boot ─────────────────────
async function initDB() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Database schema ready');

    // Safe incremental migrations (all idempotent)
    const migrations = [
      // Add other_label column for 'Other' expense category
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS other_label VARCHAR(150)`,
      // Fix admin name from seed default to Tariq
      `UPDATE users SET name = 'Tariq' WHERE email = 'admin@fgs.diu.edu' AND name = 'FGS Admin'`,
      // Ensure 'other' is a valid category (drop + recreate constraint safely)
      `DO $$ BEGIN
         BEGIN ALTER TABLE expenses DROP CONSTRAINT expenses_category_check;
         EXCEPTION WHEN undefined_object THEN NULL; END;
         ALTER TABLE expenses ADD CONSTRAINT expenses_category_check
           CHECK (category IN ('transportation','printing_stationery','field_work','communication','other','miscellaneous'));
       EXCEPTION WHEN others THEN NULL;
       END $$`,
    ];

    for (const sql of migrations) {
      try { await pool.query(sql); }
      catch (e) { console.warn('Migration warning:', e.message); }
    }
    console.log('✅ Migrations applied');

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
app.use('/api/reports',  require('./routes/reports'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Debug endpoint ────────────────────────────────────────────
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
      name: user.name,
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
