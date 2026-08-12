# Bible Editorial AI

AI-assisted editorial production platform for Bible publishers.

Bible and Christian book publishing runs on thousands of hours of manual editorial work: drafting study notes and devotionals from scripture, routing content through proofreaders and editors, checking manuscripts against source translations, and preparing print-ready files. Bible Editorial AI is a single workspace that automates the drudge work while keeping the human in the loop — AI drafts, humans approve.

## Features

- **AI draft generation** — generate study notes, devotionals, and reference entries from a Bible passage with per-project style controls.
- **Editorial review workflow** — routing, approvals, comments, and full version history for every content item.
- **Manuscript QA** — check manuscript text against source translations, flagging deviations, broken verse references, and term inconsistencies.
- **Project & team management** — organize work by Bible project with per-user roles (writer, editor, proofreader, approver).
- **Export** — produce Markdown/Word output today, with InDesign-ready export on the roadmap.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy |
| Database | PostgreSQL |
| Workflow automation | n8n |
| Frontend | React |
| AI | LLM integration (draft generation, QA analysis) |
| Migrations | Alembic |
| Containerization | Docker / docker-compose |

## Project Structure

```
├── backend/                     # FastAPI service
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint
│   │   ├── api/v1/              # REST routers
│   │   │   ├── projects.py      # Bible projects, team routing
│   │   │   ├── drafts.py        # AI draft generation
│   │   │   ├── review.py        # editorial review, approvals, versions
│   │   │   ├── qa.py            # manuscript/translation consistency QA
│   │   │   └── exports.py       # InDesign/Word/PDF-ready export
│   │   ├── core/                # config, security, settings
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # LLM prompts, QA logic, export
│   │   └── db/                  # session, base
│   ├── alembic/                 # migrations
│   ├── tests/
│   └── pyproject.toml
├── frontend/                    # React UI
│   ├── src/
│   │   ├── pages/               # projects, editor, review, QA dashboards
│   │   ├── components/
│   │   ├── api/
│   │   └── store/
│   └── package.json
├── n8n/                         # workflow JSON exports
│   ├── workflows/
│   └── README.md
├── docker-compose.yml           # PostgreSQL + backend + n8n + frontend
├── .env.example
└── README.md
```

## Data Flow

1. **n8n** watches uploads and triggers (new passage, file dropped, scheduled task).
2. **FastAPI** receives the trigger and generates a first draft via the LLM service.
3. Drafts route through the **editorial workflow** — writer edits, proofreader checks, approver signs off — with full version history.
4. **PostgreSQL** stores projects, content items, versions, and comments.
5. The **React frontend** is the editorial workspace: edit, comment, approve.
6. **QA service** checks the final manuscript against source translations before export.

## Getting Started

> Note: services are scaffolded incrementally — see the [Roadmap](#roadmap) for current status.

```bash
# 1. Clone the repository
git clone https://github.com/Sirius1616/bible-editorial-ai.git
cd bible-editorial-ai

# 2. Configure environment
cp .env.example .env

# 3. Start the stack
docker-compose up -d
```

Services (once scaffolded):

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| n8n | http://localhost:5678 |

## Roadmap

- [ ] MVP: auth, projects, AI draft generation, editorial review, Markdown export
- [ ] Version history and comments
- [ ] n8n workflow triggers (upload, scheduled, webhook)
- [ ] Manuscript QA against source translations
- [ ] InDesign-ready export

## License

MIT
