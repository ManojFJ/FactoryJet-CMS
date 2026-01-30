import { createMiddleware } from "hono/factory";
import type { Env } from "../types";
import { getSession } from "../lib/session";

type AuthEnv = {
  Bindings: Env;
  Variables: {
    userId: string;
    user: {
      id: string;
      githubId: number;
      email: string | null;
      name: string;
      avatarUrl: string | null;
      plan: string;
    };
  };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const result = await getSession(c as any);
  if (!result) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("userId", result.user.id);
  c.set("user", result.user);
  await next();
});
