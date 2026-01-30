import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { GitHub } from "arctic";
import { eq } from "drizzle-orm";
import { users, githubTokens } from "@codecraft/db";
import type { Env } from "../types";
import { getDb } from "../lib/db";
import { encrypt } from "../lib/crypto";
import { createSession, getSession, deleteSession } from "../lib/session";
import { nanoid } from "../lib/nanoid";
import { requireAuth } from "../middleware/auth";

export const authRoutes = new Hono<{ Bindings: Env }>();

// Initiate GitHub OAuth
authRoutes.get("/github", async (c) => {
  const github = new GitHub(c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET, null);
  const state = nanoid(32);
  const scopes = ["read:user", "user:email", "repo"];
  const url = github.createAuthorizationURL(state, scopes);

  // Store state in a short-lived cookie for CSRF protection
  const isProduction = c.env.ENVIRONMENT === "production";
  setCookie(c, "github_oauth_state", state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });

  return c.redirect(url.toString());
});

// GitHub OAuth callback
authRoutes.get("/github/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  // Verify CSRF state
  const cookies = c.req.header("Cookie") || "";
  const storedState = cookies
    .split(";")
    .find((c) => c.trim().startsWith("github_oauth_state="))
    ?.split("=")[1]
    ?.trim();

  if (!code || !state || state !== storedState) {
    return c.json({ error: "Invalid OAuth state" }, 400);
  }

  const github = new GitHub(c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET, null);

  try {
    // Exchange code for tokens
    const tokens = await github.validateAuthorizationCode(code);
    const accessToken = tokens.accessToken();

    // Fetch GitHub user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "CodeCraft-App",
      },
    });

    if (!userResponse.ok) {
      return c.json({ error: "Failed to fetch GitHub user" }, 500);
    }

    const githubUser = (await userResponse.json()) as {
      id: number;
      login: string;
      email: string | null;
      name: string | null;
      avatar_url: string;
    };

    // Fetch email if not public
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await fetch(
        "https://api.github.com/user/emails",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "CodeCraft-App",
          },
        }
      );
      if (emailsResponse.ok) {
        const emails = (await emailsResponse.json()) as Array<{
          email: string;
          primary: boolean;
        }>;
        email = emails.find((e) => e.primary)?.email || emails[0]?.email || null;
      }
    }

    const db = getDb(c.env);

    // Upsert user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.githubId, githubUser.id))
      .limit(1);

    let userId: string;

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      // Update user info
      await db
        .update(users)
        .set({
          name: githubUser.name || githubUser.login,
          email,
          avatarUrl: githubUser.avatar_url,
        })
        .where(eq(users.id, userId));
    } else {
      userId = nanoid();
      await db.insert(users).values({
        id: userId,
        githubId: githubUser.id,
        name: githubUser.name || githubUser.login,
        email,
        avatarUrl: githubUser.avatar_url,
      });
    }

    // Encrypt and store GitHub token
    const encryptedToken = await encrypt(accessToken, c.env.ENCRYPTION_KEY);

    await db
      .insert(githubTokens)
      .values({
        userId,
        accessTokenEncrypted: encryptedToken,
        scope: "read:user,user:email,repo",
      })
      .onConflictDoUpdate({
        target: githubTokens.userId,
        set: {
          accessTokenEncrypted: encryptedToken,
          scope: "read:user,user:email,repo",
          updatedAt: new Date(),
        },
      });

    // Create session
    await createSession(db, userId, c as any);

    // Clear OAuth state cookie (use deleteCookie to avoid overwriting session cookie)
    deleteCookie(c, "github_oauth_state", {
      path: "/",
    });

    // Redirect to app
    return c.redirect(c.env.APP_URL || "/");
  } catch (error) {
    console.error("OAuth callback error:", error);
    return c.json({ error: "Authentication failed" }, 500);
  }
});

// Get current user
authRoutes.get("/me", async (c) => {
  const result = await getSession(c as any);
  if (!result) {
    return c.json({ user: null });
  }

  return c.json({
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      avatarUrl: result.user.avatarUrl,
      plan: result.user.plan,
    },
  });
});

// Logout
authRoutes.post("/logout", async (c) => {
  await deleteSession(c as any);
  return c.json({ ok: true });
});
