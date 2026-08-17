# Bible Editorial AI — MVP Progress

> **Updated:** 2026-08-17 — comment highlight navigation, structured export format, #21 DB dockerised.

**Goal:** An AI-assisted editorial production platform for Bible / Christian book publishers
(modeled on the needs of publishers like Peachtree Publishing / Christopher Hudson).
Stack: FastAPI + PostgreSQL + React (Vite) + n8n, with AI draft generation.

**Repo:** `github.com/Sirius1616/bible-editorial-ai` (branch `main`)
**Demo login:** `demo@editorial.ai` / `demo-password-1`

---

## What's accomplished

### Phase 1 — Data model & database ✅
- SQLAlchemy models: `User`, `Project`, `ContentItem`, `ContentVersion`, `Comment`
- Alembic migration (5 tables), applied to local DB
- JWT auth (register/login/me) with bcrypt password hashing
- Seed script (`scripts/seed.py`) — demo user + sample project + content items

### Phase 2 — Core API ✅
- `Projects` CRUD (owner-scoped)
- `ContentItems` create/list/get/update/delete, versions + comments
- `Drafts` — AI generation endpoint (`POST .../draft`) → stored as a new `ContentVersion`;
  improved prompt (content-type tone, translation, style guide), graceful upstream errors,
  offline demo-mode mock when `OPENAI_API_KEY` is unset
- `Review` — approve/reject flow
- `Export` — Markdown + `.docx` download (`?format=md|docx`)
- 8 passing backend tests (auth, health, project CRUD + item/review/export/comment happy path)

### Phase 3 — Frontend workspace ✅
- Auth-guarded routing (`/login`, `/projects`, `/projects/:projectId`,
  `/projects/:projectId/items/:itemId`)
- Login/register page (branded split-screen)
- Projects dashboard: stat cards (items / in-review / approved / rejected),
  project cards with approval progress bars, create-project form
- Project detail: content-items table, status filter tabs, live search, create-item form,
  empty states
- Item editor: serif content textarea, save-as-new-version, versions history, comments
  thread, Approve/Reject, Markdown export, "Generate AI draft" button
- Professional design system: Inter/Lora fonts, lucide icons, badges, skeletons, alerts

### Demo data ✅
- Seeded ~8 content items across statuses (draft / approved / rejected) with versions
  and comments so the workspace looks real.

---

## Remaining for MVP

| # | Task | Status |
|---|------|--------|
| 1 | Docker: auto-run migrations on backend start (`alembic upgrade head` before uvicorn) | ✅ done (issue #15) |
| 2 | Verify full stack with `docker compose up` (PG + backend + frontend together) | ✅ done (issue #16) |
| 3 | `.docx` export (currently Markdown only) | ✅ done (issue #17) |
| 4 | Add `OPENAI_API_KEY` to `.env` to enable the AI draft endpoint | ✅ done (issue #18) |
| 5 | Frontend tests / lint pass | ✅ done (issue #19) |
| 6 | Record demo video + screenshots for the Upwork pitch to Bible publishers | ⬜ user action |
| 7 | (Post-MVP) n8n workflows, QA checker against translations, InDesign export | ⬜ deferred |

---

## Build sequence (dependency-safe order)

Priorities are set on GitHub issues as `priority:p1` … `priority:p5`. Each phase can be built
in parallel internally; phases run in order because later phases depend on earlier ones.

### Phase 1 — MVP close-out (`priority:p1`)
| # | Issue | Builds on |
|---|-------|-----------|
| #15 | Docker: auto-run migrations on backend start | ✅ done |
| #17 | Backend: .docx export | export endpoint (done) ✅ |
| #19 | Frontend: lint + tests | — (fully parallel) ✅ |
| #16 | Verify full stack with `docker compose up` | ✅ done |
| #18 | Enable + validate AI drafts (OPENAI_API_KEY) | draft endpoint (done) ✅ |
| #41 | Demo video + screenshots for Upwork pitch | everything in P1 |

### Phase 2 — Editorial core (`priority:p2`)
| # | Issue | Builds on |
|---|-------|-----------|
| #20 | Editorial workflow states (assigned → … → ready) | item status (done) ✅ |
| #30 | Verse-level anchoring, footnotes & cross-refs | item model (done) ✅ |
| #32 | Version diffing | versions (done) ✅ |
| #31 | Inline / verse-level comments | #30 + comments (done) ✅ |

### Phase 2 — Editorial core (in progress)
- ✅ #20 Editorial workflow states: `assigned → in_progress → in_review → qa → ready → archived`,
  validated transitions + auditable `status_history`, optional `due_date`, frontend badges/filters/
  transition control/history panel, seed data across all states
- ✅ #30 Verse-level anchoring, footnotes & cross-references: `verse_start/verse_end` structured
  (book/chapter/verse) anchors on items with auto-derived passage label, `footnotes` + `cross_refs`
  JSON on versions, editor anchor panel + footnote/cross-ref fields, Markdown/.docx export sections,
  seeded demo references
- ✅ #32 Version diffing: `GET .../versions/diff?from=N&to=M` (word- and line-level via
  `difflib.SequenceMatcher`), editor "Compare…" picker with green add / red remove highlights
- 🔶 #31 Inline / verse-level comments — **done** ✅ (closed 2026-08-13)
  - Backend ✅: `Comment` gains `parent_id` (one-level threads), `resolved`, and anchors
    (`anchor_type` text|verse, `anchor_start/end`, `anchor_text`); migration `f5e6d7c8b9a0`
    applied; `POST /comments` accepts anchors + `parent_id`, new `PATCH /comments/{id}`
    (resolved/body), 404/400 validation for replies; 2 backend tests (24 passing total)
  - Frontend ✅: anchored composer (Whole item / Selected text / Verse tabs), threaded
    replies with Resolve/Reopen, "Annotate" toggle that renders inline `<mark>` markers for
    text-anchored comments (click jumps to the thread). Added 6 Vitest UI tests in
    `frontend/src/__tests__/comments.test.jsx` (thread rendering, inline markers + jump,
    whole-item / text-anchored / verse-anchored posting, threaded reply, resolve/reopen);
    stubbed `scrollIntoView` for jsdom in `src/test/setup.js`. 12 frontend tests passing,
    lint 0 errors, `npm run build` clean. Live Playwright smoke check against the running
    stack (login → item → anchor → verse → reply → resolve → annotate) passes all 7 steps.

### Phase 3 — AI intelligence (`priority:p3`)
| # | Issue | Builds on |
|---|-------|-----------|
| #24 | AI: style-guide adherence checking | AI pattern from #18 — ✅ done |
| #27 | AI: translation comparison sidebar | #30 verse anchoring |
| #25 | AI: Scripture QA (verse-quote verification) | #30 + #27 |
| #26 | AI: cross-reference & terminology consistency | #30 |

- ✅ #24 Style-guide adherence checking: `POST .../items/{id}/style-check` (optional `body`,
  defaults to latest version) → score 0-100 + issues (snippet/reason/severity). AI mode returns
  strict JSON via OpenAI; demo mode uses rule-based mock (first-person, intensifiers, wordiness,
  placeholders, exclamations). Frontend: "Style check" button in the editor, score badge + issue
  cards panel, inline `<mark>` highlights with severity colors and a toggle. 5 backend tests + 2
  Vitest tests (29 pytest / 14 frontend passing), lint 0 errors, build clean, live Playwright
  smoke verified (score 69/100, 3 flagged issues, 2 inline marks).
- ✅ #27 Translation comparison sidebar: `GET .../items/{item_id}/translations` uses the item's
  verse anchor → KJV/WEB (public domain) always, plus ESV/NIV/NASB/NLT slots. Real mode fetches
  all five via api.bible (Scripture API) when `BIBLE_API_KEY` is set; demo mode serves a bundled
  public-domain KJV/WEB dataset (seeded passages, fully offline) with a clear "demo data" note.
  Frontend: "Translations" toggle in the editor loads the comparison panel (reference, per-version
  cards with serif text, "Insert quote" inserts `“{text}” ({name}, {reference})` at the cursor),
  400 when the item has no verse anchor. 6 backend tests + 4 Vitest tests (35 pytest / 18
  frontend passing), lint 0 errors, build clean, live smoke verified (login → item → panel → 6
  cards → insert quote). Demo DB items re-anchored to their seeded passages.

### Frontend maintenance & UX pass (2026-08-14, no issue)
- ✅ **Refactor:** `pages/Editor` slimmed to a thin container; all state/handlers moved to
  `hooks/useEditor` (single `editor` object), panels extracted to `components/editor/*`,
  shared `StatusBadge` in `components/ui/` (also used in ProjectDetail), pure helpers in
  `lib/format.js` + `lib/annotations.js`; one `styles.css` split into
  `styles/{base,layout,projects,auth,editor}.css`; deleted dead `store/` barrel.
- ✅ **Feature:** delete individual content versions — `DELETE .../items/{item_id}/versions/{version_id}`
  (404 if missing, 400 if it's the item's only version) + trash button with confirm in the
  Versions tab; 3 new backend tests.
- ✅ **UX/theme:** the six side panels now live in one tabbed sidebar card
  (Versions / Diff / Translations / Style / History / Comments) with live count badges,
  defaulting to Comments and auto-switching on Style check / Translations / annotation clicks;
  palette retuned to a standard light-gray background with indigo primary (`#4f46e5`),
  neutral borders, and refined semantic colors.
- Tests: 38 pytest / 19 Vitest passing, lint 0 errors, build clean.

### Dark & light mode (2026-08-14, no issue)
- ✅ **Theme toggle:** dark + light themes via `data-theme` attribute on `<html>`; toggle button
  (sun/moon) in the topbar next to logout. Choice persists to `localStorage`
  (`editorial-theme`); first visit follows the OS `prefers-color-scheme`. An inline script in
  `index.html` sets the theme before React mounts to avoid a flash of the wrong theme.
- ✅ **Implementation:** all colors live on CSS variables in `styles/base.css` under `:root`
  (light) and `[data-theme="dark"]` (dark indigo-neutral palette); `ThemeProvider` + `useTheme`
  in `src/theme.jsx` wraps the app in `App.jsx`. Hardcoded colors were converted to variables
  (focus ring, topbar bg, alert borders, badge/stat gold, QA badge), and editor text annotations
  (diff add/del, inline marks, style marks) got dark-specific overrides.
- ✅ **Test:** new theme toggle test in `auth.test.jsx` (renders App, clicks toggle, asserts
  `data-theme` + persisted storage round-trip). 25 Vitest passing, lint 0 errors, build clean.

### Design polish pass (2026-08-14, no issue)
Senior-designer review of the UI → targeted fixes for hierarchy, consistency, and template tells
(not a redesign):
- **Type hierarchy:** stat numbers bumped to `1.6rem` with tabular numerals (numbers anchor the
  dashboard); one "eyebrow" style for all section titles (`.card-title`, `.panel-title h2` —
  small uppercase, tracked, muted); field labels dropped uppercase → sentence-case semibold, so
  labels no longer shout over the titles they label.
- **Color semantics:** statuses remapped — assigned=gray, in_progress=indigo, in_review/QA=amber,
  ready=green, archived=gray (was red "rejected"); roles: only `owner` is emphasized (indigo),
  admin/member/viewer are neutral gray; amber no longer doubles as brand-mark color.
- **One "selected" language:** all tabs (sidebar/filter/workspace/anchor) now use the same
  soft-indigo active state instead of three different treatments (this also fixes the
  white-on-light-indigo contrast bug in dark mode).
- **Brand mark:** icon now `var(--surface)` on primary — white in light, dark chip in dark mode
  (was low-contrast gold).
- **Alignment/rhythm:** unified card/editor-panel padding, centered `page-head` actions,
  editor metadata line rebuilt as `.meta-line` (gap-based, `·` separators — no more
  `marginLeft` hacks), Workspaces "manage" affordance switched from an `X` to a `Settings` icon,
  secondary button no longer inverts to solid on hover, buttons got `focus-visible` rings.
- **Auth hero (kept layout, lost the template feel):** added a gold "Editorial production studio"
  kicker eyebrow, softened the SVG grid pattern, deepened the navy-indigo gradient, and swapped
  the quote's white hairline for a gold one. 25 Vitest, lint 0 errors, build clean.
- ✅ **Bugfix:** editor toolbar no longer blows out when a toggle label grows — `.panel-title`
  (and its action row) now wrap, so toggling "Translations" → "Hide translations" wraps the
  buttons instead of pushing "Generate AI draft" off the panel.

### Phase 4 — Team & workspace (`priority:p4`)
| # | Issue | Builds on |
|---|-------|-----------|
| #36 | Multi-tenancy (workspaces) + invites | — (start early, team base) ✅ |
| #21 | Roles & permissions | #36 |
| #22 | Task assignment & workload | #36 |
| #23 | Notifications (in-app + email via n8n) | #22 |
| #34 | Mentions & audit trail | #23 (audit part is standalone) |
| #33 | Multi-step sign-off workflow | #20 + #21 |

- ✅ #36 Multi-tenancy (workspaces) + invites — **done** (2026-08-14)
  - Backend ✅: `Workspace` / `WorkspaceMember` (roles: owner/admin/member/viewer) / `Invitation`
    models; alembic migration `c9d4e7f1a2b3` creates the tables and backfills a personal workspace
    per user (existing projects assigned to it); registration auto-creates the personal workspace;
    projects now belong to a workspace
  - Access ✅: every project/item/version/comment route now enforces workspace membership
    (`get_accessible_project`, 404 on foreign data — two publishers cannot see each other's data);
    `ensure_editor` (owner/admin/member) gates project/item mutations, so `viewer` is read-only
  - Invite flow ✅: invite-by-email → join link (`/invite/{token}`), accept while logged in,
    or register-and-join via token; roles applied on accept; duplicate invite → 409,
    revoke, expiry (7-day default). **Note:** join link is shared manually for now (copy button
    in the UI); actual email delivery of invites is deferred to n8n — part of #23/#40, no SMTP
    built in #36 to avoid a second email channel that n8n would supersede
  - Workspace management ✅: create/rename/delete (owner only, blocked while it has projects),
    member list, role changes, member removal, ownership transfer (previous owner becomes admin)
  - Frontend ✅: workspace switcher on the Projects page (project create picks the workspace),
    `/workspaces` list, `/workspaces/:id` settings (members + roles + invites + transfer +
    rename/delete), `/invite/:token` join page; "Workspaces" link in the topbar
  - Demo ✅: seed adds `coeditor@editorial.ai` (member) to the demo workspace; 12 backend tests +
    5 frontend tests (50 pytest / 24 Vitest), lint 0 errors, build clean, live smoke verified
    (demo + coeditor share projects, foreign workspace → 404)

- ✅ #21 Roles & permissions — **done** (2026-08-14)
  - Role model ✅: `ProjectMember` (project_id, user_id, role, unique per project) — per-project
    roles `admin / editor / reviewer / proofreader / viewer`; migration `d1e5f9a3b4c6` creates the
    table and backfills each project's creator as `admin`; creator auto-added as admin on create
  - Effective role ✅: explicit `ProjectMember` role wins; otherwise falls back to the workspace
    role (owner/admin → admin, member → editor, viewer → viewer) so existing memberships keep
    working without per-project rows. Every project response now includes `member_count` + `my_role`
  - Permission checks ✅: content edit (items/versions/anchors/AI draft/delete) requires
    admin|editor; transitions + approve/reject require admin|reviewer (editors can no longer
    approve); comments/style-check require non-viewer; export requires admin|editor; project
    update/delete + member management require admin — all enforced server-side (403)
  - Member management ✅: `GET/POST /projects/{id}/members`, `PATCH .../members/{user_id}`,
    `DELETE .../members/{user_id}` — add a workspace member with a role, change roles, remove;
    last-admin guard (can't demote/remove yourself as the only admin), 409 on duplicate,
    400 if the target isn't a workspace member
  - Frontend ✅: "Project members" card on the project page (list + role dropdown + remove +
    add-from-workspace picker, admin only); permission-aware editor — read-only textarea + hidden
    save/change-note/footnotes/AI-draft for non-editors, transition control only for
    admin/reviewer, export only for admin/editor, comment composer hidden for viewers,
    version-delete hidden for non-editors
  - Tests ✅: 7 backend role tests (creator-admin, per-role matrix, fallback, viewer read-only,
    admin management + last-admin guard, non-workspace add → 400) + 5 Vitest UI tests
    (members card, add/change/remove, viewer hides controls) + 1 editor read-only test —
    57 pytest / 32 Vitest, lint 0 errors, build clean; migration verified end-to-end on a fresh
    Postgres (full chain `upgrade head` + backfill)

### Phase 5 — Publishing, business & integrations (`priority:p5`)
| # | Issue | Builds on |
|---|-------|-----------|
| #28 | USFM/USX import & export | #30 |
| #29 | Manuscript import (Word/PDF) | — |
| #35 | PDF export | #17 pattern |
| #40 | n8n automations (webhooks) | — |
| #37 | Billing & subscriptions (Stripe) | #36 |
| #38 | Global search | — |
| #39 | Analytics dashboard | — |

**Rule of thumb:** never start a phase until the phases before it are done; within a phase,
parallelize freely (they don't block each other).

---

## How to run locally

```bash
# 1. Env
cp .env.example .env   # then edit DATABASE_URL/OPENAI_API_KEY

# 2. Database (PostgreSQL must be running — or via Docker)
docker compose up -d db

# 3. Backend (from backend/)
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload   # http://localhost:8000/docs

# 4. Frontend (from frontend/)
npm install
npm run dev                              # http://localhost:3000

# 5. Tests
uv run pytest                            # backend/tests, 57 passing
```

---

## Git history (recent)

- `295b413` feat: bidirectional comment highlight navigation — auto-activate annotations, click comment to scroll to highlight
- `1b22c81` feat: structured export format with metadata, footnotes and cross-refs
- `ab7892d` feat: project-level roles & permissions — per-project member roles, permission-gated endpoints, member management UI, read-only editor for restricted roles (#21)
- `958e8c9` docs: note invite email delivery deferred to n8n (#23/#40)
- `a1e98eb` docs: record #36 commit hash in PROGRESS.md
- `2309a53` feat: multi-tenant workspaces with invites and roles (#36)
- `1fcaa79` docs: record frontend maintenance pass in PROGRESS.md
- `22756d5` feat: tabbed editor sidebar and neutral indigo theme
- `28a4ac2` feat: delete individual content versions
- `a61adee` refactor: split editor into hook + panel components, share StatusBadge, split styles
- `abdb64a` fix: editor toolbar wraps instead of pushing buttons off panel
- `48a8ad7` style: design polish pass — hierarchy, consistency, template cleanup
- `71ab5e2` feat: dark and light theme with persistent toggle
- `d4ca2aa` AI translation comparison sidebar: GET .../translations (api.bible real mode + bundled public-domain KJV/WEB demo), editor panel + insert quote (#27)
- `1b350dc` AI style-guide adherence checking: style-check endpoint (score + issues), demo rules, editor button/panel/inline highlights (#24)
- `380af69` Inline / verse-level comments: comment-UI Vitest tests (6) + jsdom scrollIntoView stub, live smoke verified (#31)
- `95570ba` Inline / verse-level comments: backend anchors/threads/resolve + frontend composer/markers (#31, WIP)
- `b7bfe86` docs: record #31 commit hash in PROGRESS.md
- `e1d6e5d` Version diffing: compare any two versions (word/line level) (#32)
- `11f1521` Verse-level anchoring, footnotes & cross-references (#30)
- `aa8fbb0` Editorial workflow states: transitions, history, due dates (#20)
- `8e502e8` Frontend: lint + Vitest UI tests (auth guard, projects, editor) (#19)
- `e07c98c` Enable + validate AI drafts: tuned prompt, graceful errors, demo-mode mock (#18)
- `403c8c2` Backend: .docx export (format=md|docx) (#17)
- `ae4f72b` Polish frontend: professional design system, dashboard stats, item table, editor workspace
- `9a4e413` Build frontend: auth-guarded routes, projects, item editor, versions, comments, review
- `55005cd` Add core MVP backend: models, auth, projects, content, drafts, review, exports
- `53c578f` Scaffold monorepo: FastAPI backend, React frontend, n8n, docker-compose
- `46705d0` Add project README
