import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSql } from "lib/db";

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sql = getSql();
  const rows = await sql`
    SELECT version, name, created_at
    FROM versions WHERE user_id = ${userId}
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

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : null;

  const sql = getSql();

  // Snapshot the current working copy currently stored on the server.
  const current = await sql`
    SELECT resume, settings FROM resumes WHERE user_id = ${userId}
  `;
  if (current.length === 0) {
    return NextResponse.json(
      { error: "No resume to snapshot yet" },
      { status: 400 }
    );
  }

  const [{ next }] = await sql`
    SELECT COALESCE(MAX(version), 0) + 1 AS next
    FROM versions WHERE user_id = ${userId}
  `;

  await sql`
    INSERT INTO versions (user_id, version, resume, settings, name, created_at)
    VALUES (${userId}, ${next}, ${current[0].resume}, ${current[0].settings}, ${name}, now())
  `;

  return NextResponse.json({ version: next });
}