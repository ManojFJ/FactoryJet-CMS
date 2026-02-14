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
