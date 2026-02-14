import { eq } from "drizzle-orm";
import { githubTokens } from "@codecraft/db";
import { decrypt } from "./crypto";
import type { Database } from "./db";

export async function getGitHubToken(
  db: Database,
  userId: string,
  encryptionKey: string
): Promise<string | null> {
  const result = await db
    .select()
    .from(githubTokens)
    .where(eq(githubTokens.userId, userId))
    .limit(1);

  if (result.length === 0) return null;

  return decrypt(result[0].accessTokenEncrypted, encryptionKey);
}

interface GitHubFileContent {
  path: string;
  content: string;
  sha: string;
  size: number;
}

export async function fetchRepoTree(
  token: string,
  repoFullName: string,
  branch: string
): Promise<Array<{ path: string; type: string; sha: string; size?: number }>> {
  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "CodeCraft-App",
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch repo tree: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    tree: Array<{ path: string; type: string; sha: string; size?: number }>;
  };
  return data.tree;
}

export async function fetchFileContent(
  token: string,
  repoFullName: string,
  path: string,
  ref: string
): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/contents/${path}?ref=${ref}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "CodeCraft-App",
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${path}`);
  }

  const data = (await response.json()) as { content: string; encoding: string };

  if (data.encoding === "base64") {
    return atob(data.content.replace(/\n/g, ""));
  }

  return data.content;
}

export async function fetchUserRepos(
  token: string
): Promise<
  Array<{
    id: number;
    full_name: string;
    name: string;
    html_url: string;
    description: string | null;
    language: string | null;
    default_branch: string;
    private: boolean;
  }>
> {
  const repos: Array<any> = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "CodeCraft-App",
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) break;

    const data = (await response.json()) as Array<any>;
    repos.push(...data);

    if (data.length < 100) break;
    page++;
  }

  return repos;
}

// Multi-file atomic commit via Git Data API
export async function createMultiFileCommit(
  token: string,
  repoFullName: string,
  branch: string,
  message: string,
  changes: Array<{ path: string; content: string | null }> // null content = delete
): Promise<{ sha: string; url: string }> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "CodeCraft-App",
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  const baseUrl = `https://api.github.com/repos/${repoFullName}`;

  // 1. Get the current commit SHA for the branch
  const refResponse = await fetch(`${baseUrl}/git/ref/heads/${branch}`, {
    headers,
  });
  if (!refResponse.ok) throw new Error("Failed to get branch ref");
  const refData = (await refResponse.json()) as { object: { sha: string } };
  const baseSha = refData.object.sha;

  // 2. Get the tree SHA of the current commit
  const commitResponse = await fetch(`${baseUrl}/git/commits/${baseSha}`, {
    headers,
  });
  if (!commitResponse.ok) throw new Error("Failed to get commit");
  const commitData = (await commitResponse.json()) as {
    tree: { sha: string };
  };
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for each file
  const treeItems: Array<{
    path: string;
    mode: string;
    type: string;
    sha?: string | null;
  }> = [];

  for (const change of changes) {
    if (change.content === null) {
      // Delete file - omit from tree (handled by using base_tree)
      treeItems.push({
        path: change.path,
        mode: "100644",
        type: "blob",
        sha: null,
      });
    } else {
      // Create blob
      const blobResponse = await fetch(`${baseUrl}/git/blobs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: change.content,
          encoding: "utf-8",
        }),
      });
      if (!blobResponse.ok) throw new Error(`Failed to create blob for ${change.path}`);
      const blobData = (await blobResponse.json()) as { sha: string };

      treeItems.push({
        path: change.path,
        mode: "100644",
        type: "blob",
        sha: blobData.sha,
      });
    }
  }

  // 4. Create a new tree
  const treeResponse = await fetch(`${baseUrl}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems,
    }),
  });
  if (!treeResponse.ok) throw new Error("Failed to create tree");
  const treeData = (await treeResponse.json()) as { sha: string };

  // 5. Create a new commit
  const newCommitResponse = await fetch(`${baseUrl}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [baseSha],
    }),
  });
  if (!newCommitResponse.ok) throw new Error("Failed to create commit");
  const newCommitData = (await newCommitResponse.json()) as {
    sha: string;
    html_url: string;
  };

  // 6. Update the branch reference
  const updateRefResponse = await fetch(`${baseUrl}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      sha: newCommitData.sha,
    }),
  });
  if (!updateRefResponse.ok) throw new Error("Failed to update ref");

  return { sha: newCommitData.sha, url: newCommitData.html_url };
}
/**
 * Create a branch on GitHub
 */
export async function createBranch(
  token: string,
  repoFullName: string,
  branchName: string,
  fromRef: string = 'main'
): Promise<{ sha: string; ref: string }> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "FactoryJet-CMS",
    Accept: "application/vnd.github.v3+json",
  };

  const baseUrl = `https://api.github.com/repos/${repoFullName}`;

  // 1. Get the SHA of the base branch
  const refResponse = await fetch(
    `${baseUrl}/git/ref/heads/${fromRef}`,
    { headers }
  );
  
  if (!refResponse.ok) {
    throw new Error(`Failed to get base branch ${fromRef}: ${refResponse.statusText}`);
  }
  
  const refData = (await refResponse.json()) as { object: { sha: string } };
  const baseSha = refData.object.sha;

  // 2. Create the new branch
  const createResponse = await fetch(
    `${baseUrl}/git/refs`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    }
  );

  if (!createResponse.ok) {
    const error = await createResponse.json().catch(() => ({}));
    throw new Error(error.message || `Failed to create branch: ${createResponse.statusText}`);
  }

  const createData = (await createResponse.json()) as {
    ref: string;
    object: { sha: string };
  };

  return {
    sha: createData.object.sha,
    ref: createData.ref,
  };
}

/**
 * Delete a branch on GitHub
 */
export async function deleteBranch(
  token: string,
  repoFullName: string,
  branchName: string
): Promise<void> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "FactoryJet-CMS",
    Accept: "application/vnd.github.v3+json",
  };

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/git/refs/heads/${branchName}`,
    {
      method: "DELETE",
      headers,
    }
  );

  // 404 is OK - branch already deleted
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete branch: ${response.statusText}`);
  }
}

/**
 * Check if branch exists
 */
export async function branchExists(
  token: string,
  repoFullName: string,
  branchName: string
): Promise<boolean> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "FactoryJet-CMS",
    Accept: "application/vnd.github.v3+json",
  };

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/git/ref/heads/${branchName}`,
    { headers }
  );

  return response.ok;
}

/**
 * Create a pull request on GitHub
 */
export async function createPullRequest(
  token: string,
  repoFullName: string,
  options: {
    title: string;
    body: string;
    head: string;
    base: string;
  }
): Promise<{
  number: number;
  html_url: string;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
}> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "FactoryJet-CMS",
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/pulls`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(options),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to create PR: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get pull request details
 */
export async function getPullRequest(
  token: string,
  repoFullName: string,
  prNumber: number
): Promise<{
  number: number;
  title: string;
  state: string;
  html_url: string;
  mergeable: boolean | null;
  mergeable_state: string;
  draft: boolean;
  merged: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
}> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "FactoryJet-CMS",
    Accept: "application/vnd.github.v3+json",
  };

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Failed to get PR: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get PR file changes with diffs
 */
export async function getPullRequestFiles(
  token: string,
  repoFullName: string,
  prNumber: number
): Promise<Array<{
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  blob_url: string;
  raw_url: string;
  previous_filename?: string;
}>> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "FactoryJet-CMS",
    Accept: "application/vnd.github.v3+json",
  };

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}/files`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Failed to get PR files: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get check runs for a ref
 */
export async function getCheckRuns(
  token: string,
  repoFullName: string,
  ref: string
): Promise<{
  total_count: number;
  check_runs: Array<{
    name: string;
    status: string;
    conclusion: string | null;
    html_url: string;
    started_at: string;
    completed_at: string | null;
  }>;
}> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "FactoryJet-CMS",
    Accept: "application/vnd.github.v3+json",
  };

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/commits/${ref}/check-runs`,
    { headers }
  );

  if (!response.ok) {
    // Return empty if no checks
    return { total_count: 0, check_runs: [] };
  }

  return await response.json();
}

/**
 * Get PR reviews
 */
export async function getPullRequestReviews(
  token: string,
  repoFullName: string,
  prNumber: number
): Promise<Array<{
  id: number;
  user: { login: string } | null;
  state: string;
  body: string;
  submitted_at: string;
}>> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "FactoryJet-CMS",
    Accept: "application/vnd.github.v3+json",
  };

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}/reviews`,
    { headers }
  );

  if (!response.ok) {
    return [];
  }

  return await response.json();
}

/**
 * Merge a pull request
 */
export async function mergePullRequest(
  token: string,
  repoFullName: string,
  prNumber: number,
  options: {
    merge_method: 'merge' | 'squash' | 'rebase';
    commit_title?: string;
    commit_message?: string;
  }
): Promise<{ sha: string; merged: boolean; message: string }> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "FactoryJet-CMS",
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}/merge`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(options),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to merge PR: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Update PR
 */
export async function updatePullRequest(
  token: string,
  repoFullName: string,
  prNumber: number,
  options: {
    state?: 'open' | 'closed';
    title?: string;
    body?: string;
  }
): Promise<any> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "FactoryJet-CMS",
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(options),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update PR: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get PR comments (issue comments)
 */
export async function getPullRequestComments(
  token: string,
  repoFullName: string,
  prNumber: number
): Promise<Array<{
  id: number;
  user: { login: string } | null;
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}>> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "FactoryJet-CMS",
    Accept: "application/vnd.github.v3+json",
  };

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/issues/${prNumber}/comments`,
    { headers }
  );

  if (!response.ok) {
    return [];
  }

  return await response.json();
}

/**
 * Get PR review comments (inline code comments)
 */
export async function getPullRequestReviewComments(
  token: string,
  repoFullName: string,
  prNumber: number
): Promise<Array<{
  id: number;
  user: { login: string } | null;
  body: string;
  path: string;
  line: number;
  created_at: string;
  html_url: string;
  diff_hunk: string;
}>> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "FactoryJet-CMS",
    Accept: "application/vnd.github.v3+json",
  };

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}/comments`,
    { headers }
  );

  if (!response.ok) {
    return [];
  }

  return await response.json();
}
