import { Hono } from "hono";
import { Octokit } from "@octokit/rest";
import { eq } from "drizzle-orm";
import { db } from "../db"; 
import { pullRequests, projects } from "../db/schema";
import { v4 as uuidv4 } from "uuid";

const githubRouter = new Hono();

const getOctokit = (token: string) => new Octokit({ auth: token });

// --- K1.1: Create Branch API ---
githubRouter.post("/branch", async (c) => {
  const { projectId, name, baseBranch = "main" } = await c.req.json();
  const userToken = c.get("githubToken") as string; 

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return c.json({ error: "Project not found" }, 404);

  const octokit = getOctokit(userToken);
  
  try {
    // 1. Get SHA of the base branch
    const { data: refData } = await octokit.git.getRef({
      owner: project.repoOwner,
      repo: project.repoName,
      ref: `heads/${baseBranch}`,
    });
    const sha = refData.object.sha;

    // 2. Create the new branch ref
    const branchName = name || `factoryjet/feature-${Date.now()}`;
    await octokit.git.createRef({
      owner: project.repoOwner,
      repo: project.repoName,
      ref: `refs/heads/${branchName}`,
      sha,
    });

    return c.json({ success: true, branchName });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// --- K1.2: Create PR API ---
githubRouter.post("/pr", async (c) => {
  const { projectId, title, body, head, base = "main", riskLevel = "low" } = await c.req.json();
  const userToken = c.get("githubToken") as string;

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return c.json({ error: "Project not found" }, 404);

  const octokit = getOctokit(userToken);

  try {
    // 1. Create PR on GitHub
    const { data: pr } = await octokit.pulls.create({
      owner: project.repoOwner,
      repo: project.repoName,
      title,
      body,
      head,
      base,
    });

    // 2. Store PR in our DB
    const newPr = await db.insert(pullRequests).values({
      id: uuidv4(),
      projectId,
      githubPrId: pr.number,
      branchName: head,
      title,
      description: body,
      status: pr.state,
      riskLevel,
    }).returning();

    return c.json({ success: true, pr: newPr[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// --- K1.3: Get PR Status & Diffs API ---
githubRouter.get("/pr/:projectId/:prNumber", async (c) => {
  const projectId = c.req.param("projectId");
  const prNumber = parseInt(c.req.param("prNumber"));
  const userToken = c.get("githubToken") as string;

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return c.json({ error: "Project not found" }, 404);

  const octokit = getOctokit(userToken);

  try {
    // 1. Fetch PR details
    const { data: pr } = await octokit.pulls.get({
      owner: project.repoOwner,
      repo: project.repoName,
      pull_number: prNumber,
    });

    // 2. Fetch Changed Files (for diffs)
    const { data: files } = await octokit.pulls.listFiles({
      owner: project.repoOwner,
      repo: project.repoName,
      pull_number: prNumber,
    });

    // 3. Fetch CI Checks (Status)
    const { data: checks } = await octokit.checks.listForRef({
      owner: project.repoOwner,
      repo: project.repoName,
      ref: pr.head.sha,
    });

    return c.json({
      details: pr,
      files: files.map(f => ({
        filename: f.filename,
        status: f.status, 
        patch: f.patch // The diff content
      })),
      checks: checks.check_runs
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// --- K1.4: Merge PR API ---
githubRouter.post("/pr/:projectId/:prNumber/merge", async (c) => {
  const projectId = c.req.param("projectId");
  const prNumber = parseInt(c.req.param("prNumber"));
  const userToken = c.get("githubToken") as string;

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return c.json({ error: "Project not found" }, 404);

  const octokit = getOctokit(userToken);

  try {
    await octokit.pulls.merge({
      owner: project.repoOwner,
      repo: project.repoName,
      pull_number: prNumber,
      merge_method: "squash", // Squash is best for AI generated code
    });

    // Update local DB status
    await db.update(pullRequests)
      .set({ status: "merged" })
      .where(eq(pullRequests.githubPrId, prNumber));

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default githubRouter;
