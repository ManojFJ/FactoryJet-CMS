"use client";

import { useState } from "react";

interface CodeChangeProps {
  change: {
    path: string;
    action: "create" | "edit" | "delete";
    content?: string;
  };
}

export function CodeChangeCard({ change }: CodeChangeProps) {
  const [expanded, setExpanded] = useState(false);

  const actionColors = {
    create: "text-[var(--success)]",
    edit: "text-yellow-400",
    delete: "text-[var(--danger)]",
  };

  const actionLabels = {
    create: "NEW",
    edit: "MODIFIED",
    delete: "DELETED",
  };

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--background)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[var(--card-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`font-mono font-bold ${actionColors[change.action]}`}>
            {actionLabels[change.action]}
          </span>
          <span className="font-mono text-[var(--foreground)]">
            {change.path}
          </span>
        </div>
        <span className="text-[var(--muted)]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && change.content && (
        <div className="border-t border-[var(--border)]">
          <pre className="p-3 text-xs overflow-x-auto max-h-[400px] overflow-y-auto m-0 rounded-none border-none">
            <code>{change.content}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
