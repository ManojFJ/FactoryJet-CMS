import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { projects } from "@codecraft/db";
import { createProjectSchema } from "@codecraft/shared";
import type { Env } from "../types";
import { getDb } from "../lib/db";
import { getSession } from "../lib/session";
import { requireAuth } from "../middleware/auth";
import { nanoid } from "../lib/nanoid";
import { getGitHubToken, fetchUserRepos } from "../lib/github";

export const projectRoutes = new Hono<{ Bindings: Env }>();

// List user's connected projects
projectRoutes.get("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const db = getDb(c.env);

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId));

  return c.json(userProjects);
});

// S1.4: Build "New Project" API endpoint 
// NOTE: requireAuth removed temporarily for testing
projectRoutes.post("/new", async (c) => {
  const body = await c.req.json();
  
  // Hardcoded userId for testing while auth is disabled
  const userId = "test-user-surya";

  console.log(`🚀 Initializing Planner Agent for User: ${userId}`);
  console.log(`📋 Template: ${body.templateType} | Prompt: ${body.prompt}`);

  // Return success to trigger the frontend toast
  return c.json({
    id: crypto.randomUUID(),
    status: 'planning',
    message: 'AI Planner Agent has started scaffolding your project.'
  }, 201);
});

export default projectRoutes;