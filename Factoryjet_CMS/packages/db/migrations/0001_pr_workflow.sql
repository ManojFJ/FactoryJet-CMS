-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'main',
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_branches_project ON branches(project_id);
CREATE INDEX idx_branches_created ON branches(created_at);
CREATE UNIQUE INDEX idx_branches_project_name ON branches(project_id, name);

-- Create pull_requests table
CREATE TABLE IF NOT EXISTS pull_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  github_pr_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('open', 'closed', 'merged')) DEFAULT 'open',
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  merged_at INTEGER,
  agent_run_id TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX idx_pr_project ON pull_requests(project_id);
CREATE INDEX idx_pr_branch ON pull_requests(branch_id);
CREATE INDEX idx_pr_status ON pull_requests(status);
CREATE INDEX idx_pr_created ON pull_requests(created_at);
CREATE UNIQUE INDEX idx_pr_project_number ON pull_requests(project_id, github_pr_number);

-- Create pr_changes table
CREATE TABLE IF NOT EXISTS pr_changes (
  id TEXT PRIMARY KEY,
  pull_request_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK(change_type IN ('added', 'modified', 'deleted')),
  additions INTEGER NOT NULL DEFAULT 0,
  deletions INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id) ON DELETE CASCADE
);

CREATE INDEX idx_pr_changes_pr ON pr_changes(pull_request_id);
CREATE INDEX idx_pr_changes_type ON pr_changes(change_type);

-- Create pr_risk_flags table
CREATE TABLE IF NOT EXISTS pr_risk_flags (
  id TEXT PRIMARY KEY,
  pull_request_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  file_path TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id) ON DELETE CASCADE
);

CREATE INDEX idx_pr_risk_flags_pr ON pr_risk_flags(pull_request_id);
CREATE INDEX idx_pr_risk_flags_level ON pr_risk_flags(level);