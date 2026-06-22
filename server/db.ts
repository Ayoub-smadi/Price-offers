import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const rawConnection = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!rawConnection) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

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
