export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  CHAT_ROOM: DurableObjectNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GEMINI_API_KEY: string;
  ENCRYPTION_KEY: string;
  SESSION_SECRET: string;
  APP_URL: string;
  ENVIRONMENT: string;
}
