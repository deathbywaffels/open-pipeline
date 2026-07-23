# Open Pipeline

An open, two-sided job platform — a tracking/management tool first, a job
board second. Candidates manage their own application pipeline; employers
manage their own candidate pipeline; sourcing (postings, discovery,
matching) exists to feed each side's board, not as the product itself.
See [SPEC.md](SPEC.md) for the full product spec and [CLAUDE.md](CLAUDE.md)
for stack conventions.

## Stack

- Backend: Node.js (ES Modules), Express, Prisma ORM + PostgreSQL, tested
  with Jest / Supertest.
- Frontend: React (Vite), Tailwind CSS, Lucide React, tested with Vitest.
- File storage: Cloudflare R2 (S3-compatible) for CVs and rejection letters.
- Deployed as a single Docker image (client build + API in one Express
  process) — see [Deployment](#deployment) below.

## Setup

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/)
for a local Postgres — nothing else needs installing.

```
npm install
cp server/.env.example server/.env
docker compose up -d db          # local Postgres on localhost:5433
cd server && npx prisma migrate deploy && cd ..
npm run dev:server                # http://localhost:5000
npm run dev:client                # http://localhost:5173 (proxies /api to the server)
```

The Vite dev server proxies `/api/*` requests to the Express server, so the
frontend and backend behave as same-origin in development. CV/rejection-
letter uploads need real Cloudflare R2 credentials in `server/.env` (see
`server/.env.example`) — everything else works without them.

## Commands

- `npm run dev:server` — start the backend dev server (port 5000, via nodemon).
- `npm run dev:client` — start the frontend dev server (port 5173).
- `npm run build` — build the client for production (`client/dist`).
- `npm run test` — run backend (Jest/Supertest) and frontend (Vitest) suites.
- `npm run lint` — lint both workspaces.
- `npm run format` — format the repo with Prettier.

## Database

Prisma + PostgreSQL. Local dev/tests use the `db` service from
`docker-compose.yml`; production uses a hosted Postgres (Neon). From
`server/`:

```
npx prisma migrate dev    # apply a new schema change locally, creates a migration
npx prisma migrate deploy # apply existing migrations (no new migration file)
npx prisma studio         # browse the database
```

## Deployment

Runs as one Docker image (built from the root `Dockerfile`) on a host with
persistent Postgres and object storage — this repo is wired for
[Render](https://render.com) (free Docker web service) +
[Neon](https://neon.tech) (free Postgres, auto-resumes on the next
connection instead of needing a manual unpause) +
[Cloudflare R2](https://developers.cloudflare.com/r2/) (free object
storage), but any host that can build a Dockerfile + any Postgres +
S3-compatible bucket will work.

1. **Neon**: create a project, copy its connection string → `DATABASE_URL`.
2. **Cloudflare R2**: create a bucket, create an API token (S3 access) →
   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_BUCKET_NAME`.
3. **Render**: New → Web Service → connect this repo → set the
   environment to **Docker** (it builds straight from the root
   `Dockerfile` on every push, no manual build/push needed) → add the
   environment variables below → deploy.
4. Run `npx prisma migrate deploy` once against the Neon `DATABASE_URL`
   (from your machine, or a Render shell) to create the schema.

Required environment variables on the deployed service:

| Variable                                                                      | Value                                                                           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                | Neon connection string                                                          |
| `SESSION_SECRET`                                                              | a long random string — the app refuses to boot in production without a real one |
| `NODE_ENV`                                                                    | `production`                                                                    |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | from your R2 bucket/token                                                       |

`PORT` is provided automatically by Render — no need to set it.
