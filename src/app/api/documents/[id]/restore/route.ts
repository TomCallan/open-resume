import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSql } from "lib/db";
import { buildVersionEntry } from "lib/documents";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const doc = await sql`
    SELECT 1 FROM documents WHERE id = ${params.id} AND user_id = ${userId}
  `;
  if (doc.length === 0) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const version = Number(body?.version);
  if (!Number.isInteger(version) || version < 1) {
    return NextResponse.json(
      { error: "a positive integer version is required" },
      { status: 400 }
    );
  }
  const snapshots = await sql`
    SELECT resume, settings FROM versions
    WHERE document_id = ${params.id} AND version = ${version}
  `;
  if (snapshots.length === 0) {
    return NextResponse.json({ error: "version not found" }, { status: 404 });
  }
  const snapshot = snapshots[0];
  const [{ next }] = await sql`
    SELECT COALESCE(MAX(version), 0) + 1 AS next FROM versions WHERE document_id = ${params.id}
  `;
  const restored = buildVersionEntry(
    next,
    snapshot.resume,
    snapshot.settings,
    `Restored v${version}`
  );
  await sql`
    INSERT INTO versions (document_id, version, resume, settings, name, created_at)
    VALUES (${params.id}, ${restored.version}, ${restored.resume}, ${restored.settings}, ${restored.name}, now())
  `;
  await sql`
    UPDATE documents
    SET resume = ${snapshot.resume}, settings = ${snapshot.settings}, updated_at = now()
    WHERE id = ${params.id} AND user_id = ${userId}
  `;
  return NextResponse.json({
    version: restored.version,
    resume: snapshot.resume,
    settings: snapshot.settings,
  });
}
