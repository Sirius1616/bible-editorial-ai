FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./
COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic
COPY scripts ./scripts

RUN uv sync --no-dev

RUN chmod +x scripts/docker-entrypoint.sh

EXPOSE 8000

CMD ["scripts/docker-entrypoint.sh"]
