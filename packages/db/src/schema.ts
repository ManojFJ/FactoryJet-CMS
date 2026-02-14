import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // nanoid
  githubId: integer("github_id").notNull().unique(),
  email: text("email"),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  plan: text("plan").notNull().default("free"), // free | pro
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // crypto random
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const githubTokens = sqliteTable("github_tokens", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  tokenType: text("token_type").notNull().default("bearer"),
  scope: text("scope"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(), // nanoid
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  repoFullName: text("repo_full_name").notNull(), // owner/repo
  repoUrl: text("repo_url").notNull(),
  defaultBranch: text("default_branch").notNull().default("main"),
  description: text("description"),
  language: text("language"),
  indexedAt: integer("indexed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(), // nanoid
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Conversation"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(), // nanoid
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  codeChanges: text("code_changes", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const pullRequests = sqliteTable("pull_requests", {
  id: text("id").primaryKey(), // UUID
  projectId: text("project_id").notNull(), // Foreign key to projects
  githubPrId: integer("github_pr_id").notNull(), // The PR number 
  branchName: text("branch_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"), // open, merged, closed
  riskLevel: text("risk_level").default("low"), // low, medium, high (AI assessed)
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  projectIdx: index("pr_project_idx").on(table.projectId),
}));

export type PullRequest = typeof pullRequests.$inferSelect;
export type NewPullRequest = typeof pullRequests.$inferInsert;
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
