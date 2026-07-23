import { randomUUID } from "node:crypto";
import { describe, it, expect, afterEach } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();

function uniqueUser(overrides = {}) {
  const id = randomUUID();
  return {
    email: `test-${id}@example.com`,
    password: "correct-horse-battery-staple",
    name: "Test User",
    role: "CANDIDATE",
    ...overrides,
  };
}

async function cleanupByEmail(email) {
  await prisma.user.deleteMany({ where: { email } });
}

describe("auth", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: "test-" } } });
  });

  it("registers a new user and starts a session", async () => {
    const creds = uniqueUser();
    const agent = request.agent(app);

    const registerRes = await agent.post("/api/auth/register").send(creds);
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.email).toBe(creds.email);
    expect(registerRes.body).not.toHaveProperty("passwordHash");
    expect(registerRes.body.role).toBe("CANDIDATE");
    // defaults true so existing sponsor-flagging behavior is unchanged
    // for anyone who hasn't explicitly opted out
    expect(registerRes.body.needsSponsorship).toBe(true);

    const meRes = await agent.get("/api/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(creds.email);
    expect(meRes.body.role).toBe("CANDIDATE");
    expect(meRes.body.needsSponsorship).toBe(true);
  });

  it("registers an Employer account with the role it was given", async () => {
    const creds = uniqueUser({ role: "EMPLOYER" });
    const res = await request(app).post("/api/auth/register").send(creds);

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("EMPLOYER");

    await cleanupByEmail(creds.email);
  });

  it("rejects registration with missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "incomplete@example.com" });
    expect(res.status).toBe(400);
  });

  it("rejects registration with a missing role", async () => {
    const creds = uniqueUser();
    delete creds.role;
    const res = await request(app).post("/api/auth/register").send(creds);
    expect(res.status).toBe(400);
  });

  it("rejects registration with an invalid role", async () => {
    const creds = uniqueUser({ role: "ADMIN" });
    const res = await request(app).post("/api/auth/register").send(creds);
    expect(res.status).toBe(400);
  });

  it("rejects registration with a duplicate email", async () => {
    const creds = uniqueUser();
    await request(app).post("/api/auth/register").send(creds);

    const res = await request(app).post("/api/auth/register").send(creds);
    expect(res.status).toBe(409);

    await cleanupByEmail(creds.email);
  });

  it("logs in with correct credentials and starts a session", async () => {
    const creds = uniqueUser();
    await request(app).post("/api/auth/register").send(creds);

    const agent = request.agent(app);
    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email: creds.email, password: creds.password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.role).toBe("CANDIDATE");
    expect(loginRes.body.needsSponsorship).toBe(true);

    const meRes = await agent.get("/api/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(creds.email);

    await cleanupByEmail(creds.email);
  });

  it("rejects login with the wrong password", async () => {
    const creds = uniqueUser();
    await request(app).post("/api/auth/register").send(creds);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: creds.email, password: "wrong-password" });
    expect(res.status).toBe(401);

    await cleanupByEmail(creds.email);
  });

  it("rejects login for a nonexistent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "whatever" });
    expect(res.status).toBe(401);
  });

  it("rejects GET /me when there is no session", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("logs out and invalidates the session", async () => {
    const creds = uniqueUser();
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(creds);

    const logoutRes = await agent.post("/api/auth/logout");
    expect(logoutRes.status).toBe(204);

    const meRes = await agent.get("/api/auth/me");
    expect(meRes.status).toBe(401);

    await cleanupByEmail(creds.email);
  });
});
