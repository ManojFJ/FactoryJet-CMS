import { drizzle } from "drizzle-orm/d1";
import * as schema from "@codecraft/db";
import type { Env } from "../types";

export function getDb(env: Env) {
  return drizzle(env.DB, { schema });
}

export type Database = ReturnType<typeof getDb>;
