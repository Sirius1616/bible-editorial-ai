# Bible Editorial AI — MVP Progress

> **Updated:** 2026-08-12 — checkpoint before starting a new session.

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
- `Drafts` — AI generation endpoint (`POST .../draft`) → stored as a new `ContentVersion`
- `Review` — approve/reject flow
- `Export` — Markdown download
- 6 passing backend tests (auth, health, project CRUD + item/review/export/comment happy path)

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
| 1 | Docker: auto-run migrations on backend start (`alembic upgrade head` before uvicorn) | 🔶 not done |
| 2 | Verify full stack with `docker compose up` (PG + backend + frontend together) | 🔶 not done |
| 3 | `.docx` export (currently Markdown only) | 🔶 not done |
| 4 | Add `OPENAI_API_KEY` to `.env` to enable the AI draft endpoint (returns 503 without it) | 🔶 needs env var |
| 5 | Frontend tests / lint pass | ⬜ optional |
| 6 | Record demo video + screenshots for the Upwork pitch to Bible publishers | ⬜ user action |
| 7 | (Post-MVP) n8n workflows, QA checker against translations, InDesign export | ⬜ deferred |

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
uv run pytest                            # backend/tests, 6 passing
```

---

## Git history (recent)

- `ae4f72b` Polish frontend: professional design system, dashboard stats, item table, editor workspace
- `9a4e413` Build frontend: auth-guarded routes, projects, item editor, versions, comments, review
- `55005cd` Add core MVP backend: models, auth, projects, content, drafts, review, exports
- `53c578f` Scaffold monorepo: FastAPI backend, React frontend, n8n, docker-compose
- `46705d0` Add project README
