import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Development environments provide DATABASE_URL; the deployment provides
// NEON_DATABASE_URL. Accept either so the app runs unchanged in both.
const connectionString = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL or NEON_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });

/**
 * Idempotent schema provisioning so a fresh database (or a deployment that has
 * never run `npm run db:push`) works on first boot. Mirrors shared/schema.ts.
 */
export async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mint_events (
      id SERIAL PRIMARY KEY,
      block_number INTEGER NOT NULL,
      transaction_hash TEXT NOT NULL UNIQUE,
      minter TEXT NOT NULL,
      "timestamp" TIMESTAMP NOT NULL,
      gas_used TEXT,
      gas_price TEXT,
      difficulty TEXT,
      expected_attempts TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_states (
      id SERIAL PRIMARY KEY,
      chain TEXT NOT NULL UNIQUE,
      last_processed_block INTEGER NOT NULL DEFAULT 0,
      last_successful_sync_at TIMESTAMP,
      last_attempt_at TIMESTAMP,
      last_error TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
}
