# CraftCV — Auth, Cloud Persistence, and Version History

Date: 2026-08-27
Status: Approved design

## Goal

Host CraftCV (the `craft-cv` resume builder on Next.js 13) on Vercel behind user
accounts, persist each user's resume data server-side in a database, and add
git-like edit history so a user can save named versions and roll back to a past
one. PDFs are never stored — they are generated on demand client-side from the
resume data (existing react-pdf path).

## Stack decisions (confirmed with user)

- **Deploy target:** Vercel team `tomcallans-projects`, git-push deploys from
  the existing `git@github.com:TomCallan/open-resume.git` remote.
- **Auth:** Clerk, pinned to `@clerk/nextjs@^5` (the `latest-nextjs-v5` line,
  e.g. 5.7.6). Clerk v5/v6 require `next >= 13.5.4`; the project is on
  `13.4.4`, so `next` is upgraded to `^13.5.x` (low-risk minor). React stays
  18. Clerk v7 (Core 3) is not used — it requires Next 15/React 19, a breaking
  stack change out of scope here.
- **Storage:** Neon Postgres provisioned through the Vercel Marketplace
  (`vercel integration add neon`), driven by `@neondatabase/serverless` with
  lazy client init (build-time safe in Next).
- **Env provisioning:** Vercel Marketplace integration for both Clerk and Neon
  auto-injects env vars into the linked project.
- **Builder gating:** the `/resume-builder` route and `/api/resume*` routes
  require login. Home and `/resume-parser` stay public.
- **UI for versions:** inline panel inside the builder (no separate page).
- **Template picker placement:** move the `ThemeForm` block (which contains the
  template picker) to the top of the builder form, above `ProfileForm`.

## Architecture

### 1. Deployment

1. `vercel link --repo --scope tomcallans-projects` to link the repo to Vercel.
2. Provision integrations via Marketplace:
   `vercel integration add clerk` and `vercel integration add neon`. These are
   interactive (browser account setup) — the user completes the dialogs. They
   provision `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and
   `DATABASE_URL` into the linked project.
   Fallback if the headless flow blocks: the user creates the Clerk app and Neon
   database manually and provides connection values; env vars are then set via
   `vercel env add` and `.env.local` for local dev.
3. `vercel env pull .env.local --yes` for local development.
4. Deploy by git push; production branch `main` gets the production deployment.

### 2. Auth (Clerk v5)

- Add `@clerk/nextjs`, upgrade `next` to `^13.5.x`.
- `middleware.ts` with `clerkMiddleware`; a route matcher protects
  `/resume-builder` and `/api/resume*` (redirect unauthenticated users to
  `/sign-in`; API returns 401).
- `<ClerkProvider>` wraps the app in `src/app/layout.tsx`. Clerk v5 uses
  `ClerkProvider` from `@clerk/nextjs` (import paths differ slightly from v7 —
  follow v5 docs).
- `/sign-in/[[...sign-in]]` and `/sign-up/[[...sign-up]]` catch-all pages with
  `<SignIn/>` / `<SignUp/>`.
- `<UserButton/>` in `TopNavBar`, plus a Sign-in link when signed out.

### 3. Storage schema (Neon Postgres)

```sql
-- Live working copy, autosaved
CREATE TABLE resumes (
  user_id      TEXT PRIMARY KEY,
  resume       JSONB NOT NULL,
  settings     JSONB NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Git-like snapshots
CREATE TABLE versions (
  user_id      TEXT NOT NULL,
  version      INTEGER NOT NULL,
  resume       JSONB NOT NULL,
  settings     JSONB NOT NULL,
  name         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, version)
);
```

- `user_id` = Clerk `userId` (from `auth()`).
- DB client in `src/lib/db.ts` using lazy init:
  `function createDb() { const sql = neon(process.env.DATABASE_URL!); ... }`
  with a memoized `getDb()`. No Proxy wrapper around the client.

### 4. API routes (all authed)

- `GET /api/resume` — return current `resumes` row for the user (or empty).
- `PATCH /api/resume` — upsert current `resume`+`settings` (autosave).
- `GET /api/resume/versions` — list `versions` ordered by `version` desc.
- `POST /api/resume/versions` — body `{ name }`; push the current working copy
  as a new snapshot with version = max+1 and the given name.
- `POST /api/resume/restore` — body `{ version }`; copy that snapshot into the
  current `resumes` row AND add a new `versions` entry named `Restored vN`
  (non-destructive rollback; old snapshots never mutated).

### 5. Client wiring (minimal intrusion)

- `src/lib/redux/hooks.tsx`:
  - `useSetInitialStore`: when an authenticated user exists, fetch
    `GET /api/resume` and seed the store from server data (deep-merge with
    `initialResumeState`/`initialSettings` for backward compatibility), falling
    back to localStorage when there is no server row or no user. This preserves
    the existing legacy/anonymous local flow.
  - `useSaveStateToLocalStorageOnChange`: keep local autosave; additionally
    `PATCH /api/resume` (debounced) when signed in.
- New `VersionHistoryPanel` component rendered in the builder: lists versions,
  provides a "Save version" action (prompts for a name), and a restore action
  per row. On restore, refetch current state and hydrate the store.
- `src/app/components/ResumeForm/index.tsx`: move the `<ThemeForm />` render to
  the top of the section (above `<ProfileForm />`) so the template picker sits
  at the top of the builder.
- PDF path untouched: PDF is generated from `resume` state by the existing
  client-side react-pdf code; nothing stored.

## Data flow summary

1. Signed-in user opens builder → client fetches latest `resumes` row, hydrates
   Redux store (falls back to localStorage if no server data yet — e.g. first
   login, existing local resume becomes their first saved copy on first
   autosave).
2. Editing updates the store (no change); debounced autosave writes to
   localStorage AND upserts the `resumes` row.
3. "Save version" snapshots current state as a new numbered version.
4. "Restore vN" rewinds the current working copy to that snapshot and records a
   `Restored vN` version so the action itself is preserved in history.

## Error handling

- API routes: 401 when unauthenticated; 400 on missing/invalid body fields;
  500 wrapped with a minimal message. Client surfaces a non-blocking toast/inline
  error and continues using the local store so work is never lost.
- Server unreachable: autosave PATCH silently degrades (local persistence still
  active); a banner in the history panel shows sync failures.

## Testing

- Keep the existing jest suite green after the `next` 13.5 upgrade; fix any
  tests that break from the middleware/layout changes.
- Add a `local-storage`-style unit test for the version-restore data helper
  (pure function that picks a snapshot and frames the `Restored vN` row).
- Manual/CI smoke: DB schema applied; API routes return expected shapes for an
  authed vs unauthed request.

## Out of scope (YAGNI)

- Free public resume browsing, sharing links, multi-resume profiles per user,
  branching/merging of version history, marketing/auth email flows beyond
  Clerk defaults.