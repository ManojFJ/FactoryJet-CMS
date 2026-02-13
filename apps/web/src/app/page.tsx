"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Layout, Briefcase, LineChart, FileText, 
  Users, ShoppingCart, ArrowLeft, Sparkles, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const templates = [
  { id: 'landing', title: 'Landing Page', icon: Layout, desc: 'High-converting landing page for products.' },
  { id: 'portfolio', title: 'Portfolio', icon: Briefcase, desc: 'Showcase your work and resume.' },
  { id: 'saas', title: 'SaaS Starter', icon: LineChart, desc: 'Dashboard, Auth, and Stripe setup.' },
  { id: 'blog', title: 'Modern Blog', icon: FileText, desc: 'Content-focused site with MDX.' },
  { id: 'agency', title: 'Agency Site', icon: Users, desc: 'Service listings and case studies.' },
  { id: 'ecommerce', title: 'E-commerce', icon: ShoppingCart, desc: 'Online store with cart functionality.' },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateProject = async () => {
    if (!prompt.trim()) return toast.error("Please enter a prompt!");
    
    setIsLoading(true);
    const toastId = toast.loading("Initializing AI Planner Agent...");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: selectedTemplate.id,
          prompt: prompt
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Project scaffolded successfully!", { id: toastId });
        router.push(`/?project=${data.id}`);
      } else {
        toast.error("Failed to initialize project", { id: toastId });
      }
    } catch (error) {
      toast.error("Network error. Check your connection.", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <button 
          onClick={() => step === 1 ? router.push('/') : setStep(1)}
          className="flex items-center text-gray-400 hover:text-white mb-8 group"
        >
          <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => { setSelectedTemplate(tpl); setStep(2); }}
                  className="bg-[#111] border border-white/5 p-6 rounded-2xl text-left hover:border-blue-500/50 transition-all"
                >
                  <tpl.icon size={24} className="mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">{tpl.title}</h3>
                  <p className="text-sm text-gray-500">{tpl.desc}</p>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto text-center"
            >
              <h2 className="text-3xl font-bold mb-8">What are we building?</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-48 bg-[#111] border border-white/10 rounded-2xl p-6 mb-8 focus:border-blue-500 outline-none"
                placeholder="Describe your project..."
              />
              <button
                onClick={handleCreateProject}
                disabled={isLoading}
                className="w-full bg-blue-600 py-4 rounded-xl flex items-center justify-center gap-3 font-bold"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {isLoading ? "AI is Planning..." : "Generate Project with AI"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}