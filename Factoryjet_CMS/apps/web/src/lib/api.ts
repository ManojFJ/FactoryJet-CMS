

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';


function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('factoryjet_token');
}


export const api = {
  
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


export const branchesApi = {
  create: (projectId: string, description: string, baseBranch = 'main') =>
    api.post('/branches/create', { projectId, description, baseBranch }),

  list: (projectId: string) => api.get(`/branches/${projectId}`),

  get: (projectId: string, branchId: string) =>
    api.get(`/branches/${projectId}/${branchId}`),

  delete: (branchId: string, deleteOnGithub = true) =>
    api.delete(`/branches/${branchId}?deleteOnGithub=${deleteOnGithub}`),
};


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