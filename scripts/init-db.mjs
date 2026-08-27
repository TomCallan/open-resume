import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

const sql = neon(process.env.DATABASE_URL);

// Detect the legacy single-resume schema before creating the new document-keyed tables.
const [{ has_tbl: hasLegacyResumes }] = await sql`
  SELECT to_regclass('public.resumes') IS NOT NULL AS has_tbl
`;

// Legacy versions are keyed by (user_id, version). The new table below shares the
// `versions` name but is keyed by document_id, so snapshot the legacy rows now —
// before the old table is dropped and the new one is created.
const legacyVersionsByUser = new Map();
if (hasLegacyResumes) {
  const [{ has_tbl: hasLegacyVersions }] = await sql`
    SELECT to_regclass('public.versions') IS NOT NULL AS has_tbl
  `;
  if (hasLegacyVersions) {
    const rows = await sql`
      SELECT user_id, version, resume, settings, name, created_at FROM versions
    `;
    for (const row of rows) {
      if (!legacyVersionsByUser.has(row.user_id)) legacyVersionsByUser.set(row.user_id, []);
      legacyVersionsByUser.get(row.user_id).push(row);
    }
    // Old schema no longer needed; its data lives in legacyVersionsByUser.
    await sql`DROP TABLE IF EXISTS versions`;
  }
}

await sql`
  CREATE TABLE IF NOT EXISTS documents (
    id         UUID PRIMARY KEY,
    user_id    TEXT NOT NULL,
    name       TEXT NOT NULL,
    resume     JSONB NOT NULL,
    settings   JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_documents_user ON documents (user_id)`;
await sql`
  CREATE TABLE IF NOT EXISTS versions (
    document_id UUID NOT NULL,
    version     INTEGER NOT NULL,
    resume      JSONB NOT NULL,
    settings    JSONB NOT NULL,
    name        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (document_id, version)
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_versions_document ON versions (document_id)`;

// Carry each legacy single-resume row into a document, re-keying its versions.
if (hasLegacyResumes) {
  const legacy = await sql`
    SELECT user_id, resume, settings, updated_at FROM resumes
  `;
  for (const row of legacy) {
    const id = randomUUID();
    await sql`
      INSERT INTO documents (id, user_id, name, resume, settings, updated_at)
      VALUES (${id}, ${row.user_id}, 'My Resume', ${row.resume}, ${row.settings}, ${row.updated_at})
    `;
    for (const v of legacyVersionsByUser.get(row.user_id) ?? []) {
      await sql`
        INSERT INTO versions (document_id, version, resume, settings, name, created_at)
        VALUES (${id}, ${v.version}, ${v.resume}, ${v.settings}, ${v.name}, ${v.created_at})
      `;
    }
  }
  await sql`DROP TABLE IF EXISTS resumes`;
}

console.log("Schema is up to date.");