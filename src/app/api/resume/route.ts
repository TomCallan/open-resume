import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSql } from "../../../lib/db";

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sql = getSql();
  const rows = await sql`
    SELECT resume, settings, updated_at
    FROM resumes WHERE user_id = ${userId}
  `;
  if (rows.length === 0) {
    return NextResponse.json({ resume: null });
  }
  return NextResponse.json({
    resume: rows[0].resume,
    settings: rows[0].settings,
    updatedAt: rows[0].updated_at,
  });
}

export async function PATCH(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body || typeof body.resume !== "object" || typeof body.settings !== "object") {
    return NextResponse.json(
      { error: "resume and settings objects are required" },
      { status: 400 }
    );
  }
  const sql = getSql();
  await sql`
    INSERT INTO resumes (user_id, resume, settings, updated_at)
    VALUES (${userId}, ${body.resume}, ${body.settings}, now())
    ON CONFLICT (user_id)
    DO UPDATE SET
      resume = EXCLUDED.resume,
      settings = EXCLUDED.settings,
      updated_at = now()
  `;
  return NextResponse.json({ ok: true });
}