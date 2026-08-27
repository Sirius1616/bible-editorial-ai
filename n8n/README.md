# n8n Workflows

Workflow automations for the Bible Editorial AI platform.

## Workflows

- **Send Email** (`workflows/send-email.json`) — receives a webhook trigger from the backend at
  `/webhook/send-email` and sends the email via SMTP. Used for invite emails and notification
  emails.

## Usage

Workflow JSON exports live in `workflows/`. Import them in n8n via **Workflows → Import**, or mount
this directory into your n8n container (see root `docker-compose.yml`).

The `send-email` workflow is active and listens on `/webhook/send-email`. When the backend triggers
it (with `to`, `subject`, `html`), it sends the email using the SMTP credentials passed to the n8n
container (see `SMTP_*` env vars in `docker-compose.yml`).

## Backend integration

Workflows call the FastAPI endpoints under `http://backend:8000/api/v1/`:

| Workflow | Endpoint |
|---|---|
| Send Email | `POST http://backend:8000/api/v1/...` (triggering n8n) |

The backend POSTs to `http://n8n:5678/webhook/send-email` (internal Docker network).

