import { z } from "zod";

export const createProjectSchema = z.object({
  repoFullName: z.string().min(3).regex(/^[^/]+\/[^/]+$/),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  projectId: z.string(),
  content: z.string().min(1).max(10000),
});

export const createConversationSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(200).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
