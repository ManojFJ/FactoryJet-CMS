"use client";

import { GitBranch, Calendar, Code2, Loader2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProjectCardProps {
  id: string;
  name: string;
  description?: string;
  updatedAt: Date;
  language: string;
  branch: string;
  status?: "idle" | "generating" | "building" | "deployed";
}

export function ProjectCard({
  id,
  name,
  description,
  updatedAt,
  language,
  branch,
  status = "idle",
}: ProjectCardProps) {
  return (
    <Link href={`/project/${id}`} className="block group">
      <div className="relative border border-white/10 bg-[#0a0a0a] hover:border-blue-500/50 transition-all duration-300 rounded-xl p-5 overflow-hidden h-full flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 flex-1">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-blue-400 group-hover:scale-105 transition-transform">
              <Code2 size={20} />
            </div>
            <StatusBadge status={status} />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
              {name}
            </h3>
            <ExternalLink size={14} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-sm text-gray-400 line-clamp-2 mb-6 h-10">
            {description || "No description provided."}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500 font-mono border-t border-white/10 pt-4 mt-auto">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${getLangColor(language)}`} />
              {language}
            </div>
            <div className="flex items-center gap-1.5">
              <GitBranch size={12} />
              {branch}
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <Calendar size={12} />
              {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Helper functions for the card
function StatusBadge({ status }: { status: string }) {
  if (status === "generating") return <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20"><Loader2 size={10} className="animate-spin" /> Generating</span>;
  if (status === "building") return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full border border-yellow-500/20"><Loader2 size={10} className="animate-spin" /> Building</span>;
  if (status === "deployed") return <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">Deployed</span>;
  return null;
}

function getLangColor(lang: string) {
  if (lang.includes("Next")) return "bg-white";
  if (lang.includes("React")) return "bg-blue-400";
  return "bg-gray-500";
}