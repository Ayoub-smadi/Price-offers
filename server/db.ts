import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
// Log which DB is being used (host only, no credentials)
try {
  const host = new URL(connectionString!.replace('postgresql://', 'https://')).hostname;
  console.log('[db] connecting to:', host);
} catch {}

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const needsSsl =
  connectionString.includes("neon.tech") ||
  connectionString.includes("sslmode=require") ||
  !!process.env.NEON_DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });
