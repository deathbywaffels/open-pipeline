---
name: add-feature
description: Add a new full-stack CRUD resource (Prisma model + Express endpoints + React component), each with a unit test and JSDoc, matching this project's conventions. Use when the user wants to add a new resource/entity/feature to an existing app scaffolded by bootstrap-app.
---

# Add Feature

Add one new resource end-to-end, following the rules in `CLAUDE.md`:
every endpoint and component ships with a test, every endpoint gets JSDoc,
design before code.

If the resource name/fields aren't given, ask before generating anything —
don't guess a schema for the user's domain.

## Steps

1. **Design first**
   - Confirm the resource name and its fields/types with the user if not
     already specified (e.g. "Todo: title (string), done (boolean)").
   - State the planned model, endpoints, and component briefly before
     writing code, per the project's "design first, code second" rule.

2. **Prisma model**
   - Add the model to `server/prisma/schema.prisma`.
   - Run the migration (`npx prisma migrate dev --name add_<resource>`).
   - Run `npx prisma generate` immediately after — Prisma 7's `migrate dev`
     no longer regenerates the client automatically, so skipping this
     leaves the old client shape in place and every query on the new model
     throws `Cannot read properties of undefined` at runtime.

3. **Backend**
   - `server/src/controllers/<resource>.controller.js` with CRUD handlers.
   - `server/src/routes/<resource>.routes.js`, registered in the app entry.
   - JSDoc block above each endpoint documenting method, path, request
     body/params, and response shape.
   - `server/src/controllers/<resource>.controller.test.js` (Supertest)
     covering create/read/update/delete and at least one error case
     (e.g. 404 on missing id).

4. **Frontend**
   - `client/src/components/<Resource>List.jsx` and
     `<Resource>Form.jsx` (or a single combined component if the resource
     is simple) using Tailwind for layout and `lucide-react` icons where
     they add clarity (not decoratively).
   - Wire it into the app (route or a section of an existing page).
   - `*.test.jsx` with Vitest + React Testing Library covering render,
     a user interaction (e.g. submitting the form), and the loading/error
     state from the API call.

5. **Verify**
   - Run `npm run test` and `npm run lint`; fix failures before reporting
     done.

## Rules to enforce

- No endpoint or component without its test — write them together, not
  as an afterthought.
- No JSDoc-less endpoint.
- Don't add fields, validation, or UI beyond what was confirmed in step 1.
