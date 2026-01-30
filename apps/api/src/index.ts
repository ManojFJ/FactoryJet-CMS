import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./types";
import { authRoutes } from "./routes/auth";
import { projectRoutes } from "./routes/projects";
import { chatRoutes } from "./routes/chat";
export type AppType = typeof app;

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin, // Allow the requesting origin in dev
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "codecraft-api" }));

// Routes
app.route("/auth", authRoutes);
app.route("/projects", projectRoutes);
app.route("/chat", chatRoutes);

export default app;
