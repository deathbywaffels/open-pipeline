import { randomUUID } from "node:crypto";
import request from "supertest";
import { prisma } from "../lib/prisma.js";

/**
 * Registers a unique test user against `app` and returns an authenticated
 * supertest agent (session cookie persisted) along with the user's email,
 * so callers can find/clean up the row afterward.
 */
export async function registerAndLogin(app, overrides = {}) {
  const email = overrides.email || `test-${randomUUID()}@example.com`;
  const password = overrides.password || "correct-horse-battery-staple";
  const name = overrides.name || "Test User";
  const role = overrides.role || "CANDIDATE";

  const agent = request.agent(app);
  const res = await agent
    .post("/api/auth/register")
    .send({ email, password, name, role });

  return { agent, email, userId: res.body.id };
}

/** Deletes every test-* user created via registerAndLogin's default email. */
export async function cleanupTestUsers() {
  await prisma.user.deleteMany({ where: { email: { contains: "test-" } } });
}
