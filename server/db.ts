import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dns from "node:dns";

// Some environments (this project's dev sandbox included) have no IPv6
// route at all, but Node's default DNS result order can still hand back
// an IPv6 address first for hosts that publish both — every connection
// then hangs until it times out rather than falling back to the (working)
// IPv4 address. Preferring IPv4 first is a safe no-op anywhere IPv6
// actually works, so this isn't dev-environment-specific code.
dns.setDefaultResultOrder("ipv4first");

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
  await pool.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS servings integer NOT NULL DEFAULT 4`);
  await pool.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS grocery_items (
      id serial PRIMARY KEY,
      name varchar(150) NOT NULL,
      quantity varchar(50),
      checked boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS category varchar(40) NOT NULL DEFAULT 'Other'`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pantry_items (
      id serial PRIMARY KEY,
      name varchar(150) NOT NULL,
      category varchar(40) NOT NULL DEFAULT 'Other',
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`ALTER TABLE pantry_items ADD COLUMN IF NOT EXISTS quantity varchar(50)`);
  await pool.query(`ALTER TABLE pantry_items ADD COLUMN IF NOT EXISTS cost numeric(10, 2)`);
  await pool.query(`ALTER TABLE pantry_items ADD COLUMN IF NOT EXISTS expiry_date varchar(10)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reminders (
      id serial PRIMARY KEY,
      title varchar(150) NOT NULL,
      hour integer NOT NULL,
      minute integer NOT NULL,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);

  // Prep Log was removed as a standalone feature — it never connected to the
  // rest of the app and the same "get ready to cook" need is better served by
  // the recipe itself plus the grocery list. Dropping the now-orphaned table.
  await pool.query(`DROP TABLE IF EXISTS prep_tasks`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id serial PRIMARY KEY,
      email varchar(255) NOT NULL,
      username varchar(60) NOT NULL,
      notifications_enabled boolean NOT NULL DEFAULT false,
      newsletter_opt_in boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id serial PRIMARY KEY,
      email varchar(255) NOT NULL,
      code varchar(6) NOT NULL,
      expires_at timestamp NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
}
