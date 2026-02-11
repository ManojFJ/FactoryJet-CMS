"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Layout, ShoppingBag, Briefcase, FileText, Layers, Sparkles, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- CONFIGURATION ---
const TEMPLATES = [
  { id: "landing", name: "Landing Page", icon: Layout, description: "High-converting landing page for products." },
  { id: "portfolio", name: "Portfolio", icon: Briefcase, description: "Showcase your work and resume." },
  { id: "saas", name: "SaaS Starter", icon: Layers, description: "Dashboard, Auth, and Stripe setup." },
  { id: "blog", name: "Modern Blog", icon: FileText, description: "Content-focused site with MDX." },
  { id: "agency", name: "Agency Site", icon: Sparkles, description: "Service listings and case studies." },
  { id: "ecommerce", name: "E-commerce", icon: ShoppingBag, description: "Online store with cart functionality." },
];

export default function NewProjectPage() {
  // State Management
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleNext = () => {
    if (step === 1 && selectedTemplate) setStep(2);
  };

  const handleCreate = () => {
    if (!selectedTemplate || !prompt) return;
    setIsGenerating(true);
    
    // TODO: This will connect to Task S1.4 (The API)
    console.log("Payload:", { template: selectedTemplate, prompt });

    // Mock delay to show the loading state
    setTimeout(() => {
      setIsGenerating(false);
      alert("Ready to connect to Backend (Task S1.4)!");
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header & Back Button */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors text-sm">
            <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
              <p className="text-gray-400">Let's build something amazing together.</p>
            </div>
            {/* Simple Stepper Indicator */}
            <div className="flex items-center gap-3 text-sm font-medium">
              <span className={cn("flex items-center gap-2", step >= 1 ? "text-blue-400" : "text-gray-600")}>
                <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">1</div> Template
              </span>
              <div className="w-8 h-[1px] bg-gray-800" />
              <span className={cn("flex items-center gap-2", step >= 2 ? "text-blue-400" : "text-gray-600")}>
                <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">2</div> Prompt
              </span>
            </div>
          </div>
        </div>

        {/* --- STEP 1: TEMPLATE SELECTION --- */}
        {step === 1 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {TEMPLATES.map((template) => {
                const Icon = template.icon;
                const isSelected = selectedTemplate === template.id;
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      "group relative flex flex-col items-start p-6 rounded-2xl border text-left transition-all duration-200",
                      isSelected 
                        ? "bg-blue-600/10 border-blue-500 ring-1 ring-blue-500" 
                        : "bg-[#0a0a0a] border-white/10 hover:border-white/20 hover:bg-white/5"
                    )}
                  >
                    <div className={cn("p-3 rounded-xl mb-4 transition-colors", isSelected ? "bg-blue-500 text-white" : "bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white")}>
                      <Icon size={24} />
                    </div>
                    <h3 className={cn("text-lg font-semibold mb-2 transition-colors", isSelected ? "text-blue-400" : "text-white")}>{template.name}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400">{template.description}</p>
                    
                    {/* Checkmark for selected state */}
                    {isSelected && <div className="absolute top-4 right-4 text-blue-500"><CheckCircle2 size={20} /></div>}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleNext}
                disabled={!selectedTemplate}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all",
                  selectedTemplate 
                    ? "bg-blue-600 hover:bg-blue-500 text-white" 
                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                )}
              >
                Next Step <ArrowRight size={16} />
              </button>
            </div>
          </section>
        )}

        {/* --- STEP 2: PROMPT INPUT --- */}
        {step === 2 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-1 mb-6">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision... (e.g., 'I want a minimalist portfolio for a wildlife photographer. Use dark greens and large imagery. Include a gallery grid and a contact form.')"
                className="w-full bg-transparent text-white p-6 h-48 focus:outline-none resize-none text-base leading-relaxed placeholder:text-gray-600"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between">
              <button 
                onClick={() => setStep(1)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                Back to Templates
              </button>
              
              <button
                onClick={handleCreate}
                disabled={!prompt || isGenerating}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all",
                  prompt && !isGenerating
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20" 
                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                )}
              >
                {isGenerating ? "Initializing Agent..." : "Create Project"}
              </button>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}