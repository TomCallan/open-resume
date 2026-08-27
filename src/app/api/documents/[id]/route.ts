import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSql } from "lib/db";

// Dynamic route segments in Next 13.5 are passed to handlers.
function getBodyOrEmpty(req: Request) {
  return req.json().catch(() => ({}));
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, resume, settings, updated_at FROM documents
    WHERE id = ${params.id} AND user_id = ${userId}
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: rows[0].id,
    name: rows[0].name,
    resume: rows[0].resume,
    settings: rows[0].settings,
    updatedAt: rows[0].updated_at,
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await getBodyOrEmpty(req);
  if (typeof body.resume === "undefined" && typeof body.settings === "undefined" && typeof body.name === "undefined") {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }
  if (body.resume != null && (typeof body.resume !== "object" || Array.isArray(body.resume))) {
    return NextResponse.json({ error: "invalid resume" }, { status: 400 });
  }
  if (body.settings != null && (typeof body.settings !== "object" || Array.isArray(body.settings))) {
    return NextResponse.json({ error: "invalid settings" }, { status: 400 });
  }
  const sql = getSql();
  const hasDoc = await sql`
    SELECT 1 FROM documents WHERE id = ${params.id} AND user_id = ${userId}
  `;
  if (hasDoc.length === 0) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const current = await sql`
    SELECT resume, settings, name FROM documents WHERE id = ${params.id} AND user_id = ${userId}
  `;
  const nextResume = body.resume ?? current[0].resume;
  const nextSettings = body.settings ?? current[0].settings;
  const nextName = body.name != null ? String(body.name).trim() || current[0].name : current[0].name;
  await sql`
    UPDATE documents
    SET resume = ${nextResume}, settings = ${nextSettings}, name = ${nextName}, updated_at = now()
    WHERE id = ${params.id} AND user_id = ${userId}
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const exists = await sql`
    SELECT 1 FROM documents WHERE id = ${params.id} AND user_id = ${userId}
  `;
  if (exists.length === 0) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  await sql`DELETE FROM versions WHERE document_id = ${params.id}`;
  await sql`DELETE FROM documents WHERE id = ${params.id} AND user_id = ${userId}`;
  return NextResponse.json({ ok: true });
}