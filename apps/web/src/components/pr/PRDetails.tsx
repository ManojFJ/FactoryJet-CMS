"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation"; // Assumes App Router
import DiffViewer from "./DiffViewer";
import { CheckCircle, XCircle, GitMerge } from "lucide-react"; // Ensure lucide-react is installed

interface PRData {
  details: any;
  files: any[];
  checks: any[];
}

export default function PRDetails() {
  const { projectId, prNumber } = useParams();
  const [data, setData] = useState<PRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!projectId || !prNumber) return;
    
    // Fetch from your new Hono API
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/github/pr/${projectId}/${prNumber}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}` // Ensure auth token is sent
        }
    })
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, [projectId, prNumber]);

  const handleMerge = async () => {
    if (!confirm("Are you sure you want to merge this PR?")) return;
    setMerging(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/github/pr/${projectId}/${prNumber}/merge`, {
        method: "POST",
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        alert("Merged successfully!");
        window.location.reload();
      } else {
        alert("Merge failed");
      }
    } finally {
      setMerging(false);
    }
  };

  if (loading) return <div className="text-zinc-400 p-10 text-center">Loading PR details...</div>;
  if (!data) return <div className="text-red-400 p-10 text-center">Failed to load PR.</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-zinc-500">#{data.details.number}</span> 
            {data.details.title}
          </h1>
          <div className="flex items-center gap-3 mt-3 text-sm">
             <span className={`px-3 py-1 rounded-full font-medium ${
              data.details.state === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
            }`}>
              {data.details.state.toUpperCase()}
            </span>
            <span className="text-zinc-400">
              <span className="text-white font-semibold">{data.details.user.login}</span> wants to merge into 
              <code className="bg-zinc-800 px-1.5 py-0.5 rounded mx-1 text-zinc-200">{data.details.base.ref}</code> 
              from 
              <code className="bg-zinc-800 px-1.5 py-0.5 rounded mx-1 text-zinc-200">{data.details.head.ref}</code>
            </span>
          </div>
        </div>
        
        {data.details.state === 'open' && (
          <button
            onClick={handleMerge}
            disabled={merging}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/20"
          >
            <GitMerge size={20} />
            {merging ? "Merging..." : "Merge Pull Request"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Left Column: Description & Checks */}
        <div className="lg:col-span-1 space-y-6">
            {/* CI/CD Checks Panel */}
            <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800">
            <h3 className="text-zinc-400 text-xs uppercase font-bold tracking-wider mb-4">Automated Checks</h3>
            <div className="space-y-3">
                {data.checks.length === 0 ? (
                <p className="text-zinc-500 text-sm italic">No checks detected.</p>
                ) : (
                data.checks.map((check: any) => (
                    <div key={check.id} className="flex items-center justify-between text-sm bg-zinc-950/50 p-2 rounded">
                    <span className="text-zinc-300 font-medium">{check.name}</span>
                    {check.conclusion === 'success' ? (
                        <span className="text-green-400 flex items-center gap-1.5"><CheckCircle size={16}/> Passed</span>
                    ) : (
                        <span className="text-red-400 flex items-center gap-1.5"><XCircle size={16}/> Failed</span>
                    )}
                    </div>
                ))
                )}
            </div>
            </div>

            {/* Description Panel */}
            <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800">
            <h3 className="text-zinc-400 text-xs uppercase font-bold tracking-wider mb-4">Description</h3>
            <div className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                {data.details.body || "No description provided."}
            </div>
            </div>
        </div>

        {/* 3. Right Column: File Diffs */}
        <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">
            Files Changed <span className="bg-zinc-800 text-zinc-400 text-sm px-2 py-0.5 rounded-full ml-2">{data.files.length}</span>
            </h2>
            
            {data.files.map((file) => (
            <DiffViewer 
                key={file.filename}
                filename={file.filename}
                oldCode="" 
                newCode={file.patch || "Binary file or empty change."} 
            />
            ))}
        </div>
      </div>
    </div>
  );
}
