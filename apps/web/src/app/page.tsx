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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
      const response = await fetch(`${apiUrl}/projects/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateType: selectedTemplate.id, prompt: prompt }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Project scaffolded!", { id: toastId });
        window.location.href = `/?project=${data.id}`;
      } else {
        toast.error("Failed to initialize project", { id: toastId });
      }
    } catch (error) {
      toast.error("Connection error.", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <button 
          onClick={() => step === 1 ? router.push('/') : setStep(1)}
          className="flex items-center text-gray-400 hover:text-white mb-6 md:mb-8 text-sm md:text-base group"
        >
          <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <header className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">New Project</h1>
          <p className="text-gray-400 text-sm md:text-base">Let's build something amazing.</p>
        </header>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              // Responsive grid: 1 column on mobile, 2 on small tablets, 3 on desktop
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
            >
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => { setSelectedTemplate(tpl); setStep(2); }}
                  className="bg-[#111] border border-white/5 p-5 md:p-6 rounded-2xl text-left hover:border-blue-500/50 transition-all active:scale-[0.98]"
                >
                  <tpl.icon size={24} className="mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">{tpl.title}</h3>
                  <p className="text-xs md:text-sm text-gray-500">{tpl.desc}</p>
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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs mb-6">
                {selectedTemplate && <selectedTemplate.icon size={14} />}
                {selectedTemplate?.title}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Describe your project</h2>
              <textarea
                autoFocus
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-40 md:h-48 bg-[#111] border border-white/10 rounded-2xl p-5 md:p-6 mb-6 focus:border-blue-500 outline-none resize-none text-sm md:text-base"
                placeholder="e.g. A banana selling landing page..."
              />
              <button
                onClick={handleCreateProject}
                disabled={isLoading}
                className="w-full bg-blue-600 py-3.5 md:py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-sm md:text-base transition-all active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {isLoading ? "Planning..." : "Generate Project"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}