const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

async function fetchAPI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((error as any).error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export async function getCurrentUser() {
  return fetchAPI<{
    user: {
      id: string;
      name: string;
      email: string | null;
      avatarUrl: string | null;
      plan: string;
    } | null;
  }>("/auth/me");
}

export function getGitHubLoginUrl() {
  return `${API_URL}/auth/github`;
}

export async function logout() {
  return fetchAPI("/auth/logout", { method: "POST" });
}

// Projects
export async function getProjects() {
  return fetchAPI<{ projects: any[] }>("/projects");
}

export async function getGitHubRepos() {
  return fetchAPI<{ repos: any[] }>("/projects/github-repos");
}

export async function connectRepo(repoFullName: string) {
  return fetchAPI<{ project: any }>("/projects", {
    method: "POST",
    body: JSON.stringify({ repoFullName }),
  });
}

export async function deleteProject(id: string) {
  return fetchAPI("/projects/" + id, { method: "DELETE" });
}

// Chat
export async function getConversations(projectId: string) {
  return fetchAPI<{ conversations: any[] }>(
    `/chat/conversations/${projectId}`
  );
}

export async function getMessages(conversationId: string) {
  return fetchAPI<{ messages: any[] }>(`/chat/messages/${conversationId}`);
}

export function streamChat(
  projectId: string,
  content: string,
  conversationId?: string,
  onEvent?: (event: any) => void
): { abort: () => void } {
  const controller = new AbortController();

  fetch(`${API_URL}/chat/send`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, content, conversationId }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Stream failed");
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            try {
              const data = JSON.parse(line.slice(5).trim());
              onEvent?.(data);
            } catch {
              // skip malformed
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onEvent?.({ type: "error", error: err.message });
      }
    });

  return { abort: () => controller.abort() };
}

export async function applyChanges(
  projectId: string,
  messageId: string,
  commitMessage?: string
) {
  return fetchAPI<{ ok: boolean; commit: { sha: string; url: string } }>(
    "/chat/apply",
    {
      method: "POST",
      body: JSON.stringify({ projectId, messageId, commitMessage }),
    }
  );
}
/**
 * Get auth token from storage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('factoryjet_token');
}

/**
 * API Client
 */
export const api = {
  /**
   * GET request
   */
  async get<T = any>(endpoint: string): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || 'Request failed');
    }

    return res.json();
  },

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || 'Request failed');
    }

    return res.json();
  },

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || 'Request failed');
    }

    return res.json();
  },

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || 'Request failed');
    }

    return res.json();
  },
};

/**
 * Branches API
 */
export const branchesApi = {
  create: (projectId: string, description: string, baseBranch = 'main') =>
    api.post('/branches/create', { projectId, description, baseBranch }),

  list: (projectId: string) => api.get(`/branches/${projectId}`),

  get: (projectId: string, branchId: string) =>
    api.get(`/branches/${projectId}/${branchId}`),

  delete: (branchId: string, deleteOnGithub = true) =>
    api.delete(`/branches/${branchId}?deleteOnGithub=${deleteOnGithub}`),
};

/**
 * Pull Requests API
 */
export const pullRequestsApi = {
  create: (data: {
    projectId: string;
    branchId: string;
    title: string;
    changes: Array<{
      path: string;
      type: 'added' | 'modified' | 'deleted';
      additions?: number;
      deletions?: number;
    }>;
    riskFlags?: Array<{
      level: 'low' | 'medium' | 'high';
      message: string;
      file?: string;
    }>;
    agentRunId?: string;
  }) => api.post('/pull-requests/create', data),

  list: (projectId: string, status?: string, limit = 50, offset = 0) =>
    api.get(
      `/pull-requests/${projectId}?${new URLSearchParams({
        ...(status && { status }),
        limit: limit.toString(),
        offset: offset.toString(),
      })}`
    ),

  getStatus: (prId: string) => api.get(`/pull-requests/${prId}/status`),

  getDiff: (prId: string) => api.get(`/pull-requests/${prId}/diff`),

  getComments: (prId: string) => api.get(`/pull-requests/${prId}/comments`),

  merge: (
    prId: string,
    method: 'merge' | 'squash' | 'rebase' = 'squash',
    commitTitle?: string,
    commitMessage?: string
  ) =>
    api.post(`/pull-requests/${prId}/merge`, {
      mergeMethod: method,
      commitTitle,
      commitMessage,
    }),

  close: (prId: string) => api.post(`/pull-requests/${prId}/close`),
};
