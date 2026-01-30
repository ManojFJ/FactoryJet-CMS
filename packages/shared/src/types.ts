export interface User {
  id: string;
  githubId: number;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  plan: "free" | "pro";
  createdAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  repoFullName: string;
  repoUrl: string;
  defaultBranch: string;
  description: string | null;
  language: string | null;
  indexedAt: Date | null;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  codeChanges: CodeChange[] | null;
  createdAt: Date;
}

export interface CodeChange {
  path: string;
  action: "create" | "edit" | "delete";
  content?: string;
  diff?: string;
}

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  default_branch: string;
  private: boolean;
}

export interface ChatStreamEvent {
  type: "thinking" | "text" | "code_change" | "tool_call" | "status" | "done" | "error";
  content?: string;
  codeChange?: CodeChange;
  toolCall?: { name: string; args: Record<string, unknown> };
  statusText?: string;
  error?: string;
}
