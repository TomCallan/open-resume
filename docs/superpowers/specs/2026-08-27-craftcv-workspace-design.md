# CraftCV — FlowCV-style Document Workspace

Date: 2026-08-27
Status: Approved design

## Goal

Rework CraftCV from a single gated builder plus a standalone parser "demo" into
a document workspace (modeled on FlowCV) where each user keeps multiple
resumes — each drafted, imported, designed, and versioned in one continuous
flow. Also harden the builder UX (section nav, preview controls, save/version
clarity) and fix onboarding/messaging.

## Background / current state

- Auth: Clerk v5 (`src/middleware.ts` protects `/resume-builder` and
  `/api/resume*`). Neon Postgres. Lazy `getSql()` in `src/app/lib/db.ts`.
- Model is single-resume-per-user: `resumes(user_id PK, resume, settings,
  updated_at)` and `versions(user_id, version, resume, settings, name,
  created_at, PK(user_id, version))`. API routes live under `/api/resume`.
- Builder page `resume-builder` renders `VersionHistoryPanel` (saved), the
  form column (`ResumeForm`), and the live preview (`Resume`). Autosave to
  server + localStorage. Template picker (`ThemeForm`) already moved to top.
- Resume PDF import was broken in production because
  `pdfjs.GlobalWorkerOptions.workerSrc` resolved to `""` in the build; fixed by
  self-hosting `public/pdfjs/pdf.worker.min.js` and setting
  `workerSrc = "/pdfjs/pdf.worker.min.js"`. This fix ships before this feature.

## Design decisions (confirmed)

- **FlowCV-style workspace**: a Documents dashboard is the signed-in home;
  the editor edits one chosen document; parser/PDF import is a workspace
  action, not a separate dead-end page.
- **Multiple resumes per user** is the core model change.
- Version history stays an inline drawer/panel in the editor (no separate page).
- Both PDF and JSON are importable.
- Decompose into phases so each lands working: A) model+API+migration,
  B) dashboard + routing/nav/onboarding, C) editor UX polish, D) copy/QA/deploy.

## 1. Data model & migration

Replace the single-resume schema with a per-document model.

```sql
CREATE TABLE IF NOT EXISTS documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL,
  resume     JSONB NOT NULL,
  settings   JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents (user_id);

-- Re-keyed: per-document version history
CREATE TABLE IF NOT EXISTS versions (
  document_id UUID NOT NULL,
  version     INTEGER NOT NULL,
  resume      JSONB NOT NULL,
  settings    JSONB NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, version)
);
CREATE INDEX IF NOT EXISTS idx_versions_document ON versions (document_id);
```

Migration (`scripts/init-db.mjs`): for every existing `resumes` row, insert a
`documents` row named **My Resume** (with that row's resume/settings), then
re-key that user's `versions` rows to the new document id (by matching the
user's single migrated document), then drop the old `resumes` table. If the
legacy tables don't exist yet, skip the back-fill. Drop the old `versions`
columns/users after re-keying (recreate table here, since the old one is
keyed by `user_id`).

## 2. API (all routes check `documents.user_id = {userId}`)

- `GET /api/documents` → `{ documents: [{ id, name, updatedAt }] }` (order by `updated_at desc`).
- `POST /api/documents` body `{ name?, resume?, settings? }` → creates a doc
  (blank resume+settings if not supplied), returns `{ id, name }`.
- `GET /api/documents/[id]` → `{ id, name, resume, settings, updatedAt }` (404 if not owned).
- `PATCH /api/documents/[id]` body `{ resume, settings, name? }` → upsert autosave (and optional rename). 400/404/401 as appropriate.
- `DELETE /api/documents/[id]` → deletes doc + its versions. 404 if not owned.
- `POST /api/documents/[id]/duplicate` → copies resume+settings into a new doc `name + " (copy)"`, returns `{ id }`.
- `GET /api/documents/[id]/versions` → list desc.
- `POST /api/documents/[id]/versions` body `{ name? }` → snapshot current into a new version (max+1).
- `POST /api/documents/[id]/restore` body `{ version }` → rewind current + record `Restored vN` (non-destructive).

Routes moved under `/api/documents/...`. The old `/api/resume*` handlers are
replaced (no back-compat needed — a greenfield workspace feature on a freshly
deployed app).

## 3. Onboarding & navigation

- `/documents` (protected, middleware already covers `/resume-builder`; extend
  matcher to `/documents`) is the signed-in landing after sign-in.
- Dashboard `documents` page: grid of the user's resumes (name, updated),
  **Continue**, **Duplicate**, **Delete**; **New resume** (blank) and
  **New from PDF/JSON** (parse client-side with the now-fixed importer, then
  `POST /api/documents` with the parsed resume/settings, then open the editor).
- Remove the standalone `/resume-import` entry page; its behavior is folded
  into the dashboard "New from PDF/JSON" and an in-editor Import action.
- Top nav (signed-in): **My Resumes** + user button; the separate
  Builder/Parser links are removed from the primary nav (or parked).
- Home copy: replace "No sign up required" with account-based messaging
  ("Create a free resume"). Keep the public marketing home + parser demo page
  reachable, but they no longer masquerade as the primary flow.

## 4. Editor UX

- Route: `resume-builder?document={id}` (protected). Loads that document's
  resume/settings into the store, autosaves/saves versions scoped to it.
- Layout within the editor:
  - **Left**: section navigation (Profile, Work Experience, Education,
    Projects, Skills, Custom, Design) — sticky quick-jump; no more one long
    scroll.
  - **Center**: the active section's form (keeps `ResumeForm` content, driven
    by the same `formsOrder`).
  - **Right**: sticky live preview (collapsible), replacing the fixed grid.
- Preview controls move to a top bar within the preview pane: inline template
  switcher + design/theme, zoom (scale + autoscale), and **Download PDF** —
  out of the cramped bottom bar.
- Save/version UX:
  - An autosave status indicator ("Saving…" → "Saved just now") reflecting
    cloud + local autosave.
  - Version history stays the inline panel (tagged named saves), now
    document-scoped, with restore and "Duplicate as draft".

## 5. Phasing (each lands independently)

- **Phase A** — schema migration + `documents`/`versions` API (list/create/
  load/autosave/delete/duplicate + per-doc versions/restore). Add a helper +
  unit tests. Update `scripts/init-db.mjs` and run it.
- **Phase B** — `/documents` dashboard, routing (`?document=`), middleware
  matcher extension, TopNav + home copy, onboarding "New from PDF/JSON".
- **Phase C** — editor layout (section nav + sticky collapsible preview),
  preview top-bar controls, save-status indicator, document-scoped version
  panel.
- **Phase D** — QA: full jest suite, tsc, build, live smoke (dashboard, create
  doc, autosave persists on reload, import from PDF/JSON, version+restore,
  delete, multi-doc isolation), docs, deploy.

## Error handling

- API returns 401 (unauthed), 404 (doc not owned/not found), 400 (bad body).
- Client: dashboard/editor surface non-blocking error messages; autosave stays
  non-blocking (local persistence is the fallback); sync failures show a
  status banner.

## Testing

- Unit tests for document-scoped helpers (duplicate naming, version framing).
- Existing suite stays green; `tsc` and `npm run build` clean.
- Live smoke per Phase D (above).

## Out of scope (YAGNI)

- Sharing/collaboration, resume links, drag-drop reorder of sections within a
  document, pdf preview export beyond current download, payment/gating tiers.
- Migrating the old `/api/resume*` routes to be backward-compatible (dropped;
  greenfield workspace on a fresh app).