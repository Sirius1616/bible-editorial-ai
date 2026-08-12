# n8n Workflows

Workflow automations for the Bible Editorial AI platform.

## Planned workflows

- **Upload trigger** — watch a shared drive for manuscript uploads, notify the API
- **Scheduled drafts** — kick off AI draft generation on a schedule
- **QA notification** — notify teams when QA completes

## Usage

Workflow JSON exports live in `workflows/`. Import them in n8n via **Workflows → Import**, or mount this directory into your n8n container (see root `docker-compose.yml`).

## Backend integration

Workflows call the FastAPI endpoints under `http://backend:8000/api/v1/`:

| Workflow | Endpoint |
|---|---|
| Upload trigger | `POST /api/v1/drafts` |
| QA notification | `POST /api/v1/qa/{item_id}/run` |
