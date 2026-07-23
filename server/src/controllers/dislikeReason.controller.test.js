import { describe, it, expect, afterEach } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";

const app = createApp();

const jobA = {
  title: "Backend Engineer",
  company: "Acme",
  description: "d",
  sourceUrl: "https://example.com/1",
};
const jobB = {
  title: "Platform Engineer",
  company: "Acme",
  description: "d",
  sourceUrl: "https://example.com/2",
};

describe("dislike reasons", () => {
  afterEach(async () => {
    await cleanupTestUsers();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/dislike-reasons");
    expect(res.status).toBe(401);
  });

  it("groups identical reasons (case-insensitive) by frequency, most common first", async () => {
    const { agent } = await registerAndLogin(app);
    const created1 = await agent.post("/api/job-listings").send(jobA);
    const created2 = await agent.post("/api/job-listings").send(jobB);

    await agent
      .post(`/api/job-listings/${created1.body.id}/swipe`)
      .send({ direction: "dislike", reason: "Requires Java" });
    await agent
      .post(`/api/job-listings/${created2.body.id}/swipe`)
      .send({ direction: "dislike", reason: "requires java" });

    const res = await agent.get("/api/dislike-reasons");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].count).toBe(2);
    expect(res.body[0].jobs).toHaveLength(2);
  });

  it("only returns the current user's dislike reasons", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);

    const created = await userA.agent.post("/api/job-listings").send(jobA);
    await userA.agent
      .post(`/api/job-listings/${created.body.id}/swipe`)
      .send({ direction: "dislike", reason: "Requires PhD" });

    const res = await userB.agent.get("/api/dislike-reasons");
    expect(res.body).toHaveLength(0);
  });
});
