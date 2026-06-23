import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const FALLBACK_URL = "postgresql://neondb_owner:npg_n3tzjUGHuMJ0@ep-aged-moon-adhbxmp5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

const rawConnection =
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL ||
  FALLBACK_URL;

// Strip parameters unsupported by the pg driver (e.g. channel_binding)
function sanitizeConnectionString(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

const connectionString = sanitizeConnectionString(rawConnection);

try {
  const host = new URL(connectionString.replace('postgresql://', 'https://')).hostname;
  console.log('[db] connecting to:', host);
} catch {}

const needsSsl =
  connectionString.includes("neon.tech") ||
  connectionString.includes("sslmode=require") ||
  !!process.env.NEON_DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });
