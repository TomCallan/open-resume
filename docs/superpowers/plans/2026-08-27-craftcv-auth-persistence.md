# CraftCV Auth + Cloud Persistence + Version History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put CraftCV behind Clerk login, persist each user's resume in Neon Postgres with autosave, and add git-like named versions with non-destructive restore.

**Architecture:** Add Clerk v5 auth (middleware + provider + sign-in pages) to the Next 13 App Router app; add a lazy Neon client under `src/lib/db.ts`; expose five authed API routes under `/api/resume*`; wire the existing Redux/localStorage persistence to hydrate from and autosave to the server when signed in; render an inline version panel in the builder; move the template picker to the top. Deploy via Vercel git-push with Marketplace-provisioned env vars.

**Tech Stack:** Next.js `^13.5`, React 18, TypeScript, `@clerk/nextjs@^5`, `@neondatabase/serverless`, Redux Toolkit, jest.

## Global Constraints

- Clerk version pinned to `@clerk/nextjs@^5` (use `latest-nextjs-v5` tag, e.g. `5.7.6`). Clerk v5 API is **synchronous** `auth()` — do NOT use async v7 syntax.
- `next` must be upgraded to `^13.5.4` (Clerk v5 peer requirement). React stays 18.
- PDFs are never stored; only `resume` (JSONB) and `settings` (JSONB) persist.
- Builder (`/resume-builder`) and `/api/resume*` are auth-protected. Home (`/`) and `/resume-parser` stay public.
- Version restore is non-destructive: old snapshots in `versions` are never mutated.
- Follow existing code style (prettier, `src/app/...` structure, `lib/...` alias imports).
- DB access uses lazy init via `getSql()` in `src/lib/db.ts` (build-time safe). No `Proxy` around the client.
- All repo artifacts (commits) written in normal English.

---

### Task 1: Upgrade Next and add dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: deps `@clerk/nextjs@^5`, `@neondatabase/serverless`, `next@^13.5.4` installed.

- [ ] **Step 1: Install dependencies**

```bash
npm install next@^13.5.4 @clerk/nextjs@5 @neondatabase/serverless
```

- [ ] **Step 2: Verify install**

Run: `npm ls next @clerk/nextjs @neondatabase/serverless`
Expected: `next@13.5.x`, `@clerk/nextjs@5.x`, `@neondatabase/serverless@^1`.

- [ ] **Step 3: Run the existing test suite to confirm the Next upgrade is clean**

Run: `npm run test:ci`
Expected: existing jest tests PASS (fix any failures attributable to the upgrade; do not modify test assertions).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade next to 13.5 and add clerk + neon deps"
```

---

### Task 2: Environment contract and DB schema init

**Files:**
- Create: `scripts/init-db.mjs`
- Create: `src/lib/db.ts`
- Create: `.env.example`

**Interfaces:**
- Consumes: env vars `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
- Produces:
  - `src/lib/db.ts` exports `getSql()` returning the neon tagged-template function.
  - `scripts/init-db.mjs` creates `resumes` and `versions` tables (idempotent).

- [ ] **Step 1: Create `src/lib/db.ts`**

```ts
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

export function getSql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}
```

- [ ] **Step 2: Create `scripts/init-db.mjs`**

```js
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
await sql`
  CREATE TABLE IF NOT EXISTS resumes (
    user_id TEXT PRIMARY KEY,
    resume JSONB NOT NULL,
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
await sql`
  CREATE TABLE IF NOT EXISTS versions (
    user_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    resume JSONB NOT NULL,
    settings JSONB NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, version)
  )
`;
console.log("Schema is up to date.");
```

- [ ] **Step 3: Create `.env.example`**

```
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

- [ ] **Step 4: Apply schema locally**

Requires a populated `.env.local` (from marketplace provisioning in Task 9; if not yet present, skip this step and run it in Task 9).

```bash
node --env-file=.env.local scripts/init-db.mjs
```

- [ ] **Step 5: Commit**

```bash
git add scripts/init-db.mjs src/lib/db.ts .env.example
git commit -m "feat: add neon db client and schema init script"
```

---

### Task 3: Auth — Clerk provider, middleware, sign-in/up pages, navbar

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/middleware.ts`
- Create: `src/app/sign-in/[[...sign-in]]/page.tsx`
- Create: `src/app/sign-up/[[...sign-up]]/page.tsx`
- Modify: `src/app/components/TopNavBar.tsx`

**Interfaces:**
- Produces: `ClerkProvider` in root layout; middleware protecting `/resume-builder` and `/api/resume*`; `/sign-in` and `/sign-up` routes; logged-in nav controls.

- [ ] **Step 1: Wrap the app in `ClerkProvider`**

`src/app/layout.tsx`:

```tsx
import "globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { TopNavBar } from "components/TopNavBar";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "CraftCV - Modern, ATS & LaTeX Resume Builder & Parser",
  description:
    "CraftCV is a fast, privacy-first resume builder and ATS parser. Create beautiful LaTeX and modern professional resumes with live PDF preview, multiple curated templates, and local AI agent support.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <TopNavBar />
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Create `src/middleware.ts`**

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/resume-builder(.*)",
  "/api/resume(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 3: Create sign-in and sign-up pages**

`src/app/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-gray-50">
      <SignIn />
    </main>
  );
}
```

`src/app/sign-up/[[...sign-up]]/page.tsx`:

```tsx
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-gray-50">
      <SignUp />
    </main>
  );
}
```

- [ ] **Step 4: Add signed-in controls to `TopNavBar.tsx`**

`src/app/components/TopNavBar.tsx` — add Clerk components to the right side of the nav:

```tsx
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";
```

In the `<nav>` element, after the GitHub link, add:

```tsx
<div className="ml-2 flex items-center">
  <SignedOut>
    <SignInButton mode="modal">
      <button className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
        Sign in
      </button>
    </SignInButton>
  </SignedOut>
  <SignedIn>
    <UserButton afterSignOutUrl="/" />
  </SignedIn>
</div>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/middleware.ts src/app/sign-in src/app/sign-up src/app/components/TopNavBar.tsx
git commit -m "feat: add clerk auth provider, middleware, and sign-in UI"
```

---

### Task 4: Resume API — read and autosave

**Files:**
- Create: `src/app/api/resume/route.ts`

**Interfaces:**
- Consumes: `getSql()` from `src/lib/db.ts`, Clerk `auth()` from `@clerk/nextjs/server`.
- Produces:
  - `GET /api/resume` → `200 { resume, settings }` or `{ resume: null }` when no row.
  - `PATCH /api/resume` body `{ resume, settings }` → `200 { ok: true }`.

- [ ] **Step 1: Create `src/app/api/resume/route.ts`**

```ts
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
```

- [ ] **Step 2: Verify the route is a valid Next App Router handler**

Run: `npx tsc --noEmit`
Expected: no new type errors. (Runtime API testing requires auth — covered in Task 9 after env provisioning.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/resume/route.ts
git commit -m "feat: add resume read + autosave api"
```

---

### Task 5: Version API — list, create (snapshot), restore

**Files:**
- Create: `src/app/api/resume/versions/route.ts`
- Create: `src/app/api/resume/restore/route.ts`
- Create: `src/lib/resume-versions.ts`

**Interfaces:**
- Consumes: `getSql()`, Clerk `auth()`.
- Produces:
  - `GET /api/resume/versions` → `200 { versions: [{ version, name, createdAt }] }` (desc order).
  - `POST /api/resume/versions` body `{ name? }` → `200 { version }` (snapshots the current working copy).
  - `POST /api/resume/restore` body `{ version }` → `200 { version, resume, settings }` (rewinds current to that snapshot and records a `Restored vN` version).
  - `src/lib/resume-versions.ts` exports pure helper `buildRestoredEntry(version: number, resume: unknown, settings: unknown, name: string)` → `{ version, resume, settings, name }` used for both persistence and tests.

- [ ] **Step 1: Write a failing unit test for the pure restore-frame helper**

Create `src/lib/__tests__/resume-versions.test.ts`:

```ts
import { buildRestoredEntry } from "lib/resume-versions";

describe("buildRestoredEntry", () => {
  it("frames a restored snapshot as a new version with a marker name", () => {
    const entry = buildRestoredEntry(3, { profile: {} }, { template: "elegant" });
    expect(entry).toEqual({
      version: 3,
      resume: { profile: {} },
      settings: { template: "elegant" },
      name: "Restored v3",
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/lib/__tests__/resume-versions.test.ts -t buildRestoredEntry`
Expected: FAIL — module `lib/resume-versions` not found.

- [ ] **Step 3: Implement the helper**

Create `src/lib/resume-versions.ts`:

```ts
export interface VersionEntry {
  version: number;
  resume: unknown;
  settings: unknown;
  name: string;
}

export function buildRestoredEntry(
  version: number,
  resume: unknown,
  settings: unknown,
  name = `Restored v${version}`
): VersionEntry {
  return { version, resume, settings, name };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/lib/__tests__/resume-versions.test.ts`
Expected: PASS (1 passed).

- [ ] **Step 5: Create `src/app/api/resume/versions/route.ts`**

```ts
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
```

- [ ] **Step 6: Create `src/app/api/resume/restore/route.ts`**

```ts
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
```

- [ ] **Step 7: Run the full jest suite**

Run: `npm run test:ci`
Expected: all PASS (including the new restore-helper test).

- [ ] **Step 8: Commit**

```bash
git add src/lib/resume-versions.ts src/lib/__tests__/resume-versions.test.ts src/app/api/resume/versions/route.ts src/app/api/resume/restore/route.ts
git commit -m "feat: add version snapshot, list, and restore api"
```

---

### Task 6: Client wiring — server hydrate + autosave

**Files:**
- Modify: `src/app/lib/redux/hooks.tsx`
- Create: `src/app/lib/redux/server-sync.ts`
- Modify: `src/app/components/ResumeForm/index.tsx`

**Interfaces:**
- Consumes: Clerk `useAuth()` from `@clerk/nextjs`; endpoints from Tasks 4–5; existing `loadStateFromLocalStorage`, `initialResumeState`, `initialSettings`, `setResume`, `setSettings`.
- Produces: `server-sync.ts` exports `syncStateToServerDebounced(state, delay)`; `hooks.tsx` seeds store from server when signed in and autosaves to server.

- [ ] **Step 1: Create `src/app/lib/redux/server-sync.ts`**

```ts
import type { RootState } from "lib/redux/store";

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let latestStateToSync: RootState | null = null;

export const syncStateToServerDebounced = (state: RootState, delay = 500) => {
  latestStateToSync = state;
  if (syncTimeout !== null) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    if (latestStateToSync) {
      const payload = latestStateToSync;
      latestStateToSync = null;
      syncTimeout = null;
      fetch("/api/resume", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: JSON.parse(JSON.stringify(payload.resume)),
          settings: JSON.parse(JSON.stringify(payload.settings)),
        }),
      }).catch(() => {
        // Non-blocking sync: local persistence remains the fallback.
      });
    }
  }, delay);
};
```

- [ ] **Step 2: Update `src/app/lib/redux/hooks.tsx`**

Add imports:

```tsx
import { useAuth } from "@clerk/nextjs";
import { syncStateToServerDebounced } from "lib/redux/server-sync";
```

Replace `useSetInitialStore` with a version that hydrates from the server when signed in (falling back to localStorage):

```tsx
export const useSetInitialStore = () => {
  const dispatch = useAppDispatch();
  const { userId } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const loadServerState = async () => {
      if (!userId) return false;
      try {
        const res = await fetch("/api/resume");
        if (res.ok) {
          const data = await res.json();
          if (data?.resume) {
            if (cancelled) return true;
            const mergedResume = deepMerge(initialResumeState, data.resume) as Resume;
            dispatch(setResume(mergedResume));
            const mergedSettings = deepMerge(initialSettings, data.settings) as Settings;
            dispatch(setSettings(mergedSettings));
            return true;
          }
        }
      } catch {
        // fall through to local storage below
      }
      return false;
    };

    const init = async () => {
      const loadedFromServer = await loadServerState();
      if (loadedFromServer || cancelled) return;

      const state = loadStateFromLocalStorage();
      if (!state) return;
      if (state.resume) {
        const mergedResumeState = deepMerge(initialResumeState, state.resume) as Resume;
        dispatch(setResume(mergedResumeState));
      }
      if (state.settings) {
        const mergedSettingsState = deepMerge(initialSettings, state.settings) as Settings;
        dispatch(setSettings(mergedSettingsState));
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [userId, dispatch]);
};
```

Replace `useSaveStateToLocalStorageOnChange` to also sync to the server when signed in:

```tsx
export const useSaveStateToLocalStorageOnChange = () => {
  const { userId } = useAuth();

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      saveStateToLocalStorageDebounced(state);
      if (userId) syncStateToServerDebounced(state);
    });

    const handleBeforeUnload = () => {
      flushStateToLocalStorage();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushStateToLocalStorage();
    };
  }, [userId]);
};
```

Note: `React.useRef` is not needed — `store` is the singleton from `lib/redux/store`. Keep the existing `useAppDispatch` / `useAppSelector` exports unchanged.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/lib/redux/server-sync.ts src/app/lib/redux/hooks.tsx
git commit -m "feat: hydrate and autosave resume to server for signed-in users"
```

---

### Task 7: Version history panel in the builder

**Files:**
- Create: `src/app/components/VersionHistoryPanel.tsx`
- Modify: `src/app/resume-builder/page.tsx`

**Interfaces:**
- Consumes: endpoints `GET/POST /api/resume/versions`, `POST /api/resume/restore`; `useAppDispatch`/`useAppSelector`.
- Produces: `VersionHistoryPanel` component that lists versions, saves a named version, and restores one (refreshing the store).

- [ ] **Step 1: Create `src/app/components/VersionHistoryPanel.tsx`**

```tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import {
  initialResumeState,
  setResume,
} from "lib/redux/resumeSlice";
import {
  initialSettings,
  setSettings,
} from "lib/redux/settingsSlice";
import { deepMerge } from "lib/deep-merge";
import type { Resume } from "lib/redux/types";
import type { Settings } from "lib/redux/settingsSlice";

interface StoredSnapshot {
  version: number;
  name?: string | null;
  createdAt?: string;
  resume: unknown;
  settings: unknown;
}

export const VersionHistoryPanel = () => {
  const dispatch = useAppDispatch();
  const resume = useAppSelector((s) => s.resume);
  const settings = useAppSelector((s) => s.settings);
  const [snapshots, setSnapshots] = useState<StoredSnapshot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listVersions = useCallback(async () => {
    try {
      const res = await fetch("/api/resume/versions");
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.versions ?? []);
      }
    } catch {
      setError("Could not load version history.");
    }
  }, []);

  useEffect(() => {
    void listVersions();
  }, [listVersions]);

  const handleSaveVersion = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const name = window.prompt("Version name (optional)");
      const res = await fetch("/api/resume/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined }),
      });
      if (!res.ok) throw new Error("save failed");
      await listVersions();
    } catch {
      setError("Could not save version.");
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (version: number) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/resume/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      if (!res.ok) throw new Error("restore failed");
      const data = await res.json();
      dispatch(setResume(deepMerge(initialResumeState, data.resume) as Resume));
      dispatch(setSettings(deepMerge(initialSettings, data.settings) as Settings));
      await listVersions();
    } catch {
      setError("Could not restore version.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-900">Version History</h2>
        <button
          onClick={handleSaveVersion}
          disabled={busy}
          className="rounded-md bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Save version
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      {snapshots.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {snapshots.map((s) => (
            <li
              key={s.version}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700"
            >
              <span>
                v{s.version}{s.name ? ` · ${s.name}` : ""}
              </span>
              <button
                onClick={() => handleRestore(s.version)}
                disabled={busy}
                className="font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
```

- [ ] **Step 2: Render the panel in the builder page**

`src/app/resume-builder/page.tsx` — add the import and render it above the grid (inside the `<Provider>`, since it needs the store):

```tsx
"use client";
import { Provider } from "react-redux";
import { store } from "lib/redux/store";
import { ResumeForm } from "components/ResumeForm";
import { Resume } from "components/Resume";
import { VersionHistoryPanel } from "components/VersionHistoryPanel";

export default function Create() {
  return (
    <Provider store={store}>
      <main className="relative h-full w-full overflow-hidden bg-gray-50">
        <VersionHistoryPanel />
        <div className="grid grid-cols-3 md:grid-cols-6">
          <div className="col-span-3">
            <ResumeForm />
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

- [ ] **Step 3: Move the template picker to the top of the builder form**

`src/app/components/ResumeForm/index.tsx` — change the section so `<ThemeForm />` renders before `<ProfileForm />`:

```tsx
<section className="flex max-w-2xl flex-col gap-8 p-[var(--resume-padding)]">
  <ThemeForm />
  <ProfileForm />
  {formsOrder.map((form) => {
    const Component = formTypeToComponent[form];
    return <Component key={form} />;
  })}
  <br />
</section>
```

(Remove the old `<ThemeForm />` line that followed the `formsOrder` map.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new type errors (check `Settings` type is exported from `settingsSlice`; if not, export the existing type).

- [ ] **Step 5: Commit**

```bash
git add src/app/components/VersionHistoryPanel.tsx src/app/resume-builder/page.tsx src/app/components/ResumeForm/index.tsx
git commit -m "feat: add inline version history panel and move template picker to top"
```

---

### Task 8: Self-review fixups

**Files:**
- If `settingsSlice.ts` does not already export a `Settings` type used in Tasks 6–7, add: `export type Settings = ReturnType<typeof changeSettings>... ` — actually ensure `Settings` is exported. Inspect `src/app/lib/redux/settingsSlice.ts` for the existing type; if it is `export type Settings`, no change. If named differently, alias `export type { Settings }`.

- [ ] **Step 1: Confirm `Settings` type export**

Run: `grep -n "export type Settings\|export interface Settings\|export type .*=" src/app/lib/redux/settingsSlice.ts`
Expected: a `Settings` type is exported. If not, add `export type Settings = { template: TemplateType; ... }` matching the slice's static state shape, or re-export the existing type.

- [ ] **Step 2: Run the full jest suite**

Run: `npm run test:ci`
Expected: all PASS.

- [ ] **Step 3: Commit if the step-1 check required a fix**

```bash
git add src/app/lib/redux/settingsSlice.ts
git commit -m "chore: export Settings type for server sync"
```

---

### Task 9: Link to Vercel, provision envs, run schema, deploy

**Files:**
- None (infrastructure). Writes `.vercel/` and `.env.local`.

**Interfaces:**
- Consumes: Vercel CLI (already authenticated as `tomcallan`), repo `git@github.com:TomCallan/open-resume.git`.
- Produces: linked project under team `tomcallans-projects`, provisioned `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, a deployed production site.

> ⚠️ Tasks 9-1 and 9-2 are interactive (browser account/setup dialogs). The agent starts them; the user completes the dialogs.

- [ ] **Step 1: Link the repo**

```bash
vercel link --repo --scope tomcallans-projects
```

- [ ] **Step 2: Provision integrations (needs user's browser)**

```bash
vercel integration add clerk --scope tomcallans-projects
vercel integration add neon --scope tomcallans-projects
```
Complete the browser dialogs. Confirm env vars exist:

```bash
vercel env ls --scope tomcallans-projects
```
Expected to include `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `DATABASE_URL`.

- [ ] **Step 3: Pull env for local build/test**

```bash
vercel env pull .env.local --yes
```

- [ ] **Step 4: Apply the DB schema**

```bash
node --env-file=.env.local scripts/init-db.mjs
```
Expected output: `Schema is up to date.`

- [ ] **Step 5: Build locally to validate the full app compiles with env present**

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 6: Commit and push (ask user before push)**

```bash
git add .
git commit -m "feat: enable auth, cloud persistence, and version history"
git push
```
Confirm push with the user first. `main` branch → production deploy.

- [ ] **Step 7: Confirm deployment**

Run: `vercel ls --format json --scope tomcallans-projects`
Expected: latest deployment on `main` is READY.

---

### Task 10: Post-deploy verification and documentation

**Files:**
- Modify: `README.md` (optional lightweight note) — only if README describes deployment/features and a note about login is warranted.

- [ ] **Step 1: Smoke-test the live site**

Open the production URL. Verify: public home loads; Home → Builder redirects to `/sign-in` when signed out; sign-up/in works; a signed-in user's resume autosaves (reload persists); Save version + Restore work; template picker appears at top of the builder.

- [ ] **Step 2: Run the full test suite one final time**

Run: `npm run test:ci`
Expected: all PASS.

- [ ] **Step 3: Update README if it describes auth/deployment**

Add a short "Requires account" note to the builder section if the README currently implies anonymous use. Commit only if changed:

```bash
git add README.md
git commit -m "docs: note account requirement in builder"
```

---

## Self-Review

- **Spec coverage:** deploy (Tasks 9), Clerk v5 auth + middleware + navbar (Task 3), Neon schema + client (Tasks 1–2), three resume/version API areas (Tasks 4–5), client hydrate + autosave (Task 6), version panel + template-to-top (Task 7), testing (embedded in every task: jest + tsc + build). All spec sections map to tasks.
- **Placeholders:** all steps carry concrete code or exact commands; no TBD/TODO.
- **Type consistency:** `getSql()` used consistently across Tasks 2/4/5. `buildRestoredEntry(version, resume, settings, name?)` defined in Task 5 and reused in Task 5's route — signature matches the test. `setResume`/`setSettings`/`deepMerge`/`initialResumeState`/`initialSettings` are existing symbols confirmed during exploration. `VersionHistoryPanel` consumes endpoints defined in Task 5. `Settings` type export verified in Task 8.
- **Deploy note:** Tasks 9-1/9-2 require user browser interaction; fallback (manual Clerk app + Neon DB creation) documented in the design spec should the headless flow fail.