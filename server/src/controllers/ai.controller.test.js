import { describe, it, expect, afterEach, jest } from "@jest/globals";
import request from "supertest";
import { Readable } from "node:stream";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";

const mockExtractJobFromText = jest.fn();
const mockExtractSkillsFromCv = jest.fn();

class MockAiExtractionError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AiExtractionError";
    this.status = status;
  }
}

jest.unstable_mockModule("../services/aiExtraction.service.js", () => ({
  extractJobFromText: mockExtractJobFromText,
  extractSkillsFromCv: mockExtractSkillsFromCv,
  AiExtractionError: MockAiExtractionError,
}));

// In-memory stand-in for R2 — this test file exercises the real /api/cv
// upload route (via cv.controller.js) as setup before hitting the AI
// extraction endpoint, so both controllers' object-storage calls need to
// be satisfied without a real bucket.
const objectStore = new Map();

jest.unstable_mockModule("../lib/objectStorage.js", () => ({
  uploadObject: jest.fn(async (key, buffer, mimeType) => {
    objectStore.set(key, { buffer, mimeType });
  }),
  getObject: jest.fn(async (key) => {
    const entry = objectStore.get(key);
    if (!entry) throw new Error(`No object stored for key ${key}`);
    return {
      stream: Readable.from(entry.buffer),
      contentType: entry.mimeType,
    };
  }),
  getObjectBuffer: jest.fn(async (key) => {
    const entry = objectStore.get(key);
    if (!entry) throw new Error(`No object stored for key ${key}`);
    return entry.buffer;
  }),
}));

const { createApp } = await import("../app.js");

const app = createApp();
const pdfBuffer = Buffer.from("%PDF-1.4 fake pdf content for testing");

describe("ai", () => {
  afterEach(async () => {
    await cleanupTestUsers();
    objectStore.clear();
    mockExtractJobFromText.mockReset();
    mockExtractSkillsFromCv.mockReset();
  });

  it("rejects unauthenticated requests on every endpoint", async () => {
    expect((await request(app).post("/api/ai/extract-job")).status).toBe(401);
    expect(
      (await request(app).post("/api/ai/extract-cv-skills/1")).status,
    ).toBe(401);
  });

  describe("POST /api/ai/extract-job", () => {
    it("400s when the API key header is missing", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .post("/api/ai/extract-job")
        .send({ rawText: "some job text" });
      expect(res.status).toBe(400);
      expect(mockExtractJobFromText).not.toHaveBeenCalled();
    });

    it("400s when rawText is missing", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .post("/api/ai/extract-job")
        .set("X-AI-Api-Key", "sk-test")
        .send({});
      expect(res.status).toBe(400);
    });

    it("returns the extracted fields and forwards the key/model to the service", async () => {
      const { agent } = await registerAndLogin(app);
      mockExtractJobFromText.mockResolvedValue({
        title: "Engineer",
        company: "Acme",
        locationText: "Remote",
        description: "desc",
        requiredSkills: ["JS"],
      });

      const res = await agent
        .post("/api/ai/extract-job")
        .set("X-AI-Api-Key", "sk-test")
        .set("X-AI-Model", "claude-opus-4-8")
        .send({ rawText: "raw job posting text" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Engineer");
      expect(mockExtractJobFromText).toHaveBeenCalledWith({
        apiKey: "sk-test",
        model: "claude-opus-4-8",
        rawText: "raw job posting text",
      });
    });

    it("maps a thrown AiExtractionError to its status code", async () => {
      const { agent } = await registerAndLogin(app);
      mockExtractJobFromText.mockRejectedValue(
        new MockAiExtractionError("Invalid Anthropic API key", 401),
      );

      const res = await agent
        .post("/api/ai/extract-job")
        .set("X-AI-Api-Key", "sk-bad")
        .send({ rawText: "text" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid Anthropic API key");
    });
  });

  describe("POST /api/ai/extract-cv-skills/:cvId", () => {
    it("400s when the API key header is missing", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent.post("/api/ai/extract-cv-skills/1");
      expect(res.status).toBe(400);
    });

    it("404s for a CV that doesn't exist", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .post("/api/ai/extract-cv-skills/999999")
        .set("X-AI-Api-Key", "sk-test");
      expect(res.status).toBe(404);
    });

    it("404s for a CV owned by a different user", async () => {
      const { agent: agentA } = await registerAndLogin(app);
      const uploadRes = await agentA.post("/api/cv").attach("file", pdfBuffer, {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });
      const cvId = uploadRes.body.id;

      const { agent: agentB } = await registerAndLogin(app);
      const res = await agentB
        .post(`/api/ai/extract-cv-skills/${cvId}`)
        .set("X-AI-Api-Key", "sk-test");
      expect(res.status).toBe(404);
      expect(mockExtractSkillsFromCv).not.toHaveBeenCalled();
    });

    it("returns extracted skills for an owned CV", async () => {
      const { agent } = await registerAndLogin(app);
      const uploadRes = await agent.post("/api/cv").attach("file", pdfBuffer, {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });
      const cvId = uploadRes.body.id;

      mockExtractSkillsFromCv.mockResolvedValue(["React", "SQL"]);

      const res = await agent
        .post(`/api/ai/extract-cv-skills/${cvId}`)
        .set("X-AI-Api-Key", "sk-test");

      expect(res.status).toBe(200);
      expect(res.body.skills).toEqual(["React", "SQL"]);
      expect(mockExtractSkillsFromCv).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "sk-test",
          mimeType: "application/pdf",
        }),
      );
    });

    it("maps a thrown AiExtractionError to its status code", async () => {
      const { agent } = await registerAndLogin(app);
      const uploadRes = await agent.post("/api/cv").attach("file", pdfBuffer, {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });
      const cvId = uploadRes.body.id;

      mockExtractSkillsFromCv.mockRejectedValue(
        new MockAiExtractionError(
          "Rate limited by Anthropic — try again shortly",
          429,
        ),
      );

      const res = await agent
        .post(`/api/ai/extract-cv-skills/${cvId}`)
        .set("X-AI-Api-Key", "sk-test");

      expect(res.status).toBe(429);
    });
  });
});
