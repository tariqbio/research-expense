-- ============================================================
-- FGS Research Expense Tracker - Database Schema
-- Run this once on your PostgreSQL database (Railway provides one)
-- ============================================================

-- Users table (Admin creates all accounts)
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  total_budget    NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_type    VARCHAR(20) NOT NULL DEFAULT 'installment' CHECK (payment_type IN ('upfront', 'end', 'installment')),
  status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  start_date      DATE,
  end_date        DATE,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Project members (who is involved in which project)
CREATE TABLE IF NOT EXISTS project_members (
  project_id  INT REFERENCES projects(id) ON DELETE CASCADE,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(30) DEFAULT 'researcher',
  PRIMARY KEY (project_id, user_id)
);

-- Fund installments / payment schedule from university/grant
CREATE TABLE IF NOT EXISTS fund_installments (
  id            SERIAL PRIMARY KEY,
  project_id    INT REFERENCES projects(id) ON DELETE CASCADE,
  amount        NUMERIC(14,2) NOT NULL,
  expected_date DATE,
  received_date DATE,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received')),
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Expense entries (core table)
CREATE TABLE IF NOT EXISTS expenses (
  id              SERIAL PRIMARY KEY,
  project_id      INT REFERENCES projects(id) ON DELETE CASCADE,
  submitted_by    INT REFERENCES users(id),
  category        VARCHAR(50) NOT NULL CHECK (category IN (
                    'transportation',
                    'printing_stationery',
                    'field_work',
                    'communication',
                    'miscellaneous'
                  )),
  description     TEXT NOT NULL,
  amount          NUMERIC(14,2) NOT NULL,
  expense_date    DATE NOT NULL,
  receipt_note    TEXT,
  -- Reimbursement tracking (only admin can change these)
  reimbursed      BOOLEAN NOT NULL DEFAULT FALSE,
  reimbursed_by   INT REFERENCES users(id),
  reimbursed_at   TIMESTAMPTZ,
  reimbursed_from VARCHAR(30) CHECK (reimbursed_from IN ('university', 'project', NULL)),
  -- Audit
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log — every status change is permanently recorded
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
-- Seed: Create default admin account
-- Email: admin@fgs.diu.edu  |  Password: Admin@1234 (CHANGE THIS)
-- ============================================================
INSERT INTO users (name, email, password, role)
VALUES (
  'FGS Admin',
  'admin@fgs.diu.edu',
  '$2b$10$0l1bqXWDrj/duFYGI2hLF.t4HAd.OYe/aVyHGUm/HHHPrAynLxqGy', -- Admin@1234
  'admin'
) ON CONFLICT (email) DO NOTHING;
