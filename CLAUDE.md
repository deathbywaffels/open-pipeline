# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Bootstrapped from a template (the sibling "Job-Search Tracker" personal
project) — see `SPEC.md` for the current product scope and phased
roadmap. Not empty; most of the candidate-side feature set already
exists and works. The employer side and the marketplace mechanics in
`SPEC.md` are being built phase by phase.

## Architecture

- Backend: Node.js (ES Modules), Express, Prisma ORM + PostgreSQL, tested with Jest / Supertest
- Frontend: React (Vite), Tailwind CSS, Lucide React, tested with Vitest
- File storage: Cloudflare R2 (S3-compatible), for CVs and rejection letters
- AI: BYOK (bring your own key) — the user's own API key travels per-request, never persisted server-side

## Commands

- Install: `npm install`
- Run backend dev server: `npm run dev:server` (port 5000)
- Run frontend dev server: `npm run dev:client` (port 5173)
- Run all tests (backend + frontend): `npm run test`
- Lint & format: `npm run lint && npm run format`
- Local Postgres: `docker compose up -d db` (binds `localhost:5433` —
  5432 is taken by the sibling template project's own container)

## Project Rules

- Every frontend component and backend endpoint must have an accompanying unit test.
- Follow a "design first, code second" approach — use plan mode for multi-file tasks.
- Every API endpoint needs a JSDoc comment describing inputs/outputs, for documentation generation.
- Check `SPEC.md`'s roadmap before starting new work — features are built in phases, each with its own plan.
