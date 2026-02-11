"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
// This imports the Blueprint we just saved in Step 1
import { ProjectCard } from "@/components/dashboard/ProjectCard"; 

export default function DashboardPage() {
  // Mock Data: This mimics the database
  const projects = [
    {
      id: "1",
      name: "FactoryJet Marketing Site",
      description: "Main landing page with pricing and feature breakdown.",
      updatedAt: new Date(),
      language: "Next.js 15",
      branch: "main",
      status: "deployed" as const,
    },
    {
      id: "2",
      name: "Client Portal MVP",
      description: "Customer dashboard for managing subscriptions.",
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      language: "React",
      branch: "feature/auth",
      status: "building" as const,
    },
    {
      id: "3",
      name: "E-commerce Starter",
      description: "Template for online stores with Stripe integration.",
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      language: "Next.js",
      branch: "dev",
      status: "idle" as const,
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white p-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Projects</h1>
          <p className="text-gray-400">Manage your AI-generated applications.</p>
        </div>
        
        <Link 
          href="/new" 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          New Project
        </Link>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length > 0 ? (
          projects.map((project) => (
            <ProjectCard key={project.id} {...project} />
          ))
        ) : (
          <div className="col-span-full py-20 text-center border border-dashed border-gray-800 rounded-2xl bg-white/5">
            <h3 className="text-xl font-medium text-white mb-2">No projects found</h3>
            <p className="text-gray-500 mb-6">Create your first AI-generated website.</p>
          </div>
        )}
      </div>
    </main>
  );
}