import { describe, it, expect, afterEach } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();

const job = {
  title: "Backend Engineer",
  company: "Acme",
  description: "Build APIs",
  sourceUrl: "https://example.com/1",
};

async function likeAJob(agent) {
  const created = await agent.post("/api/job-listings").send(job);
  const res = await agent
    .post(`/api/job-listings/${created.body.id}/swipe`)
    .send({ direction: "like" });
  return res.body; // JobListing with an Application now attached
}

async function getApplicationId(agent) {
  const list = await agent.get("/api/applications");
  return list.body[0].id;
}

describe("applications", () => {
  afterEach(async () => {
    await cleanupTestUsers();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/applications");
    expect(res.status).toBe(401);
  });

  it("lists applications with jobListing details and isStale: false for a fresh LIKED application", async () => {
    const { agent } = await registerAndLogin(app);
    await likeAJob(agent);

    const res = await agent.get("/api/applications");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].stage).toBe("LIKED");
    expect(res.body[0].isStale).toBe(false);
    expect(res.body[0].jobListing.title).toBe(job.title);
  });

  it("only lists the current user's applications", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    await likeAJob(userA.agent);

    const res = await userB.agent.get("/api/applications");
    expect(res.body).toHaveLength(0);
  });

  it("moves an application to a new stage and logs a StageEvent", async () => {
    const { agent } = await registerAndLogin(app);
    await likeAJob(agent);
    const id = await getApplicationId(agent);

    const res = await agent
      .patch(`/api/applications/${id}/stage`)
      .send({ toStage: "APPLIED" });

    expect(res.status).toBe(200);
    expect(res.body.stage).toBe("APPLIED");
    expect(res.body.appliedAt).not.toBeNull();

    const dbApp = await prisma.application.findUnique({
      where: { id },
      include: { stageEvents: true },
    });
    expect(dbApp.stageEvents).toHaveLength(2); // initial LIKED + this transition
    expect(dbApp.stageEvents[1].fromStage).toBe("LIKED");
    expect(dbApp.stageEvents[1].toStage).toBe("APPLIED");
  });

  it("stamps appliedAt only on the first entry into APPLIED", async () => {
    const { agent } = await registerAndLogin(app);
    await likeAJob(agent);
    const id = await getApplicationId(agent);

    await agent
      .patch(`/api/applications/${id}/stage`)
      .send({ toStage: "APPLIED" });
    const first = await prisma.application.findUnique({ where: { id } });

    await agent
      .patch(`/api/applications/${id}/stage`)
      .send({ toStage: "PHONE_SCREEN" });
    await agent
      .patch(`/api/applications/${id}/stage`)
      .send({ toStage: "APPLIED" });
    const second = await prisma.application.findUnique({ where: { id } });

    expect(second.appliedAt.getTime()).toBe(first.appliedAt.getTime());
  });

  it("allows moving from any stage directly to REJECTED", async () => {
    const { agent } = await registerAndLogin(app);
    await likeAJob(agent);
    const id = await getApplicationId(agent);

    const res = await agent
      .patch(`/api/applications/${id}/stage`)
      .send({ toStage: "REJECTED" });
    expect(res.status).toBe(200);
    expect(res.body.stage).toBe("REJECTED");
  });

  it("is a no-op when moving to the current stage (no extra StageEvent)", async () => {
    const { agent } = await registerAndLogin(app);
    await likeAJob(agent);
    const id = await getApplicationId(agent);

    await agent
      .patch(`/api/applications/${id}/stage`)
      .send({ toStage: "LIKED" });

    const dbApp = await prisma.application.findUnique({
      where: { id },
      include: { stageEvents: true },
    });
    expect(dbApp.stageEvents).toHaveLength(1);
  });

  it("rejects an invalid stage value", async () => {
    const { agent } = await registerAndLogin(app);
    await likeAJob(agent);
    const id = await getApplicationId(agent);

    const res = await agent
      .patch(`/api/applications/${id}/stage`)
      .send({ toStage: "NOT_A_STAGE" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when updating another user's application", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    await likeAJob(userA.agent);
    const id = await getApplicationId(userA.agent);

    const res = await userB.agent
      .patch(`/api/applications/${id}/stage`)
      .send({ toStage: "APPLIED" });
    expect(res.status).toBe(404);
  });

  it("flags an APPLIED application as stale after 14 days with no stage change", async () => {
    const { agent } = await registerAndLogin(app);
    await likeAJob(agent);
    const id = await getApplicationId(agent);
    await agent
      .patch(`/api/applications/${id}/stage`)
      .send({ toStage: "APPLIED" });

    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    await prisma.application.update({
      where: { id },
      data: { lastStageChangeAt: fifteenDaysAgo },
    });

    const res = await agent.get("/api/applications");
    expect(res.body[0].isStale).toBe(true);
  });
});
