# Ask Francisco To — Design Spec

**Date:** 2026-03-18
**Status:** Approved

---

## Overview

A dead-simple public request intake website. People who would normally WhatsApp Francisco land here, fill out a short form, and leave a request. Francisco checks an admin view at his leisure to see all requests and manage them.

No accounts. No auth system. No complexity. Docker Compose + a dream.

---

## Public Page (`/`)

A single-page form with a warm purple gradient (friendly & approachable vibe). Fields:

| Field | Required | Description |
|-------|----------|-------------|
| Name | No | Free text |
| Contact | No | Any format — WhatsApp, email, phone, whatever |
| Request | **Yes** | Free text, max 2000 chars |

After submitting successfully, show a thank-you screen ("Got it, thanks! Francisco will see your request.") replacing the form in-place. If the POST fails (network error or validation error), show a friendly inline error ("Something went wrong, please try again.").

The client should validate that `message` is non-empty before submitting. The server also validates and returns `400 { error: "message is required" }` if missing.

> **Known accepted risk:** No rate limiting on the public form. Spam is possible. Acceptable at this scale — revisit if it becomes a problem.

---

## Admin View (`/admin`)

No login system. Protected by a **secret word** typed into a field on the page. Until the correct word is entered, requests are hidden. Wrong word = nothing shown, no error message (silent fail by design — Francisco knows he got it wrong if the list stays empty; if the inbox is empty the field placeholder provides context).

Once unlocked, shows:

- **Pending requests** — listed newest first, with name, contact, message, and relative timestamp
- **Mark as done** — sets the request to done, moves it to a "completed" section below, greys it out. One-way action — requests cannot be un-marked.
- **Delete** — removes the request permanently
- **Completed section** — visible below the pending list, collapsed by default (a clickable "Show completed (N)" toggle expands it). Only delete is available on completed items.

The secret word is stored as the `ADMIN_SECRET` environment variable, never hardcoded. An `.env.example` file is included in the repo. The app must refuse to start if `ADMIN_SECRET` is not set or is empty — log a fatal error and exit.

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | Next.js (App Router) | API routes + UI in one, easy Vercel-style deploy |
| Database | PostgreSQL 16 | Reliable, works great in Docker Compose, no native compilation headaches |
| ORM | Prisma | Type-safe queries, handles migrations cleanly |
| Styling | Tailwind CSS | Fast to build, easy to maintain |
| Containers | App + Postgres (2 services) | Standard `docker-compose.yml` for Dokploy |

---

## Data Model

```prisma
model Request {
  id        Int      @id @default(autoincrement())
  name      String?
  contact   String?
  message   String
  done      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

Prisma runs `prisma migrate deploy` on container startup via the entrypoint script, before the Next.js server starts. No manual migration step needed on deploy.

---

## API Routes

All admin routes require `X-Admin-Secret: <value>` header. Secret comparison must use `crypto.timingSafeEqual` — SHA-256 hash both the provided secret and `process.env.ADMIN_SECRET` before comparing, so lengths always match and there is no timing leak. If the header is missing or wrong, return `200 { ok: false, data: null }`.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/requests` | None | Submit a new request. Returns `201` on success, `400 { error }` if `message` is empty. |
| `GET` | `/api/requests` | `X-Admin-Secret` | Returns `{ ok: true, data: [...] }` (flat array, newest first) on valid secret, `{ ok: false, data: null }` otherwise. Client splits by `done` field. |
| `PATCH` | `/api/requests/[id]` | `X-Admin-Secret` | No body required. Always sets `done = 1`. Returns `{ ok: true }` or `{ ok: false }`. |
| `DELETE` | `/api/requests/[id]` | `X-Admin-Secret` | Deletes permanently. Returns `{ ok: true }` or `{ ok: false }`. |

---

## Docker Setup

Two-service `docker-compose.yml`:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ADMIN_SECRET=${ADMIN_SECRET}
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/askfranciscoto
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=askfranciscoto
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

volumes:
  postgres_data:
```

The app container entrypoint runs `prisma migrate deploy` before starting Next.js, ensuring the schema is always up to date on deploy. Copy `.env.example` to `.env` before deploying.

### `.env.example`
```
# Secret word for the admin panel — set something only you know
ADMIN_SECRET=

# Postgres password (used by both services)
POSTGRES_PASSWORD=

# Connection string for local development (matches docker-compose defaults)
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/askfranciscoto
```

---

## Non-Goals

- No email notifications
- No pagination (small scale, a simple list is fine)
- No rate limiting — accepted risk, revisit if spam becomes an issue
- No request categories or tags
- No multi-user admin
- No un-marking requests as pending once done
