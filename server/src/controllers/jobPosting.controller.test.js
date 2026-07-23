import {
  describe,
  it,
  expect,
  jest,
  afterEach,
  beforeEach,
} from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";

const app = createApp();

const validPosting = {
  title: "Backend Engineer",
  description: "Build APIs.",
  requiredSkills: ["Node.js", "SQL", "Node.js"], // duplicate deliberately
};

async function registerEmployer(app, overrides = {}) {
  return registerAndLogin(app, { role: "EMPLOYER", ...overrides });
}

describe("job postings", () => {
  afterEach(async () => {
    await cleanupTestUsers();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/job-postings");
    expect(res.status).toBe(401);
  });

  it("creates a job posting with deduplicated required skills, no location given", async () => {
    const { agent } = await registerEmployer(app);

    const res = await agent.post("/api/job-postings").send(validPosting);
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(validPosting.title);
    expect(res.body.latitude).toBeNull();
    expect(res.body.requiredSkills.map((s) => s.name).sort()).toEqual([
      "Node.js",
      "SQL",
    ]);
  });

  it("rejects a posting missing required fields", async () => {
    const { agent } = await registerEmployer(app);
    const res = await agent
      .post("/api/job-postings")
      .send({ title: "Only a title" });
    expect(res.status).toBe(400);
  });

  it("400s creating a posting for a Candidate account (no Organization)", async () => {
    const { agent } = await registerAndLogin(app); // defaults to CANDIDATE
    const res = await agent.post("/api/job-postings").send(validPosting);
    expect(res.status).toBe(400);
  });

  it("lists only the current Employer's own postings", async () => {
    const employerA = await registerEmployer(app);
    const employerB = await registerEmployer(app);
    await employerA.agent.post("/api/job-postings").send(validPosting);
    await employerB.agent
      .post("/api/job-postings")
      .send({ ...validPosting, title: "Frontend Engineer" });

    const res = await employerA.agent.get("/api/job-postings");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe(validPosting.title);
  });

  it("returns an empty list for a Candidate account", async () => {
    const { agent } = await registerAndLogin(app);
    const res = await agent.get("/api/job-postings");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  describe("DELETE /:id", () => {
    it("deletes a posting owned by the current Employer", async () => {
      const { agent } = await registerEmployer(app);
      const created = await agent.post("/api/job-postings").send(validPosting);

      const res = await agent.delete(`/api/job-postings/${created.body.id}`);
      expect(res.status).toBe(204);

      const list = await agent.get("/api/job-postings");
      expect(list.body).toHaveLength(0);
    });

    it("returns 404 deleting another Employer's posting", async () => {
      const employerA = await registerEmployer(app);
      const employerB = await registerEmployer(app);
      const created = await employerA.agent
        .post("/api/job-postings")
        .send(validPosting);

      const res = await employerB.agent.delete(
        `/api/job-postings/${created.body.id}`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("geocoding integration", () => {
    beforeEach(() => {
      jest.useFakeTimers({ advanceTimers: true });
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("populates coordinates when geocoding succeeds", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "51.5074", lon: "-0.1278" }],
      });
      const { agent } = await registerEmployer(app);

      const res = await agent
        .post("/api/job-postings")
        .send({ ...validPosting, locationText: "London, UK" });

      expect(res.status).toBe(201);
      expect(res.body.latitude).toBeCloseTo(51.5074);
      expect(res.body.longitude).toBeCloseTo(-0.1278);
    });

    it("still saves the posting when geocoding fails", async () => {
      global.fetch.mockRejectedValueOnce(new Error("network down"));
      const { agent } = await registerEmployer(app);

      const res = await agent
        .post("/api/job-postings")
        .send({ ...validPosting, locationText: "Nowhere" });

      expect(res.status).toBe(201);
      expect(res.body.latitude).toBeNull();
    });

    it("retries geocoding on request and updates coordinates", async () => {
      global.fetch.mockResolvedValueOnce({ ok: false }); // create-time attempt fails
      const { agent } = await registerEmployer(app);
      const created = await agent
        .post("/api/job-postings")
        .send({ ...validPosting, locationText: "London, UK" });
      expect(created.body.latitude).toBeNull();

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "51.5074", lon: "-0.1278" }],
      });
      const res = await agent.post(
        `/api/job-postings/${created.body.id}/geocode`,
      );

      expect(res.status).toBe(200);
      expect(res.body.latitude).toBeCloseTo(51.5074);
    });

    it("rejects a geocode retry for a posting with no location text", async () => {
      const { agent } = await registerEmployer(app);
      const created = await agent.post("/api/job-postings").send(validPosting);

      const res = await agent.post(
        `/api/job-postings/${created.body.id}/geocode`,
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 retrying geocode on another Employer's posting", async () => {
      const employerA = await registerEmployer(app);
      const employerB = await registerEmployer(app);
      const created = await employerA.agent
        .post("/api/job-postings")
        .send({ ...validPosting, locationText: "London, UK" });

      const res = await employerB.agent.post(
        `/api/job-postings/${created.body.id}/geocode`,
      );
      expect(res.status).toBe(404);
    });
  });
});
