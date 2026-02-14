"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ArrowRight, Layout, Sparkles, Code2, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Dashboard() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Analyzing your prompt...");

  // S1.5: Simulate the AI Planning progress
  useEffect(() => {
    if (!projectId) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatusText("Project Ready for Development!");
          return 100;
        }
        
        // Update status text based on progress percentage
        if (prev > 80) setStatusText("Finalizing project structure...");
        else if (prev > 50) setStatusText("Generating database schemas...");
        else if (prev > 20) setStatusText("Scaffolding React components...");
        
        return prev + 1;
      });
    }, 150); // Adjust speed of simulation here

    return () => clearInterval(interval);
  }, [projectId]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8">
      {projectId ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#111] border border-blue-500/20 p-8 rounded-3xl text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            {progress === 100 ? (
              <CheckCircle size={40} className="text-green-400" />
            ) : (
              <Sparkles size={40} className="text-blue-400 animate-pulse" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold mb-2">
            {progress === 100 ? "Initialization Complete!" : "AI Planner is Active"}
          </h1>
          <p className="text-gray-500 mb-8 text-xs font-mono">
            REF ID: {projectId.slice(0, 8)}...
          </p>

          {/* Progress Bar Container */}
          <div className="mb-8">
            <div className="flex justify-between text-xs mb-2 px-1">
              <span className="text-blue-400 font-medium">{statusText}</span>
              <span className="text-gray-500">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-left">
              <Code2 size={18} className="text-gray-400 mb-2" />
              <div className="text-xs text-gray-500">Backend</div>
              <div className="text-sm font-semibold text-blue-300">Hono / D1</div>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-left">
              <Rocket size={18} className="text-gray-400 mb-2" />
              <div className="text-xs text-gray-500">Frontend</div>
              <div className="text-sm font-semibold text-blue-300">Next.js 15</div>
            </div>
          </div>

          <Link 
            href="/new"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all group"
          >
            Create Another Project 
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      ) : (
        <div className="text-center">
          <h1 className="text-5xl font-extrabold mb-6 tracking-tight">FactoryJet</h1>
          <p className="text-gray-400 mb-10 max-w-sm mx-auto">Your AI-Powered architecture is ready to build. Click below to start.</p>
          <Link 
            href="/new"
            className="px-10 py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-all flex items-center gap-3 mx-auto w-fit shadow-xl shadow-white/10"
          >
            <Layout size={22} /> New Project Wizard
          </Link>
        </div>
      )}
    </main>
  );
}