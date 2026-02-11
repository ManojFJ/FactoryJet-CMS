"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Send, Bot, User } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- 1. Code Block Component (Syntax Highlighting + Copy) ---
const CodeBlock = ({ language, code }: { language: string; code: string }) => {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-white/10">
        <span className="text-xs text-gray-400 uppercase font-mono">{language || "text"}</span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: "1.5rem", fontSize: "0.875rem", lineHeight: "1.5" }}
        showLineNumbers={true}
        wrapLines={true}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

// --- 2. Main Chat Component ---
export function ChatView() {
  const [input, setInput] = useState("");
  // Mock Data: This demonstrates the Markdown capabilities
  const [messages, setMessages] = useState([
    { role: "user", content: "Can you help me build a React button?" },
    { 
      role: "assistant", 
      content: "Here is a reusable `Button` component using **Tailwind CSS**.\n\n```tsx\nexport function Button({ children }) {\n  return (\n    <button className=\"bg-blue-600 px-4 py-2 rounded text-white\">\n      {children}\n    </button>\n  );\n}\n```" 
    }
  ]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", content: input }]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-[600px] border border-white/10 bg-[#0a0a0a] rounded-xl overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === "assistant" ? "bg-white/5 -mx-6 px-6 py-6" : ""}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-white/10">
              {msg.role === "assistant" ? <Bot size={18} className="text-blue-400" /> : <User size={18} className="text-gray-400" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-300 mb-1">
                {msg.role === "assistant" ? "FactoryJet AI" : "You"}
              </p>
              
              {/* Markdown Renderer */}
              <div className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeContent = String(children).replace(/\n$/, "");
                      if (!inline && match) {
                        return <CodeBlock language={match[1]} code={codeContent} />;
                      }
                      return <code className="bg-white/10 px-1 rounded text-pink-400 text-xs" {...props}>{children}</code>;
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your website requirements..."
            className="w-full bg-[#1e1e1e] text-white border border-white/10 rounded-lg p-3 pr-12 text-sm focus:outline-none focus:border-blue-500/50 resize-none h-14"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
          />
          <button onClick={sendMessage} className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}