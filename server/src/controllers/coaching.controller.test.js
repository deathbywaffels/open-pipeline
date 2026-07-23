import { describe, it, expect, afterEach, jest } from "@jest/globals";
import request from "supertest";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";
import { prisma } from "../lib/prisma.js";

const mockSuggestAlternateRoles = jest.fn();

jest.unstable_mockModule("../services/aiCoaching.service.js", () => ({
  suggestAlternateRoles: mockSuggestAlternateRoles,
}));

const { createApp } = await import("../app.js");
const { AiExtractionError } = await import("../services/aiClient.service.js");

const app = createApp();

async function pasteJobWithSkills(agent, title, skills) {
  const res = await agent.post("/api/job-listings").send({
    title,
    company: "Acme",
    description: "d",
    sourceUrl: `https://example.com/${title}`,
    requiredSkills: skills,
  });
  return res.body.id;
}

async function likeAndApply(agent, jobListingId) {
  await agent
    .post(`/api/job-listings/${jobListingId}/swipe`)
    .send({ direction: "like" });
  const list = await agent.get("/api/applications");
  const applicationId = list.body.find(
    (a) => a.jobListing.id === jobListingId,
  ).id;
  await agent
    .patch(`/api/applications/${applicationId}/stage`)
    .send({ toStage: "APPLIED" });
  return applicationId;
}

describe("coaching", () => {
  afterEach(async () => {
    await cleanupTestUsers();
    mockSuggestAlternateRoles.mockReset();
  });

  it("rejects unauthenticated requests on every endpoint", async () => {
    expect((await request(app).get("/api/coaching/summary")).status).toBe(401);
    expect(
      (await request(app).post("/api/coaching/role-suggestions")).status,
    ).toBe(401);
  });

  describe("GET /api/coaching/summary", () => {
    it("returns a null missingSkill and all-zero stats with no activity", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent.get("/api/coaching/summary");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        missingSkill: null,
        weeklyStats: {
          jobsPasted: 0,
          applicationsSubmitted: 0,
          stageProgressions: 0,
          interviewsReached: 0,
        },
      });
    });

    it("reports the required skill missing across applied jobs that the user doesn't have", async () => {
      const { agent } = await registerAndLogin(app);
      const jobA = await pasteJobWithSkills(agent, "Job A", ["React", "SQL"]);
      const jobB = await pasteJobWithSkills(agent, "Job B", ["React"]);
      await likeAndApply(agent, jobA);
      await likeAndApply(agent, jobB);

      const res = await agent.get("/api/coaching/summary");
      expect(res.body.missingSkill).toEqual({ name: "React", count: 2 });
    });

    it("excludes skills the user already has", async () => {
      const { agent } = await registerAndLogin(app);
      await agent.post("/api/skills").send({ name: "React" });
      const jobA = await pasteJobWithSkills(agent, "Job A", ["React"]);
      await likeAndApply(agent, jobA);

      const res = await agent.get("/api/coaching/summary");
      expect(res.body.missingSkill).toBeNull();
    });

    it("counts jobs pasted this week but excludes ones pasted over a week ago", async () => {
      const { agent } = await registerAndLogin(app);
      const recentId = await pasteJobWithSkills(agent, "Recent Job", []);
      const oldId = await pasteJobWithSkills(agent, "Old Job", []);
      await prisma.jobListing.update({
        where: { id: oldId },
        data: { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      });
      void recentId;

      const res = await agent.get("/api/coaching/summary");
      expect(res.body.weeklyStats.jobsPasted).toBe(1);
    });

    it("counts a stage progression and interview reached this week", async () => {
      const { agent } = await registerAndLogin(app);
      const jobId = await pasteJobWithSkills(agent, "Job A", []);
      const applicationId = await likeAndApply(agent, jobId);
      await agent
        .patch(`/api/applications/${applicationId}/stage`)
        .send({ toStage: "PHONE_SCREEN" });

      const res = await agent.get("/api/coaching/summary");
      // creation->LIKED, LIKED->APPLIED, APPLIED->PHONE_SCREEN
      expect(res.body.weeklyStats.stageProgressions).toBe(3);
      expect(res.body.weeklyStats.interviewsReached).toBe(1);
    });

    it("only reflects the current user's data", async () => {
      const userA = await registerAndLogin(app);
      const userB = await registerAndLogin(app);
      const jobId = await pasteJobWithSkills(userA.agent, "Job A", ["React"]);
      await likeAndApply(userA.agent, jobId);

      const res = await userB.agent.get("/api/coaching/summary");
      expect(res.body).toEqual({
        missingSkill: null,
        weeklyStats: {
          jobsPasted: 0,
          applicationsSubmitted: 0,
          stageProgressions: 0,
          interviewsReached: 0,
        },
      });
    });
  });

  describe("POST /api/coaching/role-suggestions", () => {
    it("400s when the API key header is missing", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent.post("/api/coaching/role-suggestions");
      expect(res.status).toBe(400);
      expect(mockSuggestAlternateRoles).not.toHaveBeenCalled();
    });

    it("returns suggestions and forwards skills/applied titles to the service", async () => {
      const { agent } = await registerAndLogin(app);
      await agent.post("/api/skills").send({ name: "Docker" });
      const jobId = await pasteJobWithSkills(agent, "Backend Job", []);
      await likeAndApply(agent, jobId);

      mockSuggestAlternateRoles.mockResolvedValue([
        { role: "DevOps Engineer", rationale: "You know Docker." },
      ]);

      const res = await agent
        .post("/api/coaching/role-suggestions")
        .set("X-AI-Api-Key", "sk-test")
        .set("X-AI-Model", "claude-opus-4-8");

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toEqual([
        { role: "DevOps Engineer", rationale: "You know Docker." },
      ]);
      expect(mockSuggestAlternateRoles).toHaveBeenCalledWith({
        apiKey: "sk-test",
        model: "claude-opus-4-8",
        userSkills: ["Docker"],
        appliedJobTitles: ["Backend Job"],
      });
    });

    it("maps a thrown AiExtractionError to its status code", async () => {
      const { agent } = await registerAndLogin(app);
      mockSuggestAlternateRoles.mockRejectedValue(
        new AiExtractionError("Invalid Anthropic API key", 401),
      );

      const res = await agent
        .post("/api/coaching/role-suggestions")
        .set("X-AI-Api-Key", "sk-bad");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid Anthropic API key");
    });
  });
});
