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
    .where(eq(projects.userId, userId))
    .orderBy(projects.createdAt);

  return c.json({ projects: userProjects });
});

// List available GitHub repos for user to connect
projectRoutes.get("/github-repos", requireAuth, async (c) => {
  const userId = c.get("userId");
  const db = getDb(c.env);

  const token = await getGitHubToken(db, userId, c.env.ENCRYPTION_KEY);
  if (!token) {
    return c.json({ error: "GitHub token not found. Please re-authenticate." }, 401);
  }

  const repos = await fetchUserRepos(token);

  return c.json({
    repos: repos.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      name: r.name,
      htmlUrl: r.html_url,
      description: r.description,
      language: r.language,
      defaultBranch: r.default_branch,
      isPrivate: r.private,
    })),
  });
});

// Connect a GitHub repo as a project
projectRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const db = getDb(c.env);

  // Check if already connected
  const existing = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.repoFullName, parsed.data.repoFullName)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: "Repository already connected" }, 409);
  }

  // Fetch repo details from GitHub
  const token = await getGitHubToken(db, userId, c.env.ENCRYPTION_KEY);
  if (!token) {
    return c.json({ error: "GitHub token not found" }, 401);
  }

  const repoResponse = await fetch(
    `https://api.github.com/repos/${parsed.data.repoFullName}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "CodeCraft-App",
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!repoResponse.ok) {
    return c.json({ error: "Repository not found or access denied" }, 404);
  }

  const repo = (await repoResponse.json()) as {
    html_url: string;
    default_branch: string;
    description: string | null;
    language: string | null;
  };

  const projectId = nanoid();
  await db.insert(projects).values({
    id: projectId,
    userId,
    repoFullName: parsed.data.repoFullName,
    repoUrl: repo.html_url,
    defaultBranch: repo.default_branch,
    description: repo.description,
    language: repo.language,
  });

  const newProject = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return c.json({ project: newProject[0] }, 201);
});

// Get a single project
projectRoutes.get("/:id", requireAuth, async (c) => {
  const userId = c.get("userId");
  const projectId = c.req.param("id");
  const db = getDb(c.env);

  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (project.length === 0) {
    return c.json({ error: "Project not found" }, 404);
  }

  return c.json({ project: project[0] });
});

// Delete a project
projectRoutes.delete("/:id", requireAuth, async (c) => {
  const userId = c.get("userId");
  const projectId = c.req.param("id");
  const db = getDb(c.env);

  const result = await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  return c.json({ ok: true });
});
