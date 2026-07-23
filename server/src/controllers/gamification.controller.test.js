import { describe, it, expect, afterEach } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();

async function likeAndApply(agent, title) {
  const created = await agent.post("/api/job-listings").send({
    title,
    company: "Acme",
    description: "d",
    sourceUrl: `https://example.com/${title}`,
  });
  await agent
    .post(`/api/job-listings/${created.body.id}/swipe`)
    .send({ direction: "like" });
  const list = await agent.get("/api/applications");
  const applicationId = list.body.find((a) => a.jobListing.title === title).id;
  await agent
    .patch(`/api/applications/${applicationId}/stage`)
    .send({ toStage: "APPLIED" });
  return applicationId;
}

async function backdateAppliedAt(applicationId, date) {
  await prisma.application.update({
    where: { id: applicationId },
    data: { appliedAt: date },
  });
}

describe("gamification", () => {
  afterEach(async () => {
    await cleanupTestUsers();
  });

  describe("GET /api/quest/today", () => {
    it("rejects unauthenticated requests", async () => {
      const res = await request(app).get("/api/quest/today");
      expect(res.status).toBe(401);
    });

    it("defaults to a target of 3 and metToday: false with no applications", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent.get("/api/quest/today");
      expect(res.body).toEqual({
        count: 0,
        target: 3,
        metToday: false,
        paste: { count: 0, target: 2, metToday: false },
        reachOut: { count: 0, target: 1, metToday: false },
        checkedInToday: true,
      });
    });

    it("counts today's applications and reports metToday once the target is reached", async () => {
      const { agent } = await registerAndLogin(app);
      await agent.patch("/api/user/settings").send({ dailyQuestTarget: 2 });

      await likeAndApply(agent, "Job A");
      let res = await agent.get("/api/quest/today");
      expect(res.body.count).toBe(1);
      expect(res.body.metToday).toBe(false);

      await likeAndApply(agent, "Job B");
      res = await agent.get("/api/quest/today");
      expect(res.body.count).toBe(2);
      expect(res.body.metToday).toBe(true);
    });

    it("does not count applications from a previous day", async () => {
      const { agent } = await registerAndLogin(app);
      const id = await likeAndApply(agent, "Job A");
      await backdateAppliedAt(
        id,
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      );

      const res = await agent.get("/api/quest/today");
      expect(res.body.count).toBe(0);
    });

    it("counts jobs pasted today toward the paste goal", async () => {
      const { agent } = await registerAndLogin(app);
      await agent.patch("/api/user/settings").send({ dailyPasteTarget: 2 });

      await agent.post("/api/job-listings").send({
        title: "Job A",
        company: "Acme",
        description: "d",
        sourceUrl: "https://example.com/a",
      });
      let res = await agent.get("/api/quest/today");
      expect(res.body.paste).toEqual({ count: 1, target: 2, metToday: false });

      await agent.post("/api/job-listings").send({
        title: "Job B",
        company: "Acme",
        description: "d",
        sourceUrl: "https://example.com/b",
      });
      res = await agent.get("/api/quest/today");
      expect(res.body.paste).toEqual({ count: 2, target: 2, metToday: true });
    });

    it("does not count jobs pasted on a previous day toward the paste goal", async () => {
      const { agent } = await registerAndLogin(app);
      const created = await agent.post("/api/job-listings").send({
        title: "Job A",
        company: "Acme",
        description: "d",
        sourceUrl: "https://example.com/a",
      });
      await prisma.jobListing.update({
        where: { id: created.body.id },
        data: { createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      });

      const res = await agent.get("/api/quest/today");
      expect(res.body.paste.count).toBe(0);
    });

    it("counts sponsor companies reached out to today toward the reachOut goal", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V." });
      const list = await agent.get("/api/sponsor-companies");

      let res = await agent.get("/api/quest/today");
      expect(res.body.reachOut).toEqual({
        count: 0,
        target: 1,
        metToday: false,
      });

      await agent
        .patch(`/api/sponsor-companies/${list.body.companies[0].id}`)
        .send({ outreachStatus: "RESEARCHING" });

      res = await agent.get("/api/quest/today");
      expect(res.body.reachOut).toEqual({
        count: 1,
        target: 1,
        metToday: true,
      });
    });

    it("does not count a notes-only edit toward the reachOut goal", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V." });
      const list = await agent.get("/api/sponsor-companies");
      await agent
        .patch(`/api/sponsor-companies/${list.body.companies[0].id}`)
        .send({ notes: "Has an open-source team" });

      const res = await agent.get("/api/quest/today");
      expect(res.body.reachOut.count).toBe(0);
    });

    it("reports checkedInToday: true and records lastActiveAt", async () => {
      const { agent, userId } = await registerAndLogin(app);
      const before = await prisma.user.findUnique({ where: { id: userId } });
      expect(before.lastActiveAt).toBeNull();

      const res = await agent.get("/api/quest/today");
      expect(res.body.checkedInToday).toBe(true);

      const after = await prisma.user.findUnique({ where: { id: userId } });
      expect(after.lastActiveAt).not.toBeNull();
    });
  });

  describe("PATCH /api/user/settings", () => {
    it("rejects unauthenticated requests", async () => {
      const res = await request(app)
        .patch("/api/user/settings")
        .send({ dailyQuestTarget: 5 });
      expect(res.status).toBe(401);
    });

    it("updates the daily quest target", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .patch("/api/user/settings")
        .send({ dailyQuestTarget: 5 });
      expect(res.status).toBe(200);
      expect(res.body.dailyQuestTarget).toBe(5);
    });

    it("rejects a non-positive target", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .patch("/api/user/settings")
        .send({ dailyQuestTarget: 0 });
      expect(res.status).toBe(400);
    });

    it("rejects a non-integer target", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .patch("/api/user/settings")
        .send({ dailyQuestTarget: 1.5 });
      expect(res.status).toBe(400);
    });

    it("updates needsSponsorship and commuteRadiusKm independently", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .patch("/api/user/settings")
        .send({ needsSponsorship: false, commuteRadiusKm: 25 });

      expect(res.status).toBe(200);
      expect(res.body.needsSponsorship).toBe(false);
      expect(res.body.commuteRadiusKm).toBe(25);
      // untouched field keeps its existing value
      expect(res.body.dailyQuestTarget).toBe(3);
    });

    it("rejects a non-boolean needsSponsorship", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .patch("/api/user/settings")
        .send({ needsSponsorship: "nope" });
      expect(res.status).toBe(400);
    });

    it("rejects a non-positive commuteRadiusKm", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .patch("/api/user/settings")
        .send({ commuteRadiusKm: 0 });
      expect(res.status).toBe(400);
    });

    it("updates dailyPasteTarget and dailyReachOutTarget independently", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .patch("/api/user/settings")
        .send({ dailyPasteTarget: 5, dailyReachOutTarget: 3 });

      expect(res.status).toBe(200);
      expect(res.body.dailyPasteTarget).toBe(5);
      expect(res.body.dailyReachOutTarget).toBe(3);
      // untouched field keeps its existing value
      expect(res.body.dailyQuestTarget).toBe(3);
    });

    it("rejects a non-positive dailyPasteTarget", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .patch("/api/user/settings")
        .send({ dailyPasteTarget: 0 });
      expect(res.status).toBe(400);
    });

    it("rejects a non-positive dailyReachOutTarget", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .patch("/api/user/settings")
        .send({ dailyReachOutTarget: 0 });
      expect(res.status).toBe(400);
    });

    it("updates isPublic independently", async () => {
      const { agent } = await registerAndLogin(app);

      const res = await agent
        .patch("/api/user/settings")
        .send({ isPublic: true });

      expect(res.status).toBe(200);
      expect(res.body.isPublic).toBe(true);
      // untouched field keeps its existing value
      expect(res.body.dailyQuestTarget).toBe(3);
    });

    it("rejects a non-boolean isPublic", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .patch("/api/user/settings")
        .send({ isPublic: "yes" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/streak", () => {
    it("rejects unauthenticated requests", async () => {
      const res = await request(app).get("/api/streak");
      expect(res.status).toBe(401);
    });

    it("returns 0 with no application history", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent.get("/api/streak");
      expect(res.body).toEqual({ streak: 0 });
    });

    it("computes a 3-day streak from backdated applications meeting a target of 1", async () => {
      const { agent } = await registerAndLogin(app);
      // default target is 3; lower it to 1 so a single application meets each day
      await agent.patch("/api/user/settings").send({ dailyQuestTarget: 1 });

      const today = await likeAndApply(agent, "Today Job");
      await backdateAppliedAt(today, new Date());

      const yesterdayId = await likeAndApply(agent, "Yesterday Job");
      await backdateAppliedAt(
        yesterdayId,
        new Date(Date.now() - 24 * 60 * 60 * 1000),
      );

      const twoDaysAgoId = await likeAndApply(agent, "Two Days Ago Job");
      await backdateAppliedAt(
        twoDaysAgoId,
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      );

      const res = await agent.get("/api/streak");
      expect(res.body.streak).toBe(3);
    });

    it("only reflects the current user's application history", async () => {
      const userA = await registerAndLogin(app);
      const userB = await registerAndLogin(app);
      await userA.agent
        .patch("/api/user/settings")
        .send({ dailyQuestTarget: 1 });
      await likeAndApply(userA.agent, "Job A");

      const res = await userB.agent.get("/api/streak");
      expect(res.body.streak).toBe(0);
    });
  });
});
