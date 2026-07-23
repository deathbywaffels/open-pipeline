import { describe, it, expect, afterEach } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";

const app = createApp();

describe("skills", () => {
  afterEach(async () => {
    await cleanupTestUsers();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/skills");
    expect(res.status).toBe(401);
  });

  it("creates and lists a skill", async () => {
    const { agent } = await registerAndLogin(app);

    const createRes = await agent.post("/api/skills").send({ name: "React" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe("React");

    const listRes = await agent.get("/api/skills");
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].name).toBe("React");
  });

  it("rejects an empty skill name", async () => {
    const { agent } = await registerAndLogin(app);
    const res = await agent.post("/api/skills").send({ name: "   " });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate skill for the same user", async () => {
    const { agent } = await registerAndLogin(app);
    await agent.post("/api/skills").send({ name: "React" });

    const res = await agent.post("/api/skills").send({ name: "React" });
    expect(res.status).toBe(409);
  });

  it("deletes a skill owned by the current user", async () => {
    const { agent } = await registerAndLogin(app);
    const created = await agent.post("/api/skills").send({ name: "React" });

    const deleteRes = await agent.delete(`/api/skills/${created.body.id}`);
    expect(deleteRes.status).toBe(204);

    const listRes = await agent.get("/api/skills");
    expect(listRes.body).toHaveLength(0);
  });

  it("returns 404 when deleting another user's skill", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);

    const created = await userA.agent
      .post("/api/skills")
      .send({ name: "React" });

    const res = await userB.agent.delete(`/api/skills/${created.body.id}`);
    expect(res.status).toBe(404);
  });

  it("only lists the current user's own skills", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);

    await userA.agent.post("/api/skills").send({ name: "React" });
    await userB.agent.post("/api/skills").send({ name: "Python" });

    const res = await userA.agent.get("/api/skills");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("React");
  });
});
