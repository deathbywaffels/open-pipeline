import { afterAll } from "@jest/globals";
import { closePool } from "../lib/prisma.js";

// Each test file gets its own Prisma client/pool (Jest's per-file module
// isolation); without this, 15+ files' pools all stay open simultaneously
// and exhaust Postgres's connection limit partway through a full run.
afterAll(async () => {
  await closePool();
});
