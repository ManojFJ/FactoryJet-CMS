export interface Env {
  DB: D1Database;
  GITHUB_ID: string;
  GITHUB_SECRET: string;
  SESSION_SECRET: string;
  NEXT_PUBLIC_API_URL: string;
}

export interface CreateProjectRequest {
  templateType: 'landing' | 'portfolio' | 'saas' | 'blog' | 'agency' | 'ecommerce';
  prompt: string;
}

export interface ProjectResponse {
  id: string;
  status: 'planning' | 'coding' | 'deployed';
  message: string;
}