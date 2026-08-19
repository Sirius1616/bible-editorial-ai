# Bible Editorial AI

> An AI-assisted editorial production platform for Bible and Christian book publishers.

Bible and Christian book publishing runs on thousands of hours of manual editorial work — drafting study notes and devotionals from scripture, routing content through editors and proofreaders, checking manuscripts against source translations, and preparing print-ready files. **Bible Editorial AI** is a single workspace that automates the drudge work while keeping the human in the loop: AI drafts, humans approve.

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic-Claude-D97757?logo=anthropic&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## Features

### AI-Powered Draft Generation
Generate study notes, devotionals, and reference entries from any Bible passage. The AI follows per-project style guides, uses the correct translation, and adapts tone to content type. Powered by **Anthropic Claude 3.5 Haiku** — falls back to offline demo mode when no API key is set.

### Editorial Review Workflow
Content moves through a structured pipeline: **Draft → In Review → Approved → Published**. Each transition is logged with timestamps and author attribution. Full version history for every content item — compare any two versions side-by-side with word-level diff.

### Inline & Verse-Level Comments
Threaded comments anchored to specific text selections or Bible verses. Click a comment to jump to the highlighted text in the editor. Comment roles: admin, editor, reviewer, proofreader can comment; viewers can read only.

### Manuscript QA
AI-powered style guide checking scores manuscripts against project editorial rules (0–100), flags violations by severity (high/medium/low), and highlights issues inline. Regex-based offline rules work without an API key.

### Translation Comparison
Compare any Bible passage across **ESV, NIV, KJV, NASB, NLT** in a side-by-side panel. Insert quotations directly into the editor. Powered by [api.bible](https://api.bible) (with key) or free [getBible](https://getbible.net) API (KJV/WEB).

### Project-Level Roles & Permissions
Per-project membership with five roles: **admin, editor, reviewer, proofreader, viewer**. Permissions are enforced server-side — editors can edit content, reviewers can approve, viewers read only. Workspace-level fallback for seamless access.

### Export
Structured Markdown and Word (.docx) export with metadata block (passage, status, date), footnotes, and cross-references. Clean formatting suitable for handoff to layout teams.

### Dark & Light Theme
Persistent theme toggle with system preference detection. Professional design system with Inter/Lora fonts and lucide icons.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0 |
| **Database** | PostgreSQL 16 |
| **AI** | Anthropic Claude 3.5 Haiku (with offline demo mode) |
| **Frontend** | React 18, Vite, React Router |
| **Migrations** | Alembic |
| **Testing** | pytest (57 tests), Vitest (32 tests) |
| **Containerization** | Docker / Docker Compose |

---

## Project Structure

```
bible-editorial-ai/
├── backend/                        # FastAPI service
│   ├── app/
│   │   ├── api/v1/                 # REST endpoints
│   │   │   ├── auth.py             # Register / login / me
│   │   │   ├── projects.py         # Projects + member management
│   │   │   ├── content.py          # Content items, versions, comments
│   │   │   ├── drafts.py           # AI draft generation
│   │   │   ├── review.py           # Editorial transitions + approvals
│   │   │   ├── style.py            # AI style-guide checking
│   │   │   ├── exports.py          # Markdown / DOCX export
│   │   │   └── translations.py     # Bible translation comparison
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # LLM prompts, export, diff, translations
│   │   ├── core/                   # Config, security, JWT
│   │   └── db/                     # Session, base
│   ├── alembic/                    # Database migrations
│   ├── tests/                      # 57 pytest tests
│   └── pyproject.toml
├── frontend/                       # React UI
│   ├── src/
│   │   ├── pages/                  # Login, Projects, ProjectDetail, Editor
│   │   ├── components/editor/      # ContentEditor, CommentsPanel, etc.
│   │   ├── hooks/                  # useEditor (state management)
│   │   ├── api/                    # API client
│   │   ├── permissions.js          # Role-based access helpers
│   │   └── __tests__/              # 32 Vitest tests
│   └── package.json
├── docker-compose.yml              # PostgreSQL + backend + frontend
├── .env.example                    # Environment template
└── scripts/seed.py                 # Demo data seeder
```

---

## Getting Started

### Option 1: Docker (recommended)

```bash
git clone https://github.com/Sirius1616/bible-editorial-ai.git
cd bible-editorial-ai

# Configure
cp .env.example .env
# Edit .env — add ANTHROPIC_API_KEY for live AI (optional)

# Start everything
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/docs |

**Demo login:** `demo@editorial.ai` / `demo-password-1`

### Option 2: Local development

```bash
# Database
docker compose up -d db

# Backend
cd backend
cp ../.env.example .env  # edit DATABASE_URL if needed
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload   # → http://localhost:8000/docs

# Frontend (new terminal)
cd frontend
npm install
npm run dev                              # → http://localhost:3000

# Seed demo data
cd .. && python scripts/seed.py
```

### Running tests

```bash
# Backend (57 tests)
cd backend && uv run pytest

# Frontend (32 tests)
cd frontend && npm test
```

---

## How It Works

### Editorial Workflow

```
Draft ──→ In Review ──→ Approved ──→ Published
  ↑           │
  └───────────┘  (rejected → back to draft)
```

Every transition is logged with author, timestamp, and optional note.

### AI Integration

The app uses **Anthropic Claude 3.5 Haiku** for two features:

| Feature | What it does | Response format |
|---|---|---|
| **AI Draft** | Writes editorial content from a Bible passage | Plain text |
| **Style Check** | Reviews a manuscript against the style guide | JSON (score + issues) |

Without an `ANTHROPIC_API_KEY`, both features fall back to offline demo mode — the app works fully without paying for API calls.

### Role-Based Access

| Role | Can do |
|---|---|
| **Admin** | Everything + manage members + delete project |
| **Editor** | Edit content, generate drafts, export |
| **Reviewer** | Approve/reject content, comment |
| **Proofreader** | Comment, read content |
| **Viewer** | Read only |

---

## API Highlights

```
POST   /api/v1/auth/register          # Create account
POST   /api/v1/auth/login             # Get JWT token

GET    /api/v1/projects               # List projects
POST   /api/v1/projects               # Create project
GET    /api/v1/projects/:id/members   # List members
POST   /api/v1/projects/:id/members   # Add member

POST   /api/v1/projects/:pid/content/:iid/draft       # AI draft
POST   /api/v1/projects/:pid/content/:iid/style-check  # AI style check
POST   /api/v1/projects/:pid/content/:iid/versions     # Save version
POST   /api/v1/projects/:pid/content/:iid/transition    # Change status
GET    /api/v1/projects/:pid/content/:iid/export        # Download MD/DOCX
GET    /api/v1/projects/:pid/content/:iid/translations  # Compare translations
```

Full interactive docs at `http://localhost:8000/docs`.

---

## Roadmap

- [x] Auth (JWT), projects, content items
- [x] AI draft generation (Anthropic Claude)
- [x] Editorial workflow (draft → review → approve → publish)
- [x] Version history + word-level diff
- [x] Inline & verse-level comments with anchoring
- [x] Project-level roles & permissions
- [x] Translation comparison sidebar (ESV, NIV, KJV, NASB, NLT)
- [x] AI style-guide checking
- [x] Markdown + DOCX export
- [x] Dark/light theme
- [ ] Task assignment & workload views (#22)
- [ ] Notifications (#23)
- [ ] n8n workflow automations (#40)
- [ ] USFM/USX import & export (#28)
- [ ] PDF export (#35)

---

## License

MIT
