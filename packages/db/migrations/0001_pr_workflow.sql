-- ============================================
-- BRANCHES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'main',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  -- Constraints
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, name)
);

-- Indexes for branches
CREATE INDEX IF NOT EXISTS idx_branches_project 
  ON branches(project_id);

CREATE INDEX IF NOT EXISTS idx_branches_created 
  ON branches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_branches_name 
  ON branches(name);

-- ============================================
-- PULL REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pull_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  github_pr_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('open', 'closed', 'merged')) DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  merged_at TEXT,
  agent_run_id TEXT,
  
  -- Constraints
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE(project_id, github_pr_number)
);

-- Indexes for pull_requests
CREATE INDEX IF NOT EXISTS idx_pr_project 
  ON pull_requests(project_id);

CREATE INDEX IF NOT EXISTS idx_pr_branch 
  ON pull_requests(branch_id);

CREATE INDEX IF NOT EXISTS idx_pr_status 
  ON pull_requests(status);

CREATE INDEX IF NOT EXISTS idx_pr_created 
  ON pull_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pr_github_number 
  ON pull_requests(github_pr_number);

-- ============================================
-- PR CHANGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pr_changes (
  id TEXT PRIMARY KEY,
  pull_request_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK(change_type IN ('added', 'modified', 'deleted')),
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  
  -- Constraints
  FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id) ON DELETE CASCADE
);

-- Indexes for pr_changes
CREATE INDEX IF NOT EXISTS idx_pr_changes_pr 
  ON pr_changes(pull_request_id);

CREATE INDEX IF NOT EXISTS idx_pr_changes_type 
  ON pr_changes(change_type);

CREATE INDEX IF NOT EXISTS idx_pr_changes_file 
  ON pr_changes(file_path);

-- ============================================
-- PR RISK FLAGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pr_risk_flags (
  id TEXT PRIMARY KEY,
  pull_request_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  file_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  
  -- Constraints
  FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id) ON DELETE CASCADE
);

-- Indexes for pr_risk_flags
CREATE INDEX IF NOT EXISTS idx_pr_risk_flags_pr 
  ON pr_risk_flags(pull_request_id);

CREATE INDEX IF NOT EXISTS idx_pr_risk_flags_level 
  ON pr_risk_flags(level);

-- ============================================
-- VERIFY MIGRATION
-- ============================================

-- Check that all tables were created
SELECT 
  'Migration completed successfully' as message,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='branches') as branches_table,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='pull_requests') as pull_requests_table,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='pr_changes') as pr_changes_table,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='pr_risk_flags') as pr_risk_flags_table;
