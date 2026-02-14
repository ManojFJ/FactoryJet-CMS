import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';


export const branches = sqliteTable('branches', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  baseBranch: text('base_branch').notNull().default('main'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const pullRequests = sqliteTable('pull_requests', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  branchId: text('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  githubPrNumber: integer('github_pr_number').notNull(),
  title: text('title').notNull(),
  status: text('status', { enum: ['open', 'closed', 'merged'] })
    .notNull()
    .default('open'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  mergedAt: integer('merged_at', { mode: 'timestamp' }),
  agentRunId: text('agent_run_id'),
});


export const prChanges = sqliteTable('pr_changes', {
  id: text('id').primaryKey(),
  pullRequestId: text('pull_request_id')
    .notNull()
    .references(() => pullRequests.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  changeType: text('change_type', { enum: ['added', 'modified', 'deleted'] }).notNull(),
  additions: integer('additions').notNull().default(0),
  deletions: integer('deletions').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});


export const prRiskFlags = sqliteTable('pr_risk_flags', {
  id: text('id').primaryKey(),
  pullRequestId: text('pull_request_id')
    .notNull()
    .references(() => pullRequests.id, { onDelete: 'cascade' }),
  level: text('level', { enum: ['low', 'medium', 'high'] }).notNull(),
  message: text('message').notNull(),
  filePath: text('file_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});