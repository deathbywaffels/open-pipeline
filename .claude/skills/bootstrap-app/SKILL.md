---
name: bootstrap-app
description: Scaffold a new full-stack app (Express + Prisma/SQLite backend, React/Vite/Tailwind frontend) matching this project's CLAUDE.md conventions. Use when starting a brand-new project or when the repo is currently empty and the user wants the initial skeleton.
---

# Bootstrap App

Scaffold a full-stack skeleton matching the stack defined in `CLAUDE.md`:
Node.js (ESM) + Express backend, SQLite via Prisma, React + Vite + Tailwind +
Lucide React frontend, Jest/Supertest for backend tests, Vitest for frontend
tests.

Before writing anything, read `CLAUDE.md` if it exists in the repo root and
follow its stack/commands/rules exactly — treat it as the source of truth over
the defaults below. If `CLAUDE.md` doesn't exist yet, use the defaults below
and create one afterward summarizing what was scaffolded.

## Steps

1. **Root setup**
   - `package.json` at the repo root with npm workspaces (or a simple
     concurrently-based setup) for `server` and `client`.
   - Scripts: `dev:server`, `dev:client`, `test` (runs both suites),
     `lint`, `format`.
   - `.gitignore` (node_modules, dist, .env, *.db, coverage).
   - `.env.example` with `DATABASE_URL="file:./dev.db"` and `PORT=5000`.

2. **Backend (`/server`)**
   - Express app in ESM (`"type": "module"`), entry at `server/src/index.js`.
   - Folder layout: `src/routes`, `src/controllers`, `src/middleware`,
     `prisma/schema.prisma`.
   - `prisma/schema.prisma` with `datasource db { provider = "sqlite" }`.
   - One real health-check endpoint (`GET /api/health`) with a JSDoc block
     documenting its response shape, plus a Supertest test proving it
     returns 200 — this is the wiring smoke test, not filler.
   - Centralized error-handling middleware and a `cors` + `express.json()`
     setup.

3. **Frontend (`/client`)**
   - Vite + React app, Tailwind configured, `lucide-react` installed.
   - Minimal `App.jsx` that calls the backend health-check endpoint on
     mount and renders its status — proves the two halves talk to each
     other.
   - A Vitest test for `App` that mocks the fetch call and asserts the
     status renders.

4. **Tooling**
   - ESLint + Prettier configs consistent across `server` and `client`.
   - Root `README.md` with setup + run instructions (install, dev, test).

5. **Verify**
   - Run `npm install`, then `npm run test` and confirm both suites pass
     before reporting done. Don't claim success without running them.

## Rules to enforce (from CLAUDE.md)

- Every endpoint and component created gets an accompanying unit test —
  no exceptions, including in this scaffold itself.
- Every API endpoint gets a JSDoc comment describing inputs/outputs.
- Keep the scaffold minimal — this step establishes structure and proves
  the stack is wired correctly, not a template for every possible feature.
  Additional resources/features are added later via the `add-feature` skill.
