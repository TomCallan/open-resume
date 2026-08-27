import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
await sql`
  CREATE TABLE IF NOT EXISTS resumes (
    user_id TEXT PRIMARY KEY,
    resume JSONB NOT NULL,
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
await sql`
  CREATE TABLE IF NOT EXISTS versions (
    user_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    resume JSONB NOT NULL,
    settings JSONB NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, version)
  )
`;
console.log("Schema is up to date.");
