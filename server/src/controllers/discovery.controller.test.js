import {
  describe,
  it,
  expect,
  jest,
  afterEach,
  beforeEach,
} from "@jest/globals";
import request from "supertest";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";

const mockRecommendCandidates = jest.fn();

jest.unstable_mockModule("../services/aiDiscovery.service.js", () => ({
  recommendCandidates: mockRecommendCandidates,
}));

const { createApp } = await import("../app.js");
const { AiExtractionError } = await import("../services/aiClient.service.js");

const app = createApp();

async function registerEmployer(app, overrides = {}) {
  return registerAndLogin(app, { role: "EMPLOYER", ...overrides });
}

async function registerPublicCandidate(app, overrides = {}) {
  const candidate = await registerAndLogin(app, overrides);
  await candidate.agent.patch("/api/user/settings").send({ isPublic: true });
  return candidate;
}

async function createPosting(agent, overrides = {}) {
  const res = await agent.post("/api/job-postings").send({
    title: "Backend Engineer",
    description: "Build APIs.",
    requiredSkills: ["Node.js", "SQL"],
    ...overrides,
  });
  return res.body.id;
}

describe("discovery", () => {
  afterEach(async () => {
    await cleanupTestUsers();
    mockRecommendCandidates.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    expect(
      (await request(app).get("/api/discovery/candidates?jobPostingId=1"))
        .status,
    ).toBe(401);
    expect((await request(app).post("/api/discovery/recommend")).status).toBe(
      401,
    );
  });

  describe("GET /candidates", () => {
    it("400s when jobPostingId is missing", async () => {
      const { agent } = await registerEmployer(app);
      const res = await agent.get("/api/discovery/candidates");
      expect(res.status).toBe(400);
    });

    it("404s for another Employer's posting", async () => {
      const employerA = await registerEmployer(app);
      const employerB = await registerEmployer(app);
      const jobPostingId = await createPosting(employerA.agent);

      const res = await employerB.agent.get(
        `/api/discovery/candidates?jobPostingId=${jobPostingId}`,
      );
      expect(res.status).toBe(404);
    });

    it("only includes public Candidates, not private ones or Employers", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);

      await registerPublicCandidate(app, { name: "Public Jane" });
      await registerAndLogin(app, { name: "Private Joe" });
      const otherEmployer = await registerEmployer(app, { name: "Acme" });
      await otherEmployer.agent
        .patch("/api/user/settings")
        .send({ isPublic: true });

      const res = await agent.get(
        `/api/discovery/candidates?jobPostingId=${jobPostingId}`,
      );
      expect(res.status).toBe(200);
      const names = res.body.map((c) => c.name);
      expect(names).toContain("Public Jane");
      expect(names).not.toContain("Private Joe");
      expect(names).not.toContain("Acme");
    });

    it("computes skillMatchPercent against the posting's required skills", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent, {
        requiredSkills: ["Node.js", "SQL"],
      });

      const candidate = await registerPublicCandidate(app, {
        name: "Full Match",
      });
      await candidate.agent.post("/api/skills").send({ name: "Node.js" });
      await candidate.agent.post("/api/skills").send({ name: "SQL" });

      const res = await agent.get(
        `/api/discovery/candidates?jobPostingId=${jobPostingId}`,
      );
      const match = res.body.find((c) => c.name === "Full Match");
      expect(match.skillMatchPercent).toBe(100);
    });

    it("sorts candidates by skill match percentage, highest first", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent, {
        requiredSkills: ["Node.js", "SQL"],
      });

      const weakMatch = await registerPublicCandidate(app, {
        name: "Weak Match",
      });
      await weakMatch.agent.post("/api/skills").send({ name: "Node.js" });

      const strongMatch = await registerPublicCandidate(app, {
        name: "Strong Match",
      });
      await strongMatch.agent.post("/api/skills").send({ name: "Node.js" });
      await strongMatch.agent.post("/api/skills").send({ name: "SQL" });

      const res = await agent.get(
        `/api/discovery/candidates?jobPostingId=${jobPostingId}`,
      );
      const names = res.body.map((c) => c.name);
      expect(names.indexOf("Strong Match")).toBeLessThan(
        names.indexOf("Weak Match"),
      );
    });

    describe("location matching", () => {
      beforeEach(() => {
        jest.useFakeTimers({ advanceTimers: true });
        global.fetch = jest.fn();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it("flags true when the posting is within the candidate's commute radius", async () => {
        const { agent } = await registerEmployer(app);
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [{ lat: "52.3874", lon: "4.6462" }], // Haarlem
        });
        const jobPostingId = await createPosting(agent, {
          locationText: "Haarlem",
        });

        const candidate = await registerPublicCandidate(app, {
          name: "Nearby Candidate",
        });
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [{ lat: "52.3676", lon: "4.9041" }], // Amsterdam, ~18km away
        });
        await candidate.agent
          .post("/api/desired-locations")
          .send({ label: "Amsterdam" });

        const res = await agent.get(
          `/api/discovery/candidates?jobPostingId=${jobPostingId}`,
        );
        const match = res.body.find((c) => c.name === "Nearby Candidate");
        expect(match.isInDesiredLocation).toBe(true);
      });

      it("flags false when the posting is outside the candidate's commute radius", async () => {
        const { agent } = await registerEmployer(app);
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [{ lat: "40.7128", lon: "-74.006" }], // New York
        });
        const jobPostingId = await createPosting(agent, {
          locationText: "New York",
        });

        const candidate = await registerPublicCandidate(app, {
          name: "Far Candidate",
        });
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [{ lat: "52.3676", lon: "4.9041" }], // Amsterdam
        });
        await candidate.agent
          .post("/api/desired-locations")
          .send({ label: "Amsterdam" });

        const res = await agent.get(
          `/api/discovery/candidates?jobPostingId=${jobPostingId}`,
        );
        const match = res.body.find((c) => c.name === "Far Candidate");
        expect(match.isInDesiredLocation).toBe(false);
      });
    });
  });

  describe("POST /recommend", () => {
    it("400s when the API key header is missing", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);
      const res = await agent
        .post("/api/discovery/recommend")
        .send({ jobPostingId });
      expect(res.status).toBe(400);
      expect(mockRecommendCandidates).not.toHaveBeenCalled();
    });

    it("400s when jobPostingId is missing", async () => {
      const { agent } = await registerEmployer(app);
      const res = await agent
        .post("/api/discovery/recommend")
        .set("X-AI-Api-Key", "sk-test")
        .send({});
      expect(res.status).toBe(400);
    });

    it("404s for another Employer's posting", async () => {
      const employerA = await registerEmployer(app);
      const employerB = await registerEmployer(app);
      const jobPostingId = await createPosting(employerA.agent);

      const res = await employerB.agent
        .post("/api/discovery/recommend")
        .set("X-AI-Api-Key", "sk-test")
        .send({ jobPostingId });
      expect(res.status).toBe(404);
      expect(mockRecommendCandidates).not.toHaveBeenCalled();
    });

    it("returns recommendations mapped back to real candidate data", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);
      const candidate = await registerPublicCandidate(app, {
        name: "Jane Dev",
      });

      mockRecommendCandidates.mockResolvedValue([
        { candidateId: candidate.userId, rationale: "Great fit." },
      ]);

      const res = await agent
        .post("/api/discovery/recommend")
        .set("X-AI-Api-Key", "sk-test")
        .send({ jobPostingId });

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toEqual([
        { id: candidate.userId, name: "Jane Dev", rationale: "Great fit." },
      ]);
    });

    it("drops a recommendation for a candidateId outside the fetched pool", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);
      await registerPublicCandidate(app, { name: "Jane Dev" });

      mockRecommendCandidates.mockResolvedValue([
        { candidateId: 999999, rationale: "Hallucinated." },
      ]);

      const res = await agent
        .post("/api/discovery/recommend")
        .set("X-AI-Api-Key", "sk-test")
        .send({ jobPostingId });

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toEqual([]);
    });

    it("maps a thrown AiExtractionError to its status code", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);
      mockRecommendCandidates.mockRejectedValue(
        new AiExtractionError("Invalid Anthropic API key", 401),
      );

      const res = await agent
        .post("/api/discovery/recommend")
        .set("X-AI-Api-Key", "sk-bad")
        .send({ jobPostingId });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid Anthropic API key");
    });
  });
});
