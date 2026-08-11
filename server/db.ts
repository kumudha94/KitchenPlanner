import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool);

// Lightweight, idempotent additive schema sync. This project uses `drizzle-kit push`
// for schema changes rather than versioned migrations; this covers the case where
// `db:push` can't reach the database from the dev environment but the deployed
// server can (e.g. a restrictive dev sandbox network). Safe to run on every boot.
export async function ensureSchema(): Promise<void> {
  await pool.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time_minutes integer`);
  await pool.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_url varchar(500)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS grocery_items (
      id serial PRIMARY KEY,
      name varchar(150) NOT NULL,
      quantity varchar(50),
      checked boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prep_tasks (
      id serial PRIMARY KEY,
      description varchar(200) NOT NULL,
      for_date varchar(10) NOT NULL,
      checked boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
}
