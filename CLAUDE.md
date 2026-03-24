# CLAUDE.md

## Project Overview
<!-- Replace with 1-2 sentence project description -->
This project is [DESCRIPTION]. Built with FastAPI + React + PostgreSQL, fully containerized with Docker.

## Tech Stack
- **Backend:** Python 3.11+ / FastAPI (async)
- **Frontend:** React (TypeScript)
- **Database:** PostgreSQL via SQLAlchemy (async) + Alembic migrations
- **Data Processing:** Polars (Pandas only when ML libs require it)
- **Containerization:** Docker + Docker Compose

## Project Structure
```
src/
├── main.py              # FastAPI app entrypoint
├── config.py            # Pydantic BaseSettings (.env driven)
├── database.py          # Async engine + session
└── modules/<feature>/   # router.py, schemas.py, models.py, service.py
frontend/src/            # React app
tests/                   # pytest: unit + integration + E2E
alembic/                 # DB migrations
```

## Commands
```bash
# Dev
docker compose up --build          # Start all services
docker compose exec api bash       # Shell into API container

# Test
docker compose exec api pytest -x -q                    # All tests (stop on first fail)
docker compose exec api pytest tests/test_health.py -v  # Single file

# DB migrations
docker compose exec api alembic upgrade head
docker compose exec api alembic revision --autogenerate -m "desc"

# Lint / Format (always verify after changes)
docker compose exec api ruff check src/ --fix
docker compose exec api ruff format src/

# Cleanup
docker system prune -f && docker image prune -f
```

## Critical Rules
- IMPORTANT: ALL secrets via `.env` + Pydantic `BaseSettings` — never hardcode
- IMPORTANT: ALL FastAPI I/O endpoints MUST use `async/await` — never sync in async routes
- IMPORTANT: Use UPSERT over INSERT for idempotency
- Use type hints in all Python code
- Use `logging` (not `print`) — levels: DEBUG / INFO / WARNING / ERROR
- API routes versioned: `/api/v1/...` — always include `GET /health`
- Never use `["*"]` for CORS origins in production
- Alembic for all schema changes — never manually ALTER tables
- Docker multi-stage builds — always include `.dockerignore`

## When Adding a Feature
Create the full module under `src/modules/<feature>/`:
- `router.py` — API endpoints
- `schemas.py` — Pydantic request/response models
- `models.py` — SQLAlchemy ORM model
- `service.py` — Business logic
- `tests/test_<feature>.py` — Tests

## Further Reading
<!-- Create these docs as project evolves — Claude will read on demand -->
- For architecture decisions: `docs/architecture.md`
- For API design conventions: `docs/api-conventions.md`
- For testing strategy: `docs/testing.md`
- For deployment: `docs/deployment.md`
