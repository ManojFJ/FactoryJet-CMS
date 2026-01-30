"use client";

import { useEffect, useRef, useState } from "react";
import {
  getConversations,
  getMessages,
  streamChat,
  applyChanges,
} from "@/lib/api";
import { CodeChangeCard } from "./code-change-card";

interface ChatViewProps {
  project: any;
  user: any;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  codeChanges?: any[];
  streaming?: boolean;
  statusText?: string;
}

/** Animated dots indicator for thinking/loading states */
function ThinkingIndicator({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--muted)] text-sm py-1">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      {text && <span className="text-xs">{text}</span>}
    </div>
  );
}

/** Status pill shown during tool calls */
function StatusPill({ text, icon }: { text: string; icon: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium px-2.5 py-1 rounded-full my-1.5">
      <span>{icon}</span>
      <span>{text}</span>
      <span className="w-1 h-1 rounded-full bg-[var(--primary)] animate-pulse" />
    </div>
  );
}

export function ChatView({ project, user, onBack }: ChatViewProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<{ abort: () => void } | null>(null);

  useEffect(() => {
    loadConversations();
  }, [project.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    try {
      const data = await getConversations(project.id);
      setConversations(data.conversations);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadMessages(convoId: string) {
    setSelectedConvoId(convoId);
    try {
      const data = await getMessages(convoId);
      setMessages(data.messages);
    } catch (err) {
      console.error(err);
    }
  }

  function handleSend() {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: "temp-" + Date.now(),
      role: "user",
      content: input.trim(),
    };

    const assistantMessage: ChatMessage = {
      id: "assistant-" + Date.now(),
      role: "assistant",
      content: "",
      codeChanges: [],
      streaming: true,
      statusText: "Thinking...",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsStreaming(true);

    const { abort } = streamChat(
      project.id,
      userMessage.content,
      selectedConvoId || undefined,
      (event) => {
        switch (event.type) {
          case "conversation":
            if (event.conversationId) {
              setSelectedConvoId(event.conversationId);
            }
            break;

          case "status":
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                last.statusText = event.statusText || "";
              }
              return updated;
            });
            break;

          case "text":
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                last.content += event.content || "";
                last.statusText = undefined; // Clear status once text arrives
              }
              return updated;
            });
            break;

          case "tool_call":
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                const toolName = event.toolCall?.name || "tool";
                const toolArgs = event.toolCall?.args || {};
                if (toolName === "readFile") {
                  last.statusText = `Reading ${toolArgs.path}`;
                } else if (toolName === "searchFiles") {
                  last.statusText = `Searching for "${toolArgs.pattern}"`;
                } else if (toolName === "proposeChanges") {
                  last.statusText = "Proposing changes...";
                }
              }
              return updated;
            });
            break;

          case "code_change":
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant" && event.codeChange) {
                last.codeChanges = [
                  ...(last.codeChanges || []),
                  event.codeChange,
                ];
                last.statusText = undefined; // Clear status
              }
              return updated;
            });
            break;

          case "message_saved":
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                last.id = event.messageId;
              }
              return updated;
            });
            break;

          case "done":
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                last.streaming = false;
                last.statusText = undefined;
              }
              return updated;
            });
            setIsStreaming(false);
            loadConversations();
            break;

          case "error":
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                last.content += `\n\n**Error:** ${event.error}`;
                last.streaming = false;
                last.statusText = undefined;
              }
              return updated;
            });
            setIsStreaming(false);
            break;
        }
      }
    );

    abortRef.current = { abort };
  }

  function handleStop() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last.role === "assistant") {
        last.streaming = false;
        last.statusText = undefined;
        if (!last.content) {
          last.content = "*Stopped by user*";
        }
      }
      return updated;
    });
    setIsStreaming(false);
  }

  async function handleApply(messageId: string) {
    setApplying(messageId);
    try {
      const result = await applyChanges(project.id, messageId);
      alert(`Changes committed! SHA: ${result.commit.sha.slice(0, 7)}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to apply changes");
    } finally {
      setApplying(null);
    }
  }

  function handleNewConversation() {
    setSelectedConvoId(null);
    setMessages([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-[var(--border)] flex flex-col bg-[var(--card)]">
        <div className="p-4 border-b border-[var(--border)]">
          <button
            onClick={onBack}
            className="text-sm text-[var(--muted)] hover:text-white transition-colors mb-3 flex items-center gap-1"
          >
            &larr; Back to projects
          </button>
          <h2 className="font-semibold truncate text-sm">
            {project.repoFullName}
          </h2>
        </div>

        <div className="p-2">
          <button
            onClick={handleNewConversation}
            className="w-full text-left p-2 rounded-lg text-sm hover:bg-[var(--card-hover)] transition-colors border border-dashed border-[var(--border)]"
          >
            + New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => loadMessages(convo.id)}
              className={`w-full text-left p-2 rounded-lg text-sm truncate transition-colors ${
                selectedConvoId === convo.id
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "hover:bg-[var(--card-hover)] text-[var(--muted)]"
              }`}
            >
              {convo.title}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  Start a conversation
                </h3>
                <p className="text-[var(--muted)] text-sm max-w-md">
                  Describe what you&apos;d like to build or change in{" "}
                  <strong>{project.repoFullName}</strong>. The AI will read your
                  codebase and generate changes.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-[var(--primary)] text-white rounded-2xl rounded-br-sm px-4 py-2"
                    : "bg-[var(--card)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-4 py-3"
                }`}
              >
                {/* Thinking/status indicator */}
                {msg.streaming && msg.statusText && (
                  <div className="mb-1">
                    {msg.statusText === "Thinking..." || msg.statusText === "Processing..." ? (
                      <ThinkingIndicator text={msg.statusText} />
                    ) : msg.statusText.startsWith("Reading") ? (
                      <StatusPill icon="📄" text={msg.statusText} />
                    ) : msg.statusText.startsWith("Searching") ? (
                      <StatusPill icon="🔍" text={msg.statusText} />
                    ) : msg.statusText.startsWith("Proposing") ? (
                      <StatusPill icon="✏️" text={msg.statusText} />
                    ) : msg.statusText.startsWith("Generating") ? (
                      <StatusPill icon="⚡" text={msg.statusText} />
                    ) : (
                      <ThinkingIndicator text={msg.statusText} />
                    )}
                  </div>
                )}

                {/* Message text */}
                {msg.content && (
                  <div className="chat-markdown whitespace-pre-wrap text-sm">
                    {msg.content}
                    {msg.streaming && !msg.statusText && (
                      <span className="inline-block w-2 h-4 bg-current animate-pulse ml-0.5" />
                    )}
                  </div>
                )}

                {/* Empty streaming message with no status — show minimal indicator */}
                {msg.streaming && !msg.content && !msg.statusText && (
                  <ThinkingIndicator />
                )}

                {/* Code changes */}
                {msg.codeChanges && msg.codeChanges.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-[var(--muted)] uppercase">
                      Proposed Changes
                    </p>
                    {msg.codeChanges.map((change: any, i: number) => (
                      <CodeChangeCard key={i} change={change} />
                    ))}
                    {!msg.streaming && (
                      <button
                        onClick={() => handleApply(msg.id)}
                        disabled={applying === msg.id}
                        className="mt-2 bg-[var(--success)] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {applying === msg.id
                          ? "Committing..."
                          : "Apply & Commit to GitHub"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--border)] p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build or change..."
              rows={1}
              className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[var(--primary)] min-h-[48px] max-h-[200px]"
              style={{
                height: "auto",
                overflow: "hidden",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
              }}
            />
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="bg-red-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-red-700 transition-colors self-end"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-[var(--primary)] text-white px-4 py-3 rounded-xl font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 self-end"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
