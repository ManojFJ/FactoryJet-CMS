import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { sessions, users } from "@codecraft/db";
import type { Context } from "hono";
import type { Env } from "../types";
import type { Database } from "./db";
import { getDb } from "./db";

const SESSION_COOKIE = "codecraft_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSession(
  db: Database,
  userId: string,
  c: Context<{ Bindings: Env }>
): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  const isProduction = c.env.ENVIRONMENT === "production";

  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return sessionId;
}

export async function getSession(c: Context<{ Bindings: Env }>) {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) return null;

  const db = getDb(c.env);
  const result = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (result.length === 0) return null;

  const { session, user } = result[0];

  // Check expiry
  if (session.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    deleteCookie(c, SESSION_COOKIE);
    return null;
  }

  return { session, user };
}

export async function deleteSession(c: Context<{ Bindings: Env }>) {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) return;

  const db = getDb(c.env);
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  deleteCookie(c, SESSION_COOKIE);
}
