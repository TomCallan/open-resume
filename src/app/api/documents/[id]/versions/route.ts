import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSql } from "lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const owned = await sql`
    SELECT 1 FROM documents WHERE id = ${params.id} AND user_id = ${userId}
  `;
  if (owned.length === 0) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const rows = await sql`
    SELECT version, name, created_at FROM versions
    WHERE document_id = ${params.id}
    ORDER BY version DESC
  `;
  return NextResponse.json({
    versions: rows.map((r) => ({
      version: r.version,
      name: r.name,
      createdAt: r.created_at,
    })),
  });
}

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
  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim()
      : null;
  const hasBodyState =
    body && (body.resume !== undefined || body.settings !== undefined);
  if (hasBodyState) {
    const bad = (v: unknown) =>
      v === null || typeof v !== "object" || Array.isArray(v);
    if (bad(body.resume) || bad(body.settings)) {
      return NextResponse.json(
        { error: "invalid resume or settings" },
        { status: 400 }
      );
    }
  }
  const current = hasBodyState
    ? [{ resume: body.resume, settings: body.settings }]
    : await sql`
        SELECT resume, settings FROM documents WHERE id = ${params.id} AND user_id = ${userId}
      `;
  if (current.length === 0) {
    return NextResponse.json(
      { error: "No document to snapshot" },
      { status: 400 }
    );
  }
  const [{ next }] = await sql`
    SELECT COALESCE(MAX(version), 0) + 1 AS next FROM versions WHERE document_id = ${params.id}
  `;
  await sql`
    INSERT INTO versions (document_id, version, resume, settings, name, created_at)
    VALUES (${params.id}, ${next}, ${current[0].resume}, ${current[0].settings}, ${name}, now())
  `;
  return NextResponse.json({ version: next });
}
