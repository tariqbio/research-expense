-- ============================================================
-- ResearchTrack v9 — Workspace Model
-- ============================================================

-- Each registered user gets one workspace. Everything belongs to it.
CREATE TABLE IF NOT EXISTS workspaces (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,        -- e.g. "Dr. Karim's Research Projects"
  report_header VARCHAR(200),                 -- shown on reports, e.g. "FGS, DIU"
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Users — every user belongs to one workspace
CREATE TABLE IF NOT EXISTS users (
  id                    SERIAL PRIMARY KEY,
  workspace_id          INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name                  VARCHAR(100) NOT NULL,
  email                 VARCHAR(150) UNIQUE NOT NULL,
  password              VARCHAR(255) NOT NULL,
  role                  VARCHAR(10) NOT NULL DEFAULT 'member'
                          CHECK (role IN ('admin', 'member')),
  position              VARCHAR(150),
  -- email verification (for workspace owners who self-register)
  email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  email_verify_token    VARCHAR(64),
  email_verify_expires  TIMESTAMPTZ,
  -- password reset
  reset_token           VARCHAR(64),
  reset_token_expires   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Projects — scoped to workspace
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
-- Safe migrations (idempotent — safe to re-run on existing DB)
-- ============================================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS other_label   VARCHAR(150);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS position      VARCHAR(150);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS email_verified       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS email_verify_token   VARCHAR(64);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMPTZ;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS reset_token          VARCHAR(64);
ALTER TABLE users    ADD COLUMN IF NOT EXISTS reset_token_expires  TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN workspace_id INT REFERENCES workspaces(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN workspace_id INT REFERENCES workspaces(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE expenses DROP CONSTRAINT expenses_category_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE expenses ADD CONSTRAINT expenses_category_check
    CHECK (category IN ('transportation','printing_stationery','field_work',
                        'communication','other','miscellaneous'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
