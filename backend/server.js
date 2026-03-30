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

    // Migrate existing v7/v8 data — assign to a default workspace if none exists
    const { rows: orphanUsers } = await pool.query(
      'SELECT id FROM users WHERE workspace_id IS NULL LIMIT 1'
    );
    if (orphanUsers.length) {
      // Create a default workspace for existing data
      const { rows: ws } = await pool.query(
        `INSERT INTO workspaces (name, report_header)
         VALUES ('Default Workspace', 'ResearchTrack')
         RETURNING id`
      );
      const wsId = ws[0].id;
      await pool.query('UPDATE users    SET workspace_id = $1 WHERE workspace_id IS NULL', [wsId]);
      await pool.query('UPDATE projects SET workspace_id = $1 WHERE workspace_id IS NULL', [wsId]);
      // Make all existing users verified and active
      await pool.query('UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE');
      console.log('✅ Migrated existing data to default workspace');
    }
  } catch (err) {
    console.error('⚠️  Init error:', err.message);
  }
}
initDB();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/expenses', require('./routes/expenses'));

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
