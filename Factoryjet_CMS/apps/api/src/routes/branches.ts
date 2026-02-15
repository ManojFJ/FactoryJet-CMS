import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import type { AppContext } from '../types';
import { getDatabase } from '../lib/db';
import { projects, branches, pullRequests } from '@codecraft/db/schema'; // Adjust import based on your schema
import { getGitHubToken } from '../lib/github';
import { 
  createBranch as createGitHubBranch,
  deleteBranch as deleteGitHubBranch,
  branchExists
} from '../lib/github';

const branchesRouter = new Hono<AppContext>();

// SCHEMAS

const createBranchSchema = z.object({
  projectId: z.string().uuid(),
  baseBranch: z.string().optional().default('main'),
  description: z.string().min(1).max(100).trim(),
});

// HELPER FUNCTIONS

/**
 * Generate branch name: factoryjet/<slug>-<timestamp>
 */
function generateBranchName(description: string): string {
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  
  const timestamp = Date.now();
  return `factoryjet/${slug}-${timestamp}`;
}

/**
 * Validate branch name format
 */
function isValidBranchName(name: string): boolean {
  return /^[a-zA-Z0-9/_-]+$/.test(name);
}

// ROUTES

/**
 * POST /branches/create
 * Create a new branch on GitHub and store in database
 */
branchesRouter.post(
  '/create',
  zValidator('json', createBranchSchema),
  async (c) => {
    try {
      const { projectId, baseBranch, description } = c.req.valid('json');
      const userId = c.get('userId');

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const db = getDatabase(c.env.DB);

      // Get project from database
      const [project] = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, projectId),
          eq(projects.userId, userId)
        ))
        .limit(1);

      if (!project) {
        return c.json({ error: 'Project not found' }, 404);
      }

      // Get GitHub token
      const token = await getGitHubToken(db, userId, c.env.ENCRYPTION_KEY);
      if (!token) {
        return c.json({ error: 'GitHub token not found' }, 401);
      }

      // Generate branch name
      const branchName = generateBranchName(description);

      // Validate branch name
      if (!isValidBranchName(branchName)) {
        return c.json({ error: 'Invalid branch name generated' }, 400);
      }

      // Get repo full name (owner/repo)
      const repoFullName = `${project.owner}/${project.repoName}`;

      // Check if branch already exists
      const exists = await branchExists(token, repoFullName, branchName);
      if (exists) {
        return c.json({ error: 'Branch already exists' }, 409);
      }

      // Create branch on GitHub
      const { sha, ref } = await createGitHubBranch(
        token,
        repoFullName,
        branchName,
        baseBranch
      );

      // Store branch in database
      const branchId = crypto.randomUUID();
      const now = new Date();
      
      await db.insert(branches).values({
        id: branchId,
        projectId,
        name: branchName,
        baseBranch,
        createdAt: now,
        updatedAt: now,
      });

      return c.json({
        success: true,
        branch: {
          id: branchId,
          name: branchName,
          baseBranch,
          sha,
          createdAt: now.toISOString(),
        },
      }, 201);

    } catch (error: any) {
      console.error('Branch creation error:', error);
      
      if (error.message?.includes('422')) {
        return c.json({ error: 'Invalid branch reference' }, 422);
      }
      
      return c.json(
        { 
          error: 'Failed to create branch', 
          details: error.message 
        },
        500
      );
    }
  }
);

/**
 * GET /branches/:projectId
 * List all branches for a project
 */
branchesRouter.get('/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId');
    const userId = c.get('userId');

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDatabase(c.env.DB);

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.userId, userId)
      ))
      .limit(1);

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Get all branches for project
    const projectBranches = await db
      .select()
      .from(branches)
      .where(eq(branches.projectId, projectId))
      .orderBy(desc(branches.createdAt));

    return c.json({ 
      branches: projectBranches,
      total: projectBranches.length
    });

  } catch (error: any) {
    console.error('Error fetching branches:', error);
    return c.json({ error: 'Failed to fetch branches' }, 500);
  }
});

/**
 * GET /branches/:projectId/:branchId
 * Get single branch details
 */
branchesRouter.get('/:projectId/:branchId', async (c) => {
  try {
    const { projectId, branchId } = c.req.params;
    const userId = c.get('userId');

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDatabase(c.env.DB);

    // Get branch with project verification
    const [branch] = await db
      .select({
        id: branches.id,
        projectId: branches.projectId,
        name: branches.name,
        baseBranch: branches.baseBranch,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt,
        owner: projects.owner,
        repoName: projects.repoName,
      })
      .from(branches)
      .innerJoin(projects, eq(branches.projectId, projects.id))
      .where(and(
        eq(branches.id, branchId),
        eq(branches.projectId, projectId),
        eq(projects.userId, userId)
      ))
      .limit(1);

    if (!branch) {
      return c.json({ error: 'Branch not found' }, 404);
    }

    return c.json({ branch });

  } catch (error: any) {
    console.error('Error fetching branch:', error);
    return c.json({ error: 'Failed to fetch branch' }, 500);
  }
});

/**
 * DELETE /branches/:branchId
 * Delete a branch from GitHub and database
 */
branchesRouter.delete('/:branchId', async (c) => {
  try {
    const branchId = c.req.param('branchId');
    const userId = c.get('userId');
    const deleteOnGithub = c.req.query('deleteOnGithub') !== 'false';

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDatabase(c.env.DB);

    // Get branch and verify ownership
    const [branch] = await db
      .select({
        id: branches.id,
        name: branches.name,
        projectId: branches.projectId,
        owner: projects.owner,
        repoName: projects.repoName,
      })
      .from(branches)
      .innerJoin(projects, eq(branches.projectId, projects.id))
      .where(and(
        eq(branches.id, branchId),
        eq(projects.userId, userId)
      ))
      .limit(1);

    if (!branch) {
      return c.json({ error: 'Branch not found' }, 404);
    }

    // Check if branch is associated with open PRs
    const openPRs = await db
      .select({ id: pullRequests.id })
      .from(pullRequests)
      .where(and(
        eq(pullRequests.branchId, branchId),
        eq(pullRequests.status, 'open')
      ))
      .limit(1);

    if (openPRs.length > 0) {
      return c.json(
        { error: 'Cannot delete branch with open pull requests' },
        409
      );
    }

    // Delete branch on GitHub (if requested)
    if (deleteOnGithub) {
      const token = await getGitHubToken(db, userId, c.env.ENCRYPTION_KEY);
      if (token) {
        try {
          const repoFullName = `${branch.owner}/${branch.repoName}`;
          await deleteGitHubBranch(token, repoFullName, branch.name);
        } catch (error: any) {
          // If branch doesn't exist on GitHub, that's okay
          if (!error.message?.includes('404')) {
            console.warn('Failed to delete branch on GitHub:', error);
          }
        }
      }
    }

    // Delete from database
    await db.delete(branches).where(eq(branches.id, branchId));

    return c.json({ 
      success: true,
      message: 'Branch deleted successfully',
      deletedFromGithub: deleteOnGithub
    });

  } catch (error: any) {
    console.error('Error deleting branch:', error);
    return c.json({ error: 'Failed to delete branch' }, 500);
  }
});

/**
 * PATCH /branches/:branchId
 * Update branch metadata (database only)
 */
branchesRouter.patch('/:branchId', async (c) => {
  try {
    const branchId = c.req.param('branchId');
    const userId = c.get('userId');
    const { baseBranch } = await c.req.json();

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDatabase(c.env.DB);

    // Verify ownership
    const [branch] = await db
      .select()
      .from(branches)
      .innerJoin(projects, eq(branches.projectId, projects.id))
      .where(and(
        eq(branches.id, branchId),
        eq(projects.userId, userId)
      ))
      .limit(1);

    if (!branch) {
      return c.json({ error: 'Branch not found' }, 404);
    }

    // Update branch
    await db
      .update(branches)
      .set({
        baseBranch: baseBranch || branch.branches.baseBranch,
        updatedAt: new Date(),
      })
      .where(eq(branches.id, branchId));

    return c.json({ success: true, message: 'Branch updated' });

  } catch (error: any) {
    console.error('Error updating branch:', error);
    return c.json({ error: 'Failed to update branch' }, 500);
  }
});

export default branchesRouter;