-- v15 additions: richer registration data
ALTER TABLE pending_signups ADD COLUMN IF NOT EXISTS institution       VARCHAR(200);
ALTER TABLE pending_signups ADD COLUMN IF NOT EXISTS department        VARCHAR(200);
ALTER TABLE pending_signups ADD COLUMN IF NOT EXISTS academic_degree   VARCHAR(50);
ALTER TABLE pending_signups ADD COLUMN IF NOT EXISTS research_area     VARCHAR(300);
ALTER TABLE pending_signups ADD COLUMN IF NOT EXISTS granting_agency   VARCHAR(200);
ALTER TABLE pending_signups ADD COLUMN IF NOT EXISTS expected_fund_amt VARCHAR(100);
ALTER TABLE pending_signups ADD COLUMN IF NOT EXISTS publication_count INT DEFAULT 0;
ALTER TABLE pending_signups ADD COLUMN IF NOT EXISTS orcid_id          VARCHAR(30);

ALTER TABLE users ADD COLUMN IF NOT EXISTS institution       VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department        VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_degree   VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS research_area     VARCHAR(300);
ALTER TABLE users ADD COLUMN IF NOT EXISTS granting_agency   VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS expected_fund_amt VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS publication_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS orcid_id          VARCHAR(30);
