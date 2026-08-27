import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { getSql } from "lib/db";
import { duplicateName } from "lib/documents";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const rows = await sql`
    SELECT name, resume, settings FROM documents WHERE id = ${params.id} AND user_id = ${userId}
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const id = randomUUID();
  await sql`
    INSERT INTO documents (id, user_id, name, resume, settings, updated_at)
    VALUES (${id}, ${userId}, ${duplicateName(rows[0].name)}, ${rows[0].resume}, ${rows[0].settings}, now())
  `;
  return NextResponse.json({ id });
}