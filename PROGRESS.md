# Bible Editorial AI — MVP Progress

> **Updated:** 2026-08-14 — #27 (translation comparison sidebar) done; #24 and #31 closed earlier.

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

### Phase 4 — Team & workspace (`priority:p4`)
| # | Issue | Builds on |
|---|-------|-----------|
| #36 | Multi-tenancy (workspaces) + invites | — (start early, team base) |
| #21 | Roles & permissions | #36 |
| #22 | Task assignment & workload | #36 |
| #23 | Notifications (in-app + email) | #22 |
| #34 | Mentions & audit trail | #23 (audit part is standalone) |
| #33 | Multi-step sign-off workflow | #20 + #21 |

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
uv run pytest                            # backend/tests, 8 passing
```

---

## Git history (recent)

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
