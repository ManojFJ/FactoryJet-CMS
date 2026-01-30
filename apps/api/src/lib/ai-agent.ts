import { GoogleGenAI, Type } from "@google/genai";
import type { CodeChange, ChatStreamEvent } from "@codecraft/shared";

const SYSTEM_PROMPT = `You are CodeCraft, an expert AI coding agent. You help developers build and modify code in their GitHub repositories.

## CRITICAL: Act, don't explain
- Do NOT write long explanations of what you plan to do. Just DO it using tools.
- Do NOT describe changes in text before calling proposeChanges. Call the tool directly.
- Keep ALL text responses under 2-3 sentences. Let your tool calls do the work.

## Tools
- "readFile" — Read file contents. ALWAYS read before editing.
- "searchFiles" — Find files by name pattern.
- "proposeChanges" — Submit code changes. This is the ONLY way to make changes. Call it directly without explaining the changes in text first.

## Workflow
1. Use searchFiles or readFile to understand the code
2. Call proposeChanges with ALL changes in a single call
3. Write a 1-2 sentence summary AFTER proposing

## Rules
- ALWAYS read a file before editing it
- Provide COMPLETE new file content in proposeChanges (not partial diffs)
- Group all related changes into a single proposeChanges call
- NEVER list out changes in text — just call proposeChanges directly
- Be concise. No bullet-point previews of what you'll change.`;

export interface AgentContext {
  repoFullName: string;
  defaultBranch: string;
  repoTree: Array<{ path: string; type: string; size?: number }>;
  fileContents: Map<string, string>;
  conversationHistory: Array<{ role: string; content: string }>;
}

const agentTools = [
  {
    name: "readFile",
    description:
      "Read the contents of a file from the repository. Use this to understand existing code before making changes.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: "The file path relative to the repository root",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "searchFiles",
    description:
      "Search for files in the repository by name pattern. Returns matching file paths.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        pattern: {
          type: Type.STRING,
          description:
            "File name pattern or keyword to search for (e.g. 'tailwind', '.css', 'config')",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "proposeChanges",
    description:
      "Propose file changes to be committed. The user will review and approve before committing.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        commitMessage: {
          type: Type.STRING,
          description: "A clear, concise commit message",
        },
        changes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              path: {
                type: Type.STRING,
                description: "File path relative to repository root",
              },
              action: {
                type: Type.STRING,
                enum: ["create", "edit", "delete"],
                description: "The type of change",
              },
              content: {
                type: Type.STRING,
                description:
                  "The complete new file content (required for create/edit)",
              },
            },
            required: ["path", "action"],
          },
          description: "Array of file changes",
        },
      },
      required: ["commitMessage", "changes"],
    },
  },
];

const MAX_TOOL_TURNS = 15;

export function createAIAgent(apiKey: string) {
  const ai = new GoogleGenAI({ apiKey });

  async function* chat(
    userMessage: string,
    context: AgentContext,
    onToolCall?: (
      name: string,
      args: Record<string, unknown>
    ) => Promise<string>
  ): AsyncGenerator<ChatStreamEvent> {
    const repoContext = buildRepoContext(context);
    const systemInstruction = SYSTEM_PROMPT + "\n\n" + repoContext;

    // Build conversation contents
    const contents: Array<{
      role: "user" | "model";
      parts: Array<any>;
    }> = [
      ...context.conversationHistory.map((m) => ({
        role: (m.role === "model" ? "model" : "user") as "user" | "model",
        parts: [{ text: m.content }],
      })),
      {
        role: "user" as const,
        parts: [{ text: userMessage }],
      },
    ];

    try {
      for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
        // Emit thinking status at the start of each turn
        yield {
          type: "status" as const,
          statusText: turn === 0 ? "Thinking..." : "Processing...",
        };

        // Use non-streaming for tool-calling turns (avoids duplicate text bug)
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: agentTools }],
            temperature: 0.3,
            maxOutputTokens: 65536,
          },
          contents,
        });

        // Extract text and function calls from the response
        const parts = response.candidates?.[0]?.content?.parts || [];
        const finishReason = response.candidates?.[0]?.finishReason;
        const textParts: string[] = [];
        const functionCalls: Array<{
          name: string;
          args: Record<string, unknown>;
        }> = [];

        for (const part of parts) {
          if (part.text) {
            textParts.push(part.text);
          }
          if (part.functionCall) {
            functionCalls.push({
              name: part.functionCall.name!,
              args: (part.functionCall.args || {}) as Record<string, unknown>,
            });
          }
        }

        const turnText = textParts.join("");

        // Send any text from this turn to the client
        if (turnText) {
          yield { type: "text", content: turnText };
        }

        // Build model's response for conversation history
        const modelParts: Array<any> = [];
        if (turnText) {
          modelParts.push({ text: turnText });
        }
        for (const fc of functionCalls) {
          modelParts.push({
            functionCall: { name: fc.name, args: fc.args },
          });
        }
        if (modelParts.length > 0) {
          contents.push({ role: "model", parts: modelParts });
        }

        // No function calls — check if the response was truncated or the model
        // is stalling with explanations instead of calling tools
        if (functionCalls.length === 0) {
          const wasTruncated =
            finishReason === "MAX_TOKENS" || finishReason === "RECITATION";
          const looksIncomplete =
            turnText &&
            /(?:here'?s?\s+the|proposed\s+change|I'll\s+now|I\s+will\s+now|let\s+me\s+now|```\s*$)/i.test(
              turnText.trim()
            );

          if (wasTruncated || looksIncomplete) {
            // Notify client that we're retrying
            yield {
              type: "status" as const,
              statusText: "Generating changes...",
            };

            // Nudge the model to stop explaining and just call the tool
            contents.push({
              role: "user",
              parts: [
                {
                  text: "Do not repeat your explanation. Call the proposeChanges tool NOW with the file changes. Be direct — no text, just the tool call.",
                },
              ],
            });
            continue; // retry the turn instead of exiting
          }

          break;
        }

        // Execute function calls
        const functionResponseParts: Array<any> = [];

        for (const fc of functionCalls) {
          // Notify client
          yield {
            type: "tool_call" as const,
            toolCall: { name: fc.name, args: fc.args },
          };

          // Execute the tool
          let result = "Unknown tool";
          if (onToolCall) {
            result = await onToolCall(fc.name, fc.args);
          }

          // If proposeChanges, yield code changes to the client
          if (fc.name === "proposeChanges" && fc.args?.changes) {
            const changes = fc.args.changes as CodeChange[];
            for (const change of changes) {
              yield { type: "code_change" as const, codeChange: change };
            }
          }

          functionResponseParts.push({
            functionResponse: {
              name: fc.name,
              response: { result },
            },
          });
        }

        // Send function responses back to Gemini
        contents.push({
          role: "user",
          parts: functionResponseParts,
        });
      }

      yield { type: "done" };
    } catch (error) {
      console.error("AI Agent error:", error);
      yield {
        type: "error",
        error:
          error instanceof Error ? error.message : "AI generation failed",
      };
    }
  }

  return { chat };
}

function buildRepoContext(context: AgentContext): string {
  const treeStr = context.repoTree
    .filter((f) => f.type === "blob")
    .map((f) => `  ${f.path} (${f.size || "?"}b)`)
    .join("\n");

  let contextStr = `## Repository: ${context.repoFullName}\n`;
  contextStr += `Branch: ${context.defaultBranch}\n\n`;
  contextStr += `## File Structure:\n${treeStr}\n`;

  if (context.fileContents.size > 0) {
    contextStr += "\n## File Contents (already loaded):\n";
    for (const [path, content] of context.fileContents) {
      contextStr += `\n### ${path}\n\`\`\`\n${content}\n\`\`\`\n`;
    }
  }

  return contextStr;
}
