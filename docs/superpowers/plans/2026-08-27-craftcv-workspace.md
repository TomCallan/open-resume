# CraftCV Document Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn CraftCV into a FlowCV-style document workspace: multiple resumes per user, each imported, drafted, designed, and versioned in one continuous flow.

**Architecture:** Replace the single `resumes`/`user_id`-keyed `versions` schema with a document model (`documents` + per-document `versions`). Add a `/api/documents` route family (ownership enforced by `user_id`). Add a `/documents` dashboard and make the builder edit a single `?document=` id. Rework the editor into section-nav + active form + collapsible live preview with top-bar controls, a save-status indicator, and document-scoped versions.

**Tech Stack:** Next.js 13.5 App Router, React 18, TypeScript, `@clerk/nextjs@^5` (sync `auth()`), `@neondatabase/serverless` (`getSql()`), Redux Toolkit, react-pdf, pdfjs-dist (worker already self-hosted at `/pdfjs/pdf.worker.min.js`).

## Global Constraints

- Clerk v5: `auth()` from `@clerk/nextjs/server` is synchronous → `const { userId } = auth();`, no await.
- `lib/*` alias resolves to `src/app/lib/*` (tsconfig `baseUrl: ./src/app`). Shared modules live under `src/app/lib/`.
- `getSql()` lazy Neon client from `src/app/lib/db.ts` (build-time safe). No Proxy.
- Every document/version query is scoped by the owner: `documents.user_id = ${userId}` (or joined through the document).
- Non-destructive restore: old `versions` rows are never mutated; restore records a new `Restored vN` row.
- Existing helpers usable in code: `deepClone` (`lib/deep-clone`), `deepMerge` (`lib/deep-merge`), `initialResumeState`/`setResume` (`lib/redux/resumeSlice`), `initialSettings`/`setSettings`/`changeSettings` (`lib/redux/settingsSlice`), `Resume` (`lib/redux/types`), `Settings` (`lib/redux/settingsSlice`).
- Delete a document also deletes its versions.
- Keep existing jest suite green; `tsc --noEmit` and `npm run build` clean. Repo artifacts written in normal English.
- PDF import already fixed (worker self-hosted); do not regress it.

---

### Task 1: Document helpers + schema migration

**Files:**
- Create: `src/app/lib/documents.ts`
- Create: `src/app/lib/__tests__/documents.test.ts`
- Modify: `scripts/init-db.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `duplicateName(name: string): string` → `${name} (copy)`.
  - `buildVersionEntry(version: number, resume: unknown, settings: unknown, name: string): { version: number; resume: unknown; settings: unknown; name: string }`.
  - `scripts/init-db.mjs` creates `documents` and per-document `versions`, migrating legacy single-resume rows.

- [ ] **Step 1: Write the failing test**

`src/app/lib/__tests__/documents.test.ts`:

```ts
import { duplicateName, buildVersionEntry } from "lib/documents";

describe("duplicateName", () => {
  it("appends a copy suffix", () => {
    expect(duplicateName("My Resume")).toBe("My Resume (copy)");
  });
});

describe("buildVersionEntry", () => {
  it("frames a restore as a new version row", () => {
    expect(buildVersionEntry(4, { profile: {} }, { template: "modern" }, "Restored v2")).toEqual({
      version: 4,
      resume: { profile: {} },
      settings: { template: "modern" },
      name: "Restored v2",
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/app/lib/__tests__/documents.test.ts`
Expected: FAIL — module `lib/documents` not found.

- [ ] **Step 3: Implement the helpers**

`src/app/lib/documents.ts`:

```ts
export function duplicateName(name: string): string {
  return `${name} (copy)`;
}

export interface VersionEntry {
  version: number;
  resume: unknown;
  settings: unknown;
  name: string;
}

export function buildVersionEntry(
  version: number,
  resume: unknown,
  settings: unknown,
  name: string
): VersionEntry {
  return { version, resume, settings, name };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/app/lib/__tests__/documents.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 5: Update `scripts/init-db.mjs`**

Replace its body with the document schema + legacy migration:

```js
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function migrateLegacy() {
  // If the old single-resume table exists with data, carry each row into a document.
  const hasLegacy = await sql`
    SELECT to_regclass('public.resumes') IS NOT NULL AS has_tbl
  `;
  const { has_tbl: hasResumes } = hasLegacy[0];
  if (hasResumes) {
    const legacy = await sql`SELECT user_id, resume, settings, updated_at FROM resumes`;
    for (const row of legacy) {
      await sql`
        INSERT INTO documents (user_id, name, resume, settings, updated_at)
        VALUES (${row.user_id}, 'My Resume', ${row.resume}, ${row.settings}, ${row.updated_at})
      `;
      const [doc] = await sql`
        SELECT id FROM documents WHERE user_id = ${row.user_id} ORDER BY updated_at DESC LIMIT 1
      `;
      // Legacy versions keyed by (user_id, version) — re-key to the migrated document.
      const legacyVersions = await sql`
        SELECT * FROM versions WHERE user_id = ${row.user_id}
      `;
      for (const v of legacyVersions) {
        await sql`
          INSERT INTO versions (document_id, version, resume, settings, name, created_at)
          VALUES (${doc.id}, ${v.version}, ${v.resume}, ${v.settings}, ${v.name}, ${v.created_at})
        `;
      }
    }
    await sql`DROP TABLE IF EXISTS resumes`;
  }
  // Drop the old user_id-keyed versions table (its data was re-keyed above).
  await sql`
    DROP TABLE IF EXISTS public.versions
  `;
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

await migrateLegacy();
console.log("Schema is up to date.");
```

Note: `dropLegacy` order matters — migrate reads `resumes` and old `versions` BEFORE dropping. Run the output with `node --env-file=.env.local scripts/init-db.mjs` only in Task 9 (after deploy env is ready), or now if `.env.local` has a real `DATABASE_URL` and you have confirmed no production app is writing to legacy tables mid-run (safe here — the app was greenfield).

- [ ] **Step 6: Commit**

```bash
git add src/app/lib/documents.ts src/app/lib/__tests__/documents.test.ts scripts/init-db.mjs
git commit -m "feat: add document helpers and workspace schema migration"
```

---

### Task 2: Documents API (list, create, get, patch, delete, duplicate)

**Files:**
- Create: `src/app/api/documents/route.ts`
- Create: `src/app/api/documents/[id]/route.ts`
- Create: `src/app/api/documents/[id]/duplicate/route.ts`

**Interfaces:**
- Consumes: `getSql()` from `lib/db`, `duplicateName` from `lib/documents`.
- Produces:
  - `GET /api/documents` → `{ documents: [{ id, name, updatedAt }] }` desc by updated.
  - `POST /api/documents` body `{ name?, resume?, settings? }` → `{ id, name }`.
  - `GET /api/documents/[id]` → `{ id, name, resume, settings, updatedAt }` (404 not owned).
  - `PATCH /api/documents/[id]` body `{ resume?, settings?, name? }` → `{ ok: true }`.
  - `DELETE /api/documents/[id]` → `{ ok: true }`.
  - `POST /api/documents/[id]/duplicate` → `{ id }`.

- [ ] **Step 1: Create `src/app/api/documents/route.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/app/api/documents/[id]/route.ts`**

```ts
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
```

- [ ] **Step 3: Create `src/app/api/documents/[id]/duplicate/route.ts`**

```ts
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
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. (If the `[id]` dynamic handler signature complains about `params` under this Next version, adjust to the documented `(req, { params })` form the build accepts and note it.)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/documents
git commit -m "feat: add documents api (list/create/get/patch/delete/duplicate)"
```

---

### Task 3: Per-document versions + restore (replaces /api/resume*)

**Files:**
- Create: `src/app/api/documents/[id]/versions/route.ts`
- Create: `src/app/api/documents/[id]/restore/route.ts`
- Delete: `src/app/api/resume/route.ts`, `src/app/api/resume/versions/route.ts`, `src/app/api/resume/restore/route.ts`

**Interfaces:**
- Consumes: `getSql()`, `buildVersionEntry` from `lib/documents`.
- Produces:
  - `GET /api/documents/[id]/versions` → `{ versions: [{ version, name, createdAt }] }` desc.
  - `POST /api/documents/[id]/versions` body `{ name? }` → `{ version }` (snapshots current doc).
  - `POST /api/documents/[id]/restore` body `{ version }` → `{ version, resume, settings }`.
- **Produces (route removal):** the old `/api/resume*` handlers are removed; middleware will be updated in Task 5.

- [ ] **Step 1: Create `src/app/api/documents/[id]/versions/route.ts`**

```ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSql } from "lib/db";

async function ownedDoc(sql: (q: TemplateStringsArray) => Promise<any[]>, userId: string, id: string) {
  const rows = await sql`
    SELECT 1 FROM documents WHERE id = ${id} AND user_id = ${userId}
  `;
  return rows.length > 0;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const rows = await sql`
    SELECT version, name, created_at FROM versions
    WHERE document_id = ${params.id}
    ORDER BY version DESC
  `;
  return NextResponse.json({
    versions: rows.map((r) => ({ version: r.version, name: r.name, createdAt: r.created_at })),
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  if (!(await ownedDoc(sql, userId, params.id))) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : null;
  const current = await sql`
    SELECT resume, settings FROM documents WHERE id = ${params.id} AND user_id = ${userId}
  `;
  if (current.length === 0) {
    return NextResponse.json({ error: "No document to snapshot" }, { status: 400 });
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
```

- [ ] **Step 2: Create `src/app/api/documents/[id]/restore/route.ts`**

```ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSql } from "lib/db";
import { buildVersionEntry } from "lib/documents";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "a positive integer version is required" }, { status: 400 });
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
  const restored = buildVersionEntry(next, snapshot.resume, snapshot.settings, `Restored v${version}`);
  await sql`
    INSERT INTO versions (document_id, version, resume, settings, name, created_at)
    VALUES (${params.id}, ${restored.version}, ${restored.resume}, ${restored.settings}, ${restored.name}, now())
  `;
  await sql`
    UPDATE documents
    SET resume = ${snapshot.resume}, settings = ${snapshot.settings}, updated_at = now()
    WHERE id = ${params.id} AND user_id = ${userId}
  `;
  return NextResponse.json({ version: restored.version, resume: snapshot.resume, settings: snapshot.settings });
}
```

- [ ] **Step 3: Delete the old `/api/resume*` routes**

Run: `git rm src/app/api/resume/route.ts src/app/api/resume/versions/route.ts src/app/api/resume/restore/route.ts`

- [ ] **Step 4: Run the full suite (helpers unchanged, legacy test for buildVersionEntry still valid)**

Run: `npx tsc --noEmit && npm run test:ci`
Expected: clean; suite green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add per-document versions and restore; remove legacy resume api"
```

---

### Task 4: Documents dashboard + group import entry

**Files:**
- Create: `src/app/documents/page.tsx`
- Create: `src/app/components/DocumentsList.tsx`
- Modify: `src/middleware.ts` (add `/documents` to protected matcher)

**Interfaces:**
- Consumes: routes from Tasks 2–3; `parseResumeFromPdf` (`lib/parse-resume-from-pdf`), `initialSettings`/`initialResumeState`, `deepMerge`, `deepClone`.
- Produces: `/documents` dashboard with list, create blank, import PDF/JSON (parse → create → open), duplicate, delete; navigation to `/resume-builder?document={id}`.

- [ ] **Step 1: Protect `/documents` in middleware**

`src/middleware.ts` — change the matcher array:

```ts
const isProtectedRoute = createRouteMatcher([
  "/documents(.*)",
  "/resume-builder(.*)",
  "/api/documents(.*)",
]);
```

- [ ] **Step 2: Create `src/app/components/DocumentsList.tsx`**

```tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ResumeDropzone } from "components/ResumeDropzone";

interface DocSummary {
  id: string;
  name: string;
  updatedAt?: string;
}

export const DocumentsList = () => {
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const list = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (res.ok) setDocs(data.documents ?? []);
    } catch {
      setError("Could not load your resumes.");
    }
  }, []);

  useEffect(() => {
    void list();
  }, [list]);

  const createBlank = async () => {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Resume" }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/resume-builder?document=${data.id}`);
    }
  };

  const duplicate = async (id: string) => {
    const res = await fetch(`/api/documents/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      router.push(`/resume-builder?document=${data.id}`);
    }
  };

  const del = async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) await list();
  };

  const onImported = async (fileUrl: string) => {
    // Called back once the dropzone has parsed (see below).
    setError(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Resumes</h1>
        <button onClick={createBlank} className="btn-primary rounded-md px-4 py-2">
          New resume
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3">
            <Link href={`/resume-builder?document=${d.id}`} className="font-semibold text-gray-900 hover:underline">
              {d.name}
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <button onClick={() => duplicate(d.id)} className="text-blue-600 hover:underline">Duplicate</button>
              <button onClick={() => del(d.id)} className="text-red-600 hover:underline">Delete</button>
            </div>
          </div>
        ))}
        {docs.length === 0 && !error && (
          <p className="text-gray-500">No resumes yet. Create one below or import from a PDF/JSON file.</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Import from PDF/JSON</h2>
        <ResumeDropzone
          onFileUrlChange={(url) => url && onImported(url)}
          importIntoWorkspace={true}
        />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Support workspace import in `ResumeDropzone`**

`src/app/components/ResumeDropzone.tsx` — add a prop `importIntoWorkspace?: boolean` and change `onImportClick` so that when `importIntoWorkspace` is true it creates a document instead of saving to localStorage + redirecting. In the props type and destructure, add:

```ts
importIntoWorkspace?: boolean;
```

Then replace the PDF branch of `onImportClick` (the `parseResumeFromPdf` block) with:

```ts
    let resume: Resume;
    try {
      resume = await parseResumeFromPdf(file.fileUrl);
    } catch (err) {
      console.error("Failed to parse resume PDF", err);
      alert("Sorry, we couldn't parse this PDF. Single-column, text-based resumes work best.");
      return;
    }
    const settings = deepClone(initialSettings);
    if (importIntoWorkspace) {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Imported Resume", resume, settings }),
      });
      if (!res.ok) {
        alert("Could not save the imported resume.");
        return;
      }
      const data = await res.json();
      router.push(`/resume-builder?document=${data.id}`);
      return;
    }
    // legacy single-flow fallback (kept for the parser playground path)
    if (getHasUsedAppBefore()) {
      const sections = Object.keys(settings.formToShow) as ShowForm[];
      const sectionToFormToShow: Record<ShowForm, boolean> = {
        workExperiences: resume.workExperiences.length > 0,
        educations: resume.educations.length > 0,
        projects: resume.projects.length > 0,
        skills: resume.skills.descriptions.length > 0,
        custom: resume.custom.descriptions.length > 0,
      };
      for (const section of sections) settings.formToShow[section] = sectionToFormToShow[section];
    }
    saveStateToLocalStorage({ resume, settings });
    router.push("/resume-builder");
```

Note: the `DocumentsList` passes `importIntoWorkspace`; the JSON branch of `onImportClick` may also call the workspace create path — keep it symmetric: if `importIntoWorkspace`, POST to `/api/documents` with the parsed JSON too.

- [ ] **Step 4: Create `src/app/documents/page.tsx`**

```tsx
import { DocumentsList } from "components/DocumentsList";

export default function DocumentsPage() {
  return (
    <main>
      <DocumentsList />
    </main>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts src/app/documents src/app/components/DocumentsList.tsx src/app/components/ResumeDropzone.tsx
git commit -m "feat: add documents dashboard and workspace import"
```

---

### Task 5: Editor loads one document; autosave + versions scoped; nav + home copy

**Files:**
- Modify: `src/app/resume-builder/page.tsx`
- Modify: `src/app/lib/redux/hooks.tsx`
- Modify: `src/app/lib/redux/server-sync.ts`
- Modify: `src/app/components/TopNavBar.tsx`
- Modify: `src/app/page.tsx` (home copy)

**Interfaces:**
- Consumes: `useSearchParams` from `next/navigation`; routes from Tasks 2–3.
- Produces: the builder edits the `?document=` document; autosave/versions target that document; nav shows "My Resumes"; home copy fixed.

- [ ] **Step 1: Document-scoped hydrate + autosave in the client**

`src/app/lib/redux/hooks.tsx` — replace `useSetInitialStore` to accept and load a specific document:

```tsx
export const useSetInitialStore = (documentId: string | null) => {
  const dispatch = useAppDispatch();
  const { userId } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const loadServer = async (): Promise<boolean> => {
      if (!userId || !documentId) return false;
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return true;
          dispatch(setResume(deepMerge(initialResumeState, data.resume) as Resume));
          dispatch(setSettings(deepMerge(initialSettings, data.settings) as Settings));
          return true;
        }
      } catch {
        // fall to local cache
      }
      return false;
    };
    const init = async () => {
      const ok = await loadServer();
      if (ok || cancelled) return;
      const state = loadStateFromLocalStorage();
      if (!state) return;
      if (state.resume) dispatch(setResume(deepMerge(initialResumeState, state.resume) as Resume));
      if (state.settings) dispatch(setSettings(deepMerge(initialSettings, state.settings) as Settings));
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [userId, documentId, dispatch]);
};
```

`src/app/lib/redux/server-sync.ts` — make the sync target a document:

```ts
import type { RootState } from "lib/redux/store";

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let latest: { documentId: string | null; state: RootState } | null = null;

export const syncStateToServerDebounced = (documentId: string | null, state: RootState, delay = 500) => {
  if (!documentId) {
    saveStateToLocalStorageIgnored(state); // no-op; local autosave handled elsewhere
    return;
  }
  latest = { documentId, state };
  if (syncTimeout !== null) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    if (!latest) return;
    const { documentId: docId, state: snap } = latest;
    latest = null;
    syncTimeout = null;
    fetch(`/api/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume: JSON.parse(JSON.stringify(snap.resume)),
        settings: JSON.parse(JSON.stringify(snap.settings)),
      }),
    }).catch(() => {});
  }, delay);
};

function saveStateToLocalStorageIgnored(_state: RootState) {
  // Intentionally empty placeholder so server-sync never introduces localStorage writes.
  return;
}
```

`src/app/lib/redux/hooks.tsx` — update the autosave hook to take `documentId`:

```tsx
export const useSaveStateToLocalStorageOnChange = (documentId: string | null) => {
  const { userId } = useAuth();
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      saveStateToLocalStorageDebounced(state);
      if (userId) syncStateToServerDebounced(documentId, state);
    });
    const handleBeforeUnload = () => flushStateToLocalStorage();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushStateToLocalStorage();
    };
  }, [userId, documentId]);
};
```

- [ ] **Step 2: Route the builder on the document**

`src/app/resume-builder/page.tsx` — read `?document=` and pass it down:

```tsx
"use client";
import { Provider } from "react-redux";
import { useSearchParams } from "next/navigation";
import { store } from "lib/redux/store";
import { ResumeForm } from "components/ResumeForm";
import { Resume } from "components/Resume";
import { VersionHistoryPanel } from "components/VersionHistoryPanel";

export default function Create() {
  const params = useSearchParams();
  const documentId = params.get("document");

  return (
    <Provider store={store}>
      <main className="relative h-full w-full overflow-hidden bg-gray-50">
        <VersionHistoryPanel documentId={documentId} />
        <div className="grid grid-cols-3 md:grid-cols-6">
          <div className="col-span-3">
            <ResumeForm documentId={documentId} />
          </div>
          <div className="col-span-3">
            <Resume />
          </div>
        </div>
      </main>
    </Provider>
  );
}
```

`src/app/components/ResumeForm/index.tsx` — accept `documentId` and pass to the two hooks:

```tsx
// signature
export const ResumeForm = ({ documentId }: { documentId: string | null }) => {
  useSetInitialStore(documentId);
  useSaveStateToLocalStorageOnChange(documentId);
  ...
};
```

`src/app/components/VersionHistoryPanel.tsx` — accept `documentId` and scope all its fetches:

- Add `const VersionHistoryPanel = ({ documentId }: { documentId: string | null }) => {`.
- Replace `"/api/resume/versions"` → `` `/api/documents/${documentId}/versions` ``.
- Replace `"/api/resume/restore"` → `` `/api/documents/${documentId}/restore` ``.
- Guard fetch calls with `if (!documentId) return;` in `listVersions` and handlers.
- `handleRestore` keeps dispatching `setResume`/`setSettings` from the response, then `listVersions()`.

- [ ] **Step 3: TopNavBar — "My Resumes" entry + user control emphasis**

`src/app/components/TopNavBar.tsx` — inside the `<nav>`, keep the GitHub link and add, when signed in, a "My Resumes" link before the user button:

```tsx
<SignedIn>
  <Link
    href="/documents"
    className="rounded-md px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100"
  >
    My Resumes
  </Link>
</SignedIn>
```

Remove the `Builder` / `Parser` primary links from the nav (keep GitHub + user controls). Home recorder page stays reachable from the logo/home.

- [ ] **Step 4: Home copy — account-based messaging**

`src/app/page.tsx` (or `src/app/home/Hero.tsx` if the copy lives there) — change the hero tagline "No sign up required" line and the "Create Resume" CTA to reflect an account-required workspace:

- Replace the "No sign up required" copy with: "Sign in to save, version, and export your resumes — synced across devices."
- Point the primary CTA to `/documents`.

If the CTA/copy lives in `src/app/home/Hero.tsx`, make the edits there; keep all IDs/classes unchanged otherwise.

- [ ] **Step 5: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/resume-builder/page.tsx src/app/components/ResumeForm/index.tsx src/app/components/VersionHistoryPanel.tsx src/app/lib/redux/hooks.tsx src/app/lib/redux/server-sync.ts src/app/components/TopNavBar.tsx src/app/page.tsx src/app/home/Hero.tsx
git commit -m "feat: document-scoped editor, nav, and onboarding"
```

---

### Task 6: Editor layout — section nav + collapsible preview

**Files:**
- Modify: `src/app/resume-builder/page.tsx`
- Create: `src/app/components/EditorSectionNav.tsx`

**Interfaces:**
- Consumes: `ShowForm`, `selectFormsOrder`, `changeFormOrder` from settingsSlice; existing `ResumeForm`/`Resume`.
- Produces: a sidebar section navigation that scrolls to/reveals the matching form, and a collapsible preview pane.

- [ ] **Step 1: Create `src/app/components/EditorSectionNav.tsx`**

```tsx
"use client";
import { useAppSelector } from "lib/redux/hooks";
import { selectFormsOrder, type ShowForm } from "lib/redux/settingsSlice";
import { cx } from "lib/cx";

const LABELS: Record<ShowForm, string> = {
  workExperiences: "Work Experience",
  educations: "Education",
  projects: "Projects",
  skills: "Skills",
  custom: "Custom",
};

export const EditorSectionNav = () => {
  const formsOrder = useAppSelector(selectFormsOrder);
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <nav aria-label="Resume sections" className="w-44 shrink-0 border-r border-gray-200 bg-white py-4">
      <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Sections</p>
      <a
        href="#profile-section"
        onClick={(e) => { e.preventDefault(); scrollTo("profile-section"); }}
        className="block px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
      >
        Profile
      </a>
      {formsOrder.map((f) => (
        <a
          key={f}
          href={`#${f}-section`}
          onClick={(e) => { e.preventDefault(); scrollTo(`${f}-section`); }}
          className={cx("block px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100")}
        >
          {LABELS[f]}
        </a>
      ))}
      <a
        href="#design-section"
        onClick={(e) => { e.preventDefault(); scrollTo("design-section"); }}
        className="block px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
      >
        Design
      </a>
    </nav>
  );
};
```

- [ ] **Step 2: Give each form a stable id and wrap ResumeForm exports**

In each form component return (`src/app/components/ResumeForm/ProfileForm.tsx` and each of `WorkExperiencesForm`, `EducationsForm`, `ProjectsForm`, `SkillsForm`, `CustomForm`, `ThemeForm`), wrap the top-level rendered element with an `id`:
- `ProfileForm` → `id="profile-section"`
- `WorkExperiencesForm` → `id="workExperiences-section"`; `EducationsForm` → `id="educations-section"`; `ProjectsForm` → `id="projects-section"`; `SkillsForm` → `id="skills-section"`; `CustomForm` → `id="custom-section"`; `ThemeForm` → `id="design-section"`.

Add the `id` by editing each file's outermost JSX node (e.g. `<div id="profile-section" ...>`). Do not change styling or logic.

- [ ] **Step 3: Rebuild the editor layout**

`src/app/resume-builder/page.tsx` — restructure to section-nav + center form + collapsible preview:

```tsx
"use client";
import { useState } from "react";
import { Provider } from "react-redux";
import { useSearchParams } from "next/navigation";
import { store } from "lib/redux/store";
import { ResumeForm } from "components/ResumeForm";
import { Resume } from "components/Resume";
import { VersionHistoryPanel } from "components/VersionHistoryPanel";
import { EditorSectionNav } from "components/EditorSectionNav";

export default function Create() {
  const params = useSearchParams();
  const documentId = params.get("document");
  const [previewOpen, setPreviewOpen] = useState(true);

  return (
    <Provider store={store}>
      <main className="relative flex h-full min-h-screen flex-col bg-gray-50">
        <VersionHistoryPanel documentId={documentId} />
        <div className="flex flex-1 overflow-hidden">
          <EditorSectionNav />
          <div className="min-w-0 flex-1 overflow-y-auto">
            <ResumeForm documentId={documentId} />
          </div>
          <div className="relative hidden w-[45%] min-w-[420px] border-l border-gray-200 md:block">
            <Resume />
            <button
              onClick={() => setPreviewOpen((o) => !o)}
              className="absolute right-3 top-3 z-10 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
              {previewOpen ? "Hide preview" : "Show preview"}
            </button>
          </div>
        </div>
      </main>
    </Provider>
  );
}
```

Note: `previewOpen` toggles display via the `hidden`/`block` classes — wire the toggle so that when `!previewOpen` the preview pane is hidden (e.g. `className={previewOpen ? "" : "hidden"}` on the preview div) rather than always showing. Adjust to keep it simple and functional.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/resume-builder/page.tsx src/app/components/EditorSectionNav.tsx src/app/components/ResumeForm
git commit -m "feat: editor section navigation and collapsible preview"
```

---

### Task 7: Preview top-bar controls (template + design + zoom + download)

**Files:**
- Modify: `src/app/components/Resume/index.tsx`
- Modify: `src/app/components/Resume/ResumeControlBar.tsx`

**Interfaces:**
- Consumes: existing `ResumeControlBarCSR`, `TemplateSelections`, `changeSettings`.
- Produces: an always-visible top bar in the preview pane with inline template switch, design/theme link, zoom slider + autoscale, and Download PDF.

- [ ] **Step 1: Add a top preview bar in `Resume/index.tsx`**

Add, inside the preview's outer `div`, above the iframe section:

```tsx
<div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
  <div className="flex items-center gap-2 text-sm text-gray-700">
    <span>Template:</span>
    <select
      value={settings.template}
      onChange={(e) => dispatch(changeSettings({ field: "template", value: e.target.value as TemplateType }))}
      className="rounded-md border border-gray-300 px-2 py-1"
    >
      {(["modern","classic","executive","minimal","compact","latex-jakes","latex-moderncv","latex-sb2nov"] as const).map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  </div>
  <div className="flex items-center gap-3">
    <label className="flex items-center gap-1 text-xs text-gray-500">
      <input
        type="range" min={0.5} max={1.5} step={0.01} value={scale}
        onChange={(e) => setScale(Number(e.target.value))}
      />
      <span className="w-10">{Math.round(scale * 100)}%</span>
    </label>
    <ResumeControlBarCSR
      scale={scale}
      setScale={setScale}
      documentSize={settings.documentSize}
      document={document}
      fileName={resume.profile.name + " - Resume"}
    />
  </div>
</div>
```

Add corresponding imports: `useAppDispatch`, `changeSettings`, `type TemplateType`. Set `value` bound to `settings.template`.

- [ ] **Step 2: Strip the cramped bottom bar from `ResumeControlBar.tsx`**

Replace the component's bottom bar wrapper (`<div className="sticky bottom-0 ...">`) with a compact download-only control (drop the shared zoom UI, which now lives in the top bar):

```tsx
const ResumeControlBar = ({ document, fileName }: { document: JSX.Element; fileName: string }) => {
  const [debouncedDocument, setDebouncedDocument] = useState(document);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDocument(document), 500);
    return () => clearTimeout(timer);
  }, [document]);
  const [instance, update] = usePDF({ document: debouncedDocument });
  useEffect(() => { update(); }, [update, debouncedDocument]);
  const isDownloadDisabled = !instance.url || instance.loading;
  return (
    <a
      className={`flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-sm ${isDownloadDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-gray-100"}`}
      href={instance.url || undefined}
      download={fileName}
      aria-disabled={isDownloadDisabled}
      onClick={(e) => { if (isDownloadDisabled) e.preventDefault(); }}
    >
      <ArrowDownTrayIcon className="h-4 w-4" />
      <span>{instance.loading ? "Preparing PDF..." : "Download"}</span>
    </a>
  );
};
```

Adjust `ResumeControlBarCSR`'s usage in `Resume/index.tsx` to the new narrower props (scale handled in the top bar). Keep `ResumeControlBarCSR` a dynamic client wrapper (`ssr: false`).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean (match prop types — `scale`/`setScale`/`documentSize` removed from the download-only bar if unused; otherwise keep them).

- [ ] **Step 4: Commit**

```bash
git add src/app/components/Resume/index.tsx src/app/components/Resume/ResumeControlBar.tsx
git commit -m "feat: preview top-bar with template switch, zoom, and download"
```

---

### Task 8: Save-status indicator + document-scoped version panel polish

**Files:**
- Modify: `src/app/components/VersionHistoryPanel.tsx`
- Modify: `src/app/lib/redux/server-sync.ts` (report last-sync state)

**Interfaces:**
- Consumes: `documentId`; routes from Task 3.
- Produces: a "Saved"/"Saving…" indicator; a version panel with named save and restore; duplication stays on the dashboard (`/duplicate`).

- [ ] **Step 1: Expose a save-status signal from server-sync**

`src/app/lib/redux/server-sync.ts` — add a subscriber:

```ts
type Listener = (status: "saving" | "saved" | null) => void;
const listeners = new Set<Listener>();
export function onSyncStatusChange(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function emit(s: "saving" | "saved" | null) {
  listeners.forEach((l) => l(s));
}
```

In `syncStateToServerDebounced`, before dispatching the fetch emit `"saving"` and in the `.then`/`.catch` emit `"saved"` (emitting `"saved"` even on failure keeps the UI simple; the panel handles its own error banner).

- [ ] **Step 2: Add the indicator + polish to `VersionHistoryPanel.tsx`**

- Add `const [syncStatus, setSyncStatus] = useState<"saving" | "saved" | null>(null);` and `useEffect` subscribing to `onSyncStatusChange(setSyncStatus)`.
- Render `<span className="text-xs text-gray-400">{syncStatus === "saving" ? "Saving…" : syncStatus === "saved" ? "Saved just now" : ""}</span>` in the panel header.
- Add a "Duplicate as draft" action? No — the `duplicate` route copies a document's CURRENT content, not a past version, so a version-row "duplicate" would be misleading. Keep duplication at the dashboard level (Task 3 `POST /api/documents/[id]/duplicate`). The version panel instead offers only: list, named save, and Restore.
- Keep the existing Save-version / Restore actions (scoped by `documentId` from Task 5).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/VersionHistoryPanel.tsx src/app/lib/redux/server-sync.ts
git commit -m "feat: save-status indicator and document-scoped version actions"
```

---

### Task 9: QA, live smoke, and deploy

**Files:**
- Modify (if needed): `README.md` (workspace/copy note).

**Interfaces:**
- Consumes: everything from Tasks 1–8; `.env.local` with real `DATABASE_URL`.
- Produces: migrated schema, green suite, live deployment.

- [ ] **Step 1: Apply the workspace migration**

```bash
node --env-file=.env.local scripts/init-db.mjs
```
Expected: `Schema is up to date.`

- [ ] **Step 2: Full automated checks**

Run: `npm run test:ci && npx tsc --noEmit && npm run build`
Expected: all PASS; build green.

- [ ] **Step 3: Merge to main and push (ask the user first)**

```bash
git checkout main && git merge --no-ff feat/workspace -m "feat: craftcv document workspace"
git push origin main
```

- [ ] **Step 4: Live smoke**

Confirm on the production URL:
1. Signed-in Home → **My Resumes** dashboard lists documents.
2. **New resume** creates and opens the editor; type content; reload → persists.
3. **Import from PDF/JSON** parses the user's sample PDF into a new document and opens it.
4. Save a version; **Restore** rewinds; Dashboard **Duplicate** opens a copy.
5. Delete a document removes it (and its versions) from the list.
6. Multiple documents stay isolated (editing one does not change another).
7. Editor shows section nav + collapsible preview + top-bar template/zoom/download.
8. Verify `GET /api/documents` returns 401 unauthenticated and the `/documents` page redirects to sign-in when signed out.

- [ ] **Step 5: README + commit if changed**

Update README builder section to mention the account/work-space flow if it implies anonymous-only use. Commit separately:

```bash
git add README.md
git commit -m "docs: note account and workspace flow"
```

---

## Self-Review

- **Spec coverage:** model+migration (Task 1), `/api/documents` family incl. ownership, delete-cascade, duplicate (Tasks 2–3), dashboard + import entry + middleware + nav + home copy (Tasks 4–5), editor section nav + collapsible preview (Task 6), preview top-bar controls + download (Task 7), save-status + document-scoped versions (Task 8, duplication at dashboard only), QA/deploy/smoke (Task 9). All spec sections mapped.
- **Placeholders:** every step carries concrete code or an exact command; none say "TBD"/"fill in".
- **Type consistency:** `duplicateName`/`buildVersionEntry` defined in Task 1 and used in Tasks 2–3/8; `documentId` threaded consistently through hooks, server-sync, panel, and editor. `useSetInitialStore(documentId)` and `useSaveStateToLocalStorageOnChange(documentId)` signatures are stable from Task 5 and consumed in Task 5 only (already threaded). `VersionHistoryPanel`/`ResumeForm` both accept `documentId` from Task 5 onward.
- **Deploy/regression note:** middleware matcher in Task 4 only ADDS `/documents` and `/api/documents(.*)` and keeps `/resume-builder` — it never removes public access to `/`, `/resume-parser`, or `/sign-in`.