"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ArrowRight, Layout, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Dashboard() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 1));
    }, 150);
    return () => clearInterval(interval);
  }, [projectId]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8">
      {projectId ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#111] border border-white/5 p-10 rounded-3xl text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Sparkles size={32} className="text-blue-400 animate-pulse" />
          </div>
          
          <h1 className="text-2xl font-bold mb-8">AI Planner is Active</h1>

          {/* Streamlined Progress Section */}
          <div className="mb-10 text-left">
            <div className="flex justify-between text-xs mb-3 font-medium">
              <span className="text-blue-400">Scaffolding React components...</span>
              <span className="text-gray-500">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-500"
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
              />
            </div>
            <p className="mt-4 text-[10px] text-gray-600 uppercase tracking-widest text-center">
              Powered by Next.js 15
            </p>
          </div>

          <Link 
            href="/new"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            Create Another Project <ArrowRight size={18} />
          </Link>
        </motion.div>
      ) : (
        <div className="text-center">
          <h1 className="text-5xl font-extrabold mb-8 tracking-tighter">FactoryJet</h1>
          <Link 
            href="/new"
            className="px-10 py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-all flex items-center gap-3 mx-auto shadow-xl"
          >
            <Layout size={22} /> New Project Wizard
          </Link>
        </div>
      )}
    </main>
  );
}