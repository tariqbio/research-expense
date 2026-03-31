-- ============================================================
-- ResearchTrack v10
-- ============================================================

-- Workspaces — one per registered user (PI, Research Fellow, etc.)
CREATE TABLE IF NOT EXISTS workspaces (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  report_header VARCHAR(200),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                    SERIAL PRIMARY KEY,
  workspace_id          INT REFERENCES workspaces(id) ON DELETE CASCADE,
  name                  VARCHAR(100) NOT NULL,
  email                 VARCHAR(150) UNIQUE NOT NULL,
  password              VARCHAR(255) NOT NULL,
  role                  VARCHAR(20) NOT NULL DEFAULT 'member'
                          CHECK (role IN ('superadmin','admin','member')),
  position              VARCHAR(150),
  designation           VARCHAR(150),
  gender                VARCHAR(20),
  blood_type            VARCHAR(5),
  location              VARCHAR(200),
  phone                 VARCHAR(30),
  date_of_birth         DATE,
  -- email / password reset
  email_verified        BOOLEAN NOT NULL DEFAULT TRUE,
  email_verify_token    VARCHAR(64),
  email_verify_expires  TIMESTAMPTZ,
  reset_token           VARCHAR(64),
  reset_token_expires   TIMESTAMPTZ,
  -- auto-logout: track last activity
  last_active           TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id            SERIAL PRIMARY KEY,
  workspace_id  INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code          VARCHAR(50) NOT NULL,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  total_budget  NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_type  VARCHAR(20) NOT NULL DEFAULT 'installment'
                  CHECK (payment_type IN ('upfront','end','installment')),
  status        VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','completed','on_hold')),
  start_date    DATE,
  end_date      DATE,
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, code)
);

-- Project members
CREATE TABLE IF NOT EXISTS project_members (
  project_id  INT REFERENCES projects(id) ON DELETE CASCADE,
  user_id     INT REFERENCES users(id)    ON DELETE CASCADE,
  role        VARCHAR(30) DEFAULT 'researcher',
  PRIMARY KEY (project_id, user_id)
);

-- Fund installments
CREATE TABLE IF NOT EXISTS fund_installments (
  id            SERIAL PRIMARY KEY,
  project_id    INT REFERENCES projects(id) ON DELETE CASCADE,
  amount        NUMERIC(14,2) NOT NULL,
  expected_date DATE,
  received_date DATE,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','received')),
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id              SERIAL PRIMARY KEY,
  project_id      INT REFERENCES projects(id) ON DELETE CASCADE,
  submitted_by    INT REFERENCES users(id),
  category        VARCHAR(50) NOT NULL,
  other_label     VARCHAR(150),
  description     TEXT NOT NULL,
  amount          NUMERIC(14,2) NOT NULL,
  expense_date    DATE NOT NULL,
  receipt_note    TEXT,
  reimbursed      BOOLEAN NOT NULL DEFAULT FALSE,
  reimbursed_by   INT REFERENCES users(id),
  reimbursed_at   TIMESTAMPTZ,
  reimbursed_from VARCHAR(30),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  table_name  VARCHAR(50),
  record_id   INT,
  action      VARCHAR(50),
  changed_by  INT REFERENCES users(id),
  old_value   TEXT,
  new_value   TEXT,
  changed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Safe migrations — run every boot, all idempotent
-- ============================================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS other_label       VARCHAR(150);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS position          VARCHAR(150);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS designation       VARCHAR(150);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS gender            VARCHAR(20);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS blood_type        VARCHAR(5);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS location          VARCHAR(200);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS phone             VARCHAR(30);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS date_of_birth     DATE;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS email_verified    BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS email_verify_token    VARCHAR(64);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS email_verify_expires  TIMESTAMPTZ;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS reset_token           VARCHAR(64);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS reset_token_expires   TIMESTAMPTZ;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS last_active           TIMESTAMPTZ DEFAULT NOW();

DO $$ BEGIN
  ALTER TABLE users    ADD COLUMN workspace_id INT REFERENCES workspaces(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN workspace_id INT REFERENCES workspaces(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Expand role column to support superadmin
DO $$ BEGIN
  ALTER TABLE users DROP CONSTRAINT users_role_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('superadmin','admin','member'));

-- Fix expense category constraint
DO $$ BEGIN
  ALTER TABLE expenses DROP CONSTRAINT expenses_category_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE expenses ADD CONSTRAINT expenses_category_check
    CHECK (category IN ('transportation','printing_stationery','field_work',
                        'communication','other','miscellaneous'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- v11 additions
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================
-- v12: Invite system
-- ============================================================

-- Pending signups (Way 1 — public registration, awaiting superadmin approval)
CREATE TABLE IF NOT EXISTS pending_signups (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(150) UNIQUE NOT NULL,
  password        VARCHAR(255) NOT NULL,  -- hashed, ready to activate
  workspace_name  VARCHAR(200) NOT NULL,
  report_header   VARCHAR(200),
  position        VARCHAR(150),
  message         TEXT,                   -- optional note to superadmin
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Invite tokens (Way 2 — admin generates link, shares manually)
CREATE TABLE IF NOT EXISTS invite_tokens (
  id            SERIAL PRIMARY KEY,
  token         VARCHAR(64) UNIQUE NOT NULL,
  workspace_id  INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    INT NOT NULL REFERENCES users(id),
  email         VARCHAR(150) NOT NULL,    -- locked to this email
  role          VARCHAR(10) NOT NULL DEFAULT 'member',
  project_id    INT REFERENCES projects(id) ON DELETE SET NULL, -- optional: auto-join project
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  used_by       INT REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Invite codes (Way 3 — admin generates code for a project, shares via WhatsApp etc)
CREATE TABLE IF NOT EXISTS invite_codes (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(12) UNIQUE NOT NULL,  -- short, e.g. "FGS-XK29"
  workspace_id  INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    INT NOT NULL REFERENCES users(id),
  project_id    INT REFERENCES projects(id) ON DELETE CASCADE,
  max_uses      INT NOT NULL DEFAULT 20,
  use_count     INT NOT NULL DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
