"use client";

import { useEffect, useState } from "react";
import {
  getProjects,
  getGitHubRepos,
  connectRepo,
  deleteProject,
  logout,
} from "@/lib/api";
import { ChatView } from "./chat-view";

interface DashboardProps {
  user: {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
    plan: string;
  };
}

export function Dashboard({ user }: DashboardProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data.projects);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  async function handleDeleteProject(id: string) {
    if (!confirm("Remove this project?")) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (selectedProject?.id === id) setSelectedProject(null);
  }

  // If a project is selected, show the chat view
  if (selectedProject) {
    return (
      <ChatView
        project={selectedProject}
        user={user}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">CodeCraft</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--muted)]">{user.name}</span>
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-[var(--muted)] hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Your Projects</h2>
          <button
            onClick={() => setShowAddRepo(true)}
            className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            + Connect Repository
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[var(--border)] rounded-xl">
            <p className="text-[var(--muted)] mb-4">
              No projects connected yet.
            </p>
            <button
              onClick={() => setShowAddRepo(true)}
              className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
            >
              Connect your first repo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border border-[var(--border)] rounded-xl p-4 bg-[var(--card)] hover:bg-[var(--card-hover)] hover:border-[var(--border-hover)] transition-all cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold truncate">
                    {project.repoFullName}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                    className="text-[var(--muted)] hover:text-[var(--danger)] transition-colors text-sm ml-2"
                  >
                    Remove
                  </button>
                </div>
                {project.description && (
                  <p className="text-sm text-[var(--muted)] mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                  {project.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                      {project.language}
                    </span>
                  )}
                  <span>{project.defaultBranch}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Repo Modal */}
      {showAddRepo && (
        <AddRepoModal
          onClose={() => setShowAddRepo(false)}
          onConnected={(project) => {
            setProjects((prev) => [...prev, project]);
            setShowAddRepo(false);
          }}
        />
      )}
    </div>
  );
}

function AddRepoModal({
  onClose,
  onConnected,
}: {
  onClose: () => void;
  onConnected: (project: any) => void;
}) {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getGitHubRepos()
      .then((data) => setRepos(data.repos))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleConnect(fullName: string) {
    setConnecting(fullName);
    try {
      const data = await connectRepo(fullName);
      onConnected(data.project);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(null);
    }
  }

  const filtered = repos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold text-lg">Connect Repository</h3>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 border-b border-[var(--border)]">
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--primary)] border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[var(--muted)] py-8">
              No repositories found.
            </p>
          ) : (
            filtered.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--card-hover)]"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-medium text-sm truncate">
                    {repo.fullName}
                  </p>
                  {repo.description && (
                    <p className="text-xs text-[var(--muted)] truncate">
                      {repo.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleConnect(repo.fullName)}
                  disabled={connecting === repo.fullName}
                  className="text-sm bg-[var(--primary)] text-white px-3 py-1 rounded-md hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 shrink-0"
                >
                  {connecting === repo.fullName ? "..." : "Connect"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
