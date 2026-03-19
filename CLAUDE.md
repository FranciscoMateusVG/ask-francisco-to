# Ask Francisco To

A single-page request inbox where anyone can submit a request for Francisco, and Francisco can manage them through a secret-protected admin panel.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19, TypeScript)
- **Database**: PostgreSQL 16 via `pg` (raw SQL, no ORM)
- **Styling**: Tailwind CSS 4
- **Testing**: Jest 30 + Testing Library
- **Deployment**: Docker Compose, designed for Dokploy

## Quick Start (Local Development)

```bash
pnpm install
# Start Postgres (Docker or local), then set DATABASE_URL in .env
cp .env.example .env  # Fill in values
pnpm dev
```

The app automatically creates the `Request` table on startup via `CREATE TABLE IF NOT EXISTS`. No migration tooling needed.

App runs on http://localhost:3000 in dev mode.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_SECRET` | Yes | Secret word to unlock the admin panel. App crashes on boot if missing. |
| `POSTGRES_PASSWORD` | Yes (Docker) | Password for the PostgreSQL container. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. For Docker Compose: `postgresql://postgres:<password>@askfrancisco-db:5432/askfranciscoto` |

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server |
| `pnpm run build` | Production build |
| `pnpm start` | Start production server |
| `npx jest --no-coverage` | Run tests |

## Docker Compose

```bash
cp .env.example .env
# Set: ADMIN_SECRET, POSTGRES_PASSWORD, DATABASE_URL
docker network create dokploy-network  # Only needed locally
docker compose up --build
```

**Port mapping:**
- `18432` → App (Next.js on port 3000 internally)
- `18433` → PostgreSQL (port 5432 internally)

The app automatically creates the database table on startup. No separate migration step needed.

## Key Files

```
src/
├── app/
│   ├── page.tsx                    # Public request form page
│   ├── layout.tsx                  # Root layout (Geist font, Tailwind)
│   ├── globals.css                 # Tailwind imports
│   ├── admin/page.tsx              # Admin panel page
│   └── api/
│       ├── health/route.ts         # Health check endpoint (Docker healthcheck)
│       └── requests/
│           ├── route.ts            # POST (create request), GET (list, auth required)
│           └── [id]/route.ts       # PATCH (mark done), DELETE (remove) — both auth required
├── components/
│   ├── RequestForm.tsx             # Client component — public submission form
│   └── AdminPanel.tsx              # Client component — secret-locked admin dashboard
├── lib/
│   ├── db.ts                       # pg Pool singleton + ensureSchema()
│   └── auth.ts                     # Timing-safe secret verification
├── instrumentation.ts              # Startup guard (ADMIN_SECRET check + schema creation)
└── __tests__/
    ├── api.test.ts                 # API route tests
    ├── auth.test.ts                # Auth helper tests
    ├── instrumentation.test.ts     # Startup guard tests
    ├── AdminPanel.test.tsx         # Admin panel component tests
    └── RequestForm.test.tsx        # Request form component tests

docker-compose.yml                  # App + Postgres services
Dockerfile                          # Two-stage build (builder → runner)
entrypoint.sh                       # Checks ADMIN_SECRET, starts server
```

## Database

Uses raw `pg` (node-postgres) with a single `Request` table:

```sql
CREATE TABLE "Request" (
  id SERIAL PRIMARY KEY,
  name TEXT,
  contact TEXT,
  message TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

The table is auto-created on app startup via `ensureSchema()` in `src/lib/db.ts`. No ORM, no migration tooling.

## API Routes

- `GET /api/health` — Health check. Returns `{ status: "ok" }`.
- `POST /api/requests` — Create a request. Body: `{ name?, contact?, message }`. No auth needed.
- `GET /api/requests` — List all requests. Requires `x-admin-secret` header.
- `PATCH /api/requests/:id` — Mark request as done. Requires `x-admin-secret` header.
- `DELETE /api/requests/:id` — Delete request. Requires `x-admin-secret` header.

## Auth

Admin endpoints use `x-admin-secret` header compared via timing-safe SHA-256 hash comparison against the `ADMIN_SECRET` env var. There are no user accounts or sessions.

## Dokploy Deployment

- Uses `dokploy-network` (external Docker network) for reverse proxy integration
- Healthcheck: `GET /api/health` returns 200 (used by Docker and Dokploy)
- `restart: unless-stopped` for both services

@AGENTS.md
