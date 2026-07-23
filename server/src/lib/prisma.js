import "dotenv/config"; // must run before reading DATABASE_URL below — don't rely on import order from callers
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// A pre-built pg.Pool must be passed in (not a plain config object) — when
// given only a config, @prisma/adapter-pg opens and immediately tears down
// a brand-new pool on every single query instead of reusing one.
//
// disposeExternalPool is deliberately left at its default (false):
// @prisma/adapter-pg calls its dispose callback after every logical
// query, not just once at client shutdown — with disposeExternalPool:true
// that would end() this pool after the very first query, then silently
// fall back to creating (and immediately destroying) a fresh raw pool per
// subsequent query, which is both slow and was hanging Postgres auth
// handshakes under real load. See closePool() below for proper shutdown.
//
// max kept low: this app runs at personal/small-group scale, and each Jest
// test file gets its own Prisma client/pool (module isolation) — a large
// default would exhaust Postgres's connection limit across a full run.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

/** Closes the underlying pool directly — use in test teardown instead of
 * prisma.$disconnect(), which doesn't reliably close an external pool. */
export async function closePool() {
  await pool.end();
}
