import { describe, it, expect, afterEach, jest } from "@jest/globals";
import request from "supertest";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";

const mockAnalyzeCompanyFit = jest.fn();

jest.unstable_mockModule("../services/aiCompanyFit.service.js", () => ({
  analyzeCompanyFit: mockAnalyzeCompanyFit,
}));

const { createApp } = await import("../app.js");
const { AiExtractionError } = await import("../services/aiClient.service.js");

const app = createApp();

describe("company fit", () => {
  afterEach(async () => {
    await cleanupTestUsers();
    mockAnalyzeCompanyFit.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).post("/api/company-fit/analyze");
    expect(res.status).toBe(401);
  });

  describe("POST /api/company-fit/analyze", () => {
    it("400s when the API key header is missing", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .post("/api/company-fit/analyze")
        .send({ contextText: "Some job description" });
      expect(res.status).toBe(400);
      expect(mockAnalyzeCompanyFit).not.toHaveBeenCalled();
    });

    it("400s when contextText is missing", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .post("/api/company-fit/analyze")
        .set("X-AI-Api-Key", "sk-test")
        .send({});
      expect(res.status).toBe(400);
    });

    it("400s when contextText is blank", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .post("/api/company-fit/analyze")
        .set("X-AI-Api-Key", "sk-test")
        .send({ contextText: "   " });
      expect(res.status).toBe(400);
    });

    it("returns the analysis and forwards the user's skills and pasted text", async () => {
      const { agent } = await registerAndLogin(app);
      await agent.post("/api/skills").send({ name: "React" });

      mockAnalyzeCompanyFit.mockResolvedValue({
        fitLabel: "strong",
        matchingSkills: ["React"],
        gaps: [],
        summary: "Great fit.",
      });

      const res = await agent
        .post("/api/company-fit/analyze")
        .set("X-AI-Api-Key", "sk-test")
        .set("X-AI-Model", "claude-opus-4-8")
        .send({ contextText: "Looking for a React developer." });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        fitLabel: "strong",
        matchingSkills: ["React"],
        gaps: [],
        summary: "Great fit.",
      });
      expect(mockAnalyzeCompanyFit).toHaveBeenCalledWith({
        apiKey: "sk-test",
        model: "claude-opus-4-8",
        userSkills: ["React"],
        contextText: "Looking for a React developer.",
      });
    });

    it("maps a thrown AiExtractionError to its status code", async () => {
      const { agent } = await registerAndLogin(app);
      mockAnalyzeCompanyFit.mockRejectedValue(
        new AiExtractionError(
          "Rate limited by Anthropic — try again shortly",
          429,
        ),
      );

      const res = await agent
        .post("/api/company-fit/analyze")
        .set("X-AI-Api-Key", "sk-test")
        .send({ contextText: "text" });

      expect(res.status).toBe(429);
    });
  });
});
