import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSql } from "lib/db";
import { buildRestoredEntry } from "lib/resume-versions";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const version = Number(body?.version);
  if (!Number.isInteger(version) || version < 1) {
    return NextResponse.json(
      { error: "a positive integer version is required" },
      { status: 400 }
    );
  }

  const sql = getSql();
  const snapshots = await sql`
    SELECT resume, settings FROM versions
    WHERE user_id = ${userId} AND version = ${version}
  `;
  if (snapshots.length === 0) {
    return NextResponse.json({ error: "version not found" }, { status: 404 });
  }

  const snapshot = snapshots[0];

  // Non-destructive: first record the restore itself as a new version, then rewind current.
  const [{ next }] = await sql`
    SELECT COALESCE(MAX(version), 0) + 1 AS next
    FROM versions WHERE user_id = ${userId}
  `;
  const restoredEntry = buildRestoredEntry(next, snapshot.resume, snapshot.settings);
  await sql`
    INSERT INTO versions (user_id, version, resume, settings, name, created_at)
    VALUES (${userId}, ${restoredEntry.version}, ${restoredEntry.resume}, ${restoredEntry.settings}, ${restoredEntry.name}, now())
  `;

  await sql`
    INSERT INTO resumes (user_id, resume, settings, updated_at)
    VALUES (${userId}, ${snapshot.resume}, ${snapshot.settings}, now())
    ON CONFLICT (user_id)
    DO UPDATE SET
      resume = EXCLUDED.resume,
      settings = EXCLUDED.settings,
      updated_at = now()
  `;

  return NextResponse.json({
    version: restoredEntry.version,
    resume: snapshot.resume,
    settings: snapshot.settings,
  });
}