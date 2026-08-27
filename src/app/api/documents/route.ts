import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { getSql } from "lib/db";
import { initialResumeState } from "lib/redux/resumeSlice";
import { initialSettings } from "lib/redux/settingsSlice";

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, updated_at FROM documents
    WHERE user_id = ${userId} ORDER BY updated_at DESC
  `;
  return NextResponse.json({
    documents: rows.map((r) => ({ id: r.id, name: r.name, updatedAt: r.updated_at })),
  });
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim()
      : "My Resume";
  const resume = body?.resume ?? JSON.parse(JSON.stringify(initialResumeState));
  const settings = body?.settings ?? JSON.parse(JSON.stringify(initialSettings));
  if (!resume || Array.isArray(resume) || !settings || Array.isArray(settings)) {
    return NextResponse.json({ error: "invalid resume or settings" }, { status: 400 });
  }
  const id = randomUUID();
  const sql = getSql();
  await sql`
    INSERT INTO documents (id, user_id, name, resume, settings, updated_at)
    VALUES (${id}, ${userId}, ${name}, ${resume}, ${settings}, now())
  `;
  return NextResponse.json({ id, name });
}