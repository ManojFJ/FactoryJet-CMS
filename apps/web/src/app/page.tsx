"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Layout, 
  Briefcase, 
  LineChart, 
  FileText, 
  Users, 
  ShoppingCart, 
  ArrowLeft,
  Sparkles,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  // S1.4: Connect to the Backend API
  const handleCreateProject = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    
    try {
      // Points to the endpoint you just built in apps/api/src/routes/projects.ts
      const response = await fetch(`${process.env.NEXT_PUBLIC_NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/projects/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: selectedTemplate.id,
          prompt: prompt
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success: Redirect to dashboard with the new project ID
        router.push(`/?project=${data.id}`);
      } else {
        console.error("Server error:", data.message);
      }
    } catch (error) {
      console.error("Connection Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-5xl mx-auto">
        {/* Navigation Header */}
        <button 
          onClick={() => step === 1 ? router.push('/') : setStep(1)}
          className="flex items-center text-gray-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Create New Project</h1>
            <p className="text-gray-400">Let's build something amazing together.</p>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className={`flex items-center gap-2 ${step === 1 ? 'text-blue-400' : 'text-gray-500'}`}>
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center ${step === 1 ? 'border-blue-400' : 'border-gray-500'}`}>1</span>
              Template
            </div>
            <div className="w-8 h-[1px] bg-gray-800" />
            <div className={`flex items-center gap-2 ${step === 2 ? 'text-blue-400' : 'text-gray-500'}`}>
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center ${step === 2 ? 'border-blue-400' : 'border-gray-500'}`}>2</span>
              Prompt
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    setSelectedTemplate(tpl);
                    setStep(2);
                  }}
                  className="bg-[#111] border border-white/5 p-6 rounded-2xl text-left hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group relative overflow-hidden"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <tpl.icon size={24} className="text-gray-400 group-hover:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400">{tpl.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{tpl.desc}</p>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-6">
                <selectedTemplate.icon size={16} />
                Selected: {selectedTemplate.title}
              </div>
              <h2 className="text-3xl font-bold mb-4">What are we building?</h2>
              <p className="text-gray-400 mb-8">Describe your project in detail. The AI will use this to generate your structure and code.</p>
              
              <div className="relative">
                <textarea
                  autoFocus
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A real estate landing page with a property search bar, testimonial section, and contact form..."
                  className="w-full h-48 bg-[#111] border border-white/10 rounded-2xl p-6 text-lg focus:outline-none focus:border-blue-500 transition-all resize-none mb-8 shadow-2xl"
                />
                
                <button
                  onClick={handleCreateProject}
                  disabled={!prompt.trim() || isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      AI is Planning...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Generate Project with AI
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}