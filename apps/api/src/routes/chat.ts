import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { eq, and, desc } from "drizzle-orm";
import {
  conversations,
  messages,
  projects,
} from "@codecraft/db";
import { sendMessageSchema } from "@codecraft/shared";
import type { Env } from "../types";
import { getDb } from "../lib/db";
import { getSession } from "../lib/session";
import { requireAuth } from "../middleware/auth";
import { nanoid } from "../lib/nanoid";
import { getGitHubToken, fetchRepoTree, fetchFileContent } from "../lib/github";
import { createAIAgent, type AgentContext } from "../lib/ai-agent";

export const chatRoutes = new Hono<{ Bindings: Env }>();

// List conversations for a project
chatRoutes.get("/conversations/:projectId", requireAuth, async (c) => {
  const userId = c.get("userId");
  const projectId = c.req.param("projectId");
  const db = getDb(c.env);

  // Verify project belongs to user
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (project.length === 0) {
    return c.json({ error: "Project not found" }, 404);
  }

  const convos = await db
    .select()
    .from(conversations)
    .where(eq(conversations.projectId, projectId))
    .orderBy(desc(conversations.updatedAt));

  return c.json({ conversations: convos });
});

// Get messages for a conversation
chatRoutes.get("/messages/:conversationId", requireAuth, async (c) => {
  const userId = c.get("userId");
  const conversationId = c.req.param("conversationId");
  const db = getDb(c.env);

  // Verify conversation belongs to user
  const convo = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    )
    .limit(1);

  if (convo.length === 0) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return c.json({ messages: msgs });
});

// Send a message and stream AI response via SSE
chatRoutes.post("/send", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { projectId, content, conversationId: existingConvoId } = parsed.data;
  const db = getDb(c.env);

  // Verify project belongs to user
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (project.length === 0) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Get GitHub token
  const token = await getGitHubToken(db, userId, c.env.ENCRYPTION_KEY);
  if (!token) {
    return c.json({ error: "GitHub token not found" }, 401);
  }

  // Create or get conversation
  let conversationId = existingConvoId;
  if (!conversationId) {
    conversationId = nanoid();
    await db.insert(conversations).values({
      id: conversationId,
      projectId,
      userId,
      title: content.slice(0, 100),
    });
  }

  // Save user message
  const userMsgId = nanoid();
  await db.insert(messages).values({
    id: userMsgId,
    conversationId,
    role: "user",
    content,
  });

  // Fetch conversation history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  // Fetch repo tree for context
  const repoTree = await fetchRepoTree(
    token,
    project[0].repoFullName,
    project[0].defaultBranch
  );

  // Build agent context
  const agentContext: AgentContext = {
    repoFullName: project[0].repoFullName,
    defaultBranch: project[0].defaultBranch,
    repoTree,
    fileContents: new Map(),
    conversationHistory: history
      .filter((m) => m.id !== userMsgId)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content,
      })),
  };

  // Stream AI response via SSE
  return streamSSE(c, async (stream) => {
    // Send conversation ID so frontend can track it
    await stream.writeSSE({
      event: "conversation",
      data: JSON.stringify({ type: "conversation", conversationId }),
    });

    const agent = createAIAgent(c.env.GEMINI_API_KEY);
    let fullResponse = "";
    const codeChanges: any[] = [];

    const onToolCall = async (
      name: string,
      args: Record<string, unknown>
    ): Promise<string> => {
      if (name === "readFile") {
        const path = args.path as string;
        try {
          const fileContent = await fetchFileContent(
            token,
            project[0].repoFullName,
            path,
            project[0].defaultBranch
          );
          agentContext.fileContents.set(path, fileContent);
          return fileContent;
        } catch {
          return `Error: Could not read file ${path}`;
        }
      }

      if (name === "searchFiles") {
        const pattern = (args.pattern as string).toLowerCase();
        const matches = repoTree
          .filter(
            (f) =>
              f.type === "blob" && f.path.toLowerCase().includes(pattern)
          )
          .map((f) => f.path);
        return matches.length > 0
          ? `Found files:\n${matches.join("\n")}`
          : "No matching files found";
      }

      if (name === "proposeChanges") {
        const changes = (args as any).changes;
        if (changes) codeChanges.push(...changes);
        return "Changes proposed successfully. The user will review and can apply them with one click.";
      }

      return "Unknown tool";
    };

    try {
      for await (const event of agent.chat(
        content,
        agentContext,
        onToolCall
      )) {
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
        });

        if (event.type === "text" && event.content) {
          fullResponse += event.content;
        }
      }

      // Save assistant response with a real ID
      const assistantMsgId = nanoid();
      await db.insert(messages).values({
        id: assistantMsgId,
        conversationId: conversationId!,
        role: "assistant",
        content: fullResponse,
        codeChanges: codeChanges.length > 0 ? codeChanges : null,
      });

      // Send the real message ID so the frontend can use it for Apply
      await stream.writeSSE({
        event: "message_saved",
        data: JSON.stringify({
          type: "message_saved",
          messageId: assistantMsgId,
          conversationId,
          hasCodeChanges: codeChanges.length > 0,
        }),
      });

      // Update conversation timestamp
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId!));
    } catch (error) {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : "Stream failed",
        }),
      });
    }
  });
});

// Apply code changes (commit to GitHub)
chatRoutes.post("/apply", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const { projectId, messageId, commitMessage } = body as {
    projectId: string;
    messageId: string;
    commitMessage?: string;
  };

  if (!projectId || !messageId) {
    return c.json({ error: "projectId and messageId required" }, 400);
  }

  const db = getDb(c.env);

  // Verify project
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (project.length === 0) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Get the message with code changes
  const msg = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (msg.length === 0 || !msg[0].codeChanges) {
    return c.json({ error: "No code changes found in message" }, 404);
  }

  // Get GitHub token
  const token = await getGitHubToken(db, userId, c.env.ENCRYPTION_KEY);
  if (!token) {
    return c.json({ error: "GitHub token not found" }, 401);
  }

  // Import createMultiFileCommit dynamically to avoid circular deps
  const { createMultiFileCommit } = await import("../lib/github");

  const changes = msg[0].codeChanges as Array<{
    path: string;
    action: string;
    content?: string;
  }>;

  const gitChanges = changes.map((ch) => ({
    path: ch.path,
    content: ch.action === "delete" ? null : (ch.content || ""),
  }));

  const result = await createMultiFileCommit(
    token,
    project[0].repoFullName,
    project[0].defaultBranch,
    commitMessage || "CodeCraft: Apply AI-generated changes",
    gitChanges
  );

  return c.json({
    ok: true,
    commit: { sha: result.sha, url: result.url },
  });
});
