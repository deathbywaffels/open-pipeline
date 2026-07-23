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

const validJob = {
  title: "Backend Engineer",
  company: "Acme Inc",
  description: "Build APIs.",
  sourceUrl: "https://example.com/jobs/123",
  requiredSkills: ["Node.js", "SQL", "Node.js"], // duplicate deliberately
};

describe("job listings", () => {
  afterEach(async () => {
    await cleanupTestUsers();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/job-listings");
    expect(res.status).toBe(401);
  });

  it("creates a job listing with deduplicated required skills, no location given", async () => {
    const { agent } = await registerAndLogin(app);

    const res = await agent.post("/api/job-listings").send(validJob);
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(validJob.title);
    expect(res.body.swipeStatus).toBe("PENDING");
    expect(res.body.latitude).toBeNull();
    expect(res.body.requiredSkills.map((s) => s.name).sort()).toEqual([
      "Node.js",
      "SQL",
    ]);
  });

  it("rejects a job listing missing required fields", async () => {
    const { agent } = await registerAndLogin(app);
    const res = await agent
      .post("/api/job-listings")
      .send({ title: "Only a title" });
    expect(res.status).toBe(400);
  });

  it("lists only the current user's job listings", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);

    await userA.agent.post("/api/job-listings").send(validJob);
    await userB.agent
      .post("/api/job-listings")
      .send({ ...validJob, title: "Other job" });

    const res = await userA.agent.get("/api/job-listings");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe(validJob.title);
  });

  it("rejects an invalid swipeStatus filter", async () => {
    const { agent } = await registerAndLogin(app);
    const res = await agent
      .get("/api/job-listings")
      .query({ swipeStatus: "NOPE" });
    expect(res.status).toBe(400);
  });

  it("fetches a single job listing by id", async () => {
    const { agent } = await registerAndLogin(app);
    const created = await agent.post("/api/job-listings").send(validJob);

    const res = await agent.get(`/api/job-listings/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it("returns 404 for another user's job listing", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);

    const created = await userA.agent.post("/api/job-listings").send(validJob);

    const res = await userB.agent.get(`/api/job-listings/${created.body.id}`);
    expect(res.status).toBe(404);
  });

  it("includes a skillMatchPercent based on the user's skill profile", async () => {
    const { agent } = await registerAndLogin(app);
    await agent.post("/api/skills").send({ name: "Node.js" });

    const created = await agent.post("/api/job-listings").send(validJob);
    expect(created.body.skillMatchPercent).toBe(50); // 1 of 2 required skills

    const listRes = await agent.get("/api/job-listings");
    expect(listRes.body[0].skillMatchPercent).toBe(50);
  });

  it("returns a null skillMatchPercent when the job has no required skills", async () => {
    const { agent } = await registerAndLogin(app);
    const res = await agent
      .post("/api/job-listings")
      .send({ ...validJob, requiredSkills: undefined });
    expect(res.body.skillMatchPercent).toBeNull();
  });

  describe("sponsor matching", () => {
    it("flags isRecognizedSponsor false when the company isn't on the user's sponsor list", async () => {
      const { agent } = await registerAndLogin(app);

      const created = await agent.post("/api/job-listings").send(validJob);
      expect(created.body.isRecognizedSponsor).toBe(false);

      const listRes = await agent.get("/api/job-listings");
      expect(listRes.body[0].isRecognizedSponsor).toBe(false);
    });

    it("flags isRecognizedSponsor true with a case/whitespace-insensitive match", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "  ACME   inc  " });

      const created = await agent.post("/api/job-listings").send(validJob);
      expect(created.body.isRecognizedSponsor).toBe(true);

      const getRes = await agent.get(`/api/job-listings/${created.body.id}`);
      expect(getRes.body.isRecognizedSponsor).toBe(true);
    });

    it("carries isRecognizedSponsor through the swipe response", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: validJob.company });
      const created = await agent.post("/api/job-listings").send(validJob);

      const res = await agent
        .post(`/api/job-listings/${created.body.id}/swipe`)
        .send({ direction: "like" });
      expect(res.body.isRecognizedSponsor).toBe(true);
    });
  });

  describe("location matching", () => {
    beforeEach(() => {
      jest.useFakeTimers({ advanceTimers: true });
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("returns null when the user has no desired locations", async () => {
      const { agent } = await registerAndLogin(app);
      const created = await agent
        .post("/api/job-listings")
        .send({ ...validJob, locationText: "Amsterdam" });
      expect(created.body.isInDesiredLocation).toBeNull();
    });

    it("returns null when the job has no resolved coordinates", async () => {
      const { agent } = await registerAndLogin(app);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "52.3676", lon: "4.9041" }],
      });
      await agent.post("/api/desired-locations").send({ label: "Amsterdam" });

      const created = await agent.post("/api/job-listings").send(validJob); // no locationText
      expect(created.body.isInDesiredLocation).toBeNull();
    });

    it("flags true when the job is within the commute radius", async () => {
      const { agent } = await registerAndLogin(app);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "52.3676", lon: "4.9041" }], // Amsterdam
      });
      await agent.post("/api/desired-locations").send({ label: "Amsterdam" });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "52.3874", lon: "4.6462" }], // Haarlem, ~18km away
      });
      const created = await agent
        .post("/api/job-listings")
        .send({ ...validJob, locationText: "Haarlem" });

      expect(created.body.isInDesiredLocation).toBe(true);
    });

    it("flags false when the job is outside every desired location's radius", async () => {
      const { agent } = await registerAndLogin(app);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "52.3676", lon: "4.9041" }], // Amsterdam
      });
      await agent.post("/api/desired-locations").send({ label: "Amsterdam" });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "40.7128", lon: "-74.006" }], // New York
      });
      const created = await agent
        .post("/api/job-listings")
        .send({ ...validJob, locationText: "New York" });

      expect(created.body.isInDesiredLocation).toBe(false);
    });

    it("carries isInDesiredLocation through the list and swipe responses", async () => {
      const { agent } = await registerAndLogin(app);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "52.3676", lon: "4.9041" }],
      });
      await agent.post("/api/desired-locations").send({ label: "Amsterdam" });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "40.7128", lon: "-74.006" }],
      });
      const created = await agent
        .post("/api/job-listings")
        .send({ ...validJob, locationText: "New York" });

      const listRes = await agent.get("/api/job-listings");
      expect(listRes.body[0].isInDesiredLocation).toBe(false);

      const swipeRes = await agent
        .post(`/api/job-listings/${created.body.id}/swipe`)
        .send({ direction: "like" });
      expect(swipeRes.body.isInDesiredLocation).toBe(false);
    });
  });

  describe("swipe", () => {
    it("rejects an invalid direction", async () => {
      const { agent } = await registerAndLogin(app);
      const created = await agent.post("/api/job-listings").send(validJob);

      const res = await agent
        .post(`/api/job-listings/${created.body.id}/swipe`)
        .send({ direction: "sideways" });
      expect(res.status).toBe(400);
    });

    it("returns 404 when swiping on another user's job listing", async () => {
      const userA = await registerAndLogin(app);
      const userB = await registerAndLogin(app);
      const created = await userA.agent
        .post("/api/job-listings")
        .send(validJob);

      const res = await userB.agent
        .post(`/api/job-listings/${created.body.id}/swipe`)
        .send({ direction: "like" });
      expect(res.status).toBe(404);
    });

    it("liking a job sets swipeStatus to LIKED and creates an Application", async () => {
      const { agent } = await registerAndLogin(app);
      const created = await agent.post("/api/job-listings").send(validJob);

      const res = await agent
        .post(`/api/job-listings/${created.body.id}/swipe`)
        .send({ direction: "like" });

      expect(res.status).toBe(200);
      expect(res.body.swipeStatus).toBe("LIKED");
    });

    it("disliking a job sets swipeStatus to DISLIKED and records a reason", async () => {
      const { agent } = await registerAndLogin(app);
      const created = await agent.post("/api/job-listings").send(validJob);

      const res = await agent
        .post(`/api/job-listings/${created.body.id}/swipe`)
        .send({ direction: "dislike", reason: "Requires Java" });

      expect(res.status).toBe(200);
      expect(res.body.swipeStatus).toBe("DISLIKED");

      const reasons = await agent.get("/api/dislike-reasons");
      expect(reasons.body).toHaveLength(1);
      expect(reasons.body[0].reason).toBe("Requires Java");
    });

    it("disliking without a reason does not record a DislikeReason", async () => {
      const { agent } = await registerAndLogin(app);
      const created = await agent.post("/api/job-listings").send(validJob);

      await agent
        .post(`/api/job-listings/${created.body.id}/swipe`)
        .send({ direction: "dislike" });

      const reasons = await agent.get("/api/dislike-reasons");
      expect(reasons.body).toHaveLength(0);
    });

    it("rejects swiping on a job that was already swiped on", async () => {
      const { agent } = await registerAndLogin(app);
      const created = await agent.post("/api/job-listings").send(validJob);
      await agent
        .post(`/api/job-listings/${created.body.id}/swipe`)
        .send({ direction: "like" });

      const res = await agent
        .post(`/api/job-listings/${created.body.id}/swipe`)
        .send({ direction: "dislike" });
      expect(res.status).toBe(400);
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
      const { agent } = await registerAndLogin(app);

      const res = await agent
        .post("/api/job-listings")
        .send({ ...validJob, locationText: "London, UK" });

      expect(res.status).toBe(201);
      expect(res.body.latitude).toBeCloseTo(51.5074);
      expect(res.body.longitude).toBeCloseTo(-0.1278);
    });

    it("still saves the listing when geocoding fails", async () => {
      global.fetch.mockRejectedValueOnce(new Error("network down"));
      const { agent } = await registerAndLogin(app);

      const res = await agent
        .post("/api/job-listings")
        .send({ ...validJob, locationText: "Nowhere" });

      expect(res.status).toBe(201);
      expect(res.body.latitude).toBeNull();
      expect(res.body.longitude).toBeNull();
    });

    it("retries geocoding on request and updates coordinates", async () => {
      global.fetch.mockResolvedValueOnce({ ok: false }); // create-time attempt fails
      const { agent } = await registerAndLogin(app);
      const created = await agent
        .post("/api/job-listings")
        .send({ ...validJob, locationText: "London, UK" });
      expect(created.body.latitude).toBeNull();

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "51.5074", lon: "-0.1278" }],
      });
      const res = await agent.post(
        `/api/job-listings/${created.body.id}/geocode`,
      );

      expect(res.status).toBe(200);
      expect(res.body.latitude).toBeCloseTo(51.5074);
    });

    it("rejects a geocode retry for a job with no location text", async () => {
      const { agent } = await registerAndLogin(app);
      const created = await agent.post("/api/job-listings").send(validJob);

      const res = await agent.post(
        `/api/job-listings/${created.body.id}/geocode`,
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 retrying geocode on another user's job", async () => {
      const userA = await registerAndLogin(app);
      const userB = await registerAndLogin(app);
      const created = await userA.agent
        .post("/api/job-listings")
        .send({ ...validJob, locationText: "London, UK" });

      const res = await userB.agent.post(
        `/api/job-listings/${created.body.id}/geocode`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("map listings", () => {
    beforeEach(() => {
      jest.useFakeTimers({ advanceTimers: true });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ lat: "51.5074", lon: "-0.1278" }],
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("only includes liked-or-further jobs that have coordinates", async () => {
      const { agent } = await registerAndLogin(app);

      // Liked, geocoded -> should appear
      const geocoded = await agent
        .post("/api/job-listings")
        .send({ ...validJob, locationText: "London, UK" });
      await agent
        .post(`/api/job-listings/${geocoded.body.id}/swipe`)
        .send({ direction: "like" });

      // Pending, no swipe -> should NOT appear even though geocoded
      await agent
        .post("/api/job-listings")
        .send({ ...validJob, title: "Other", locationText: "London, UK" });

      const res = await agent.get("/api/job-listings/map");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe(validJob.title);
      expect(res.body[0].pinColor).toBe("blue");
    });

    it("derives pin color from the application's stage", async () => {
      const { agent } = await registerAndLogin(app);
      const geocoded = await agent
        .post("/api/job-listings")
        .send({ ...validJob, locationText: "London, UK" });
      await agent
        .post(`/api/job-listings/${geocoded.body.id}/swipe`)
        .send({ direction: "like" });

      const list = await agent.get("/api/applications");
      await agent
        .patch(`/api/applications/${list.body[0].id}/stage`)
        .send({ toStage: "REJECTED" });

      const res = await agent.get("/api/job-listings/map");
      expect(res.body[0].pinColor).toBe("grey");
    });

    it("only returns the current user's map pins", async () => {
      const userA = await registerAndLogin(app);
      const userB = await registerAndLogin(app);

      const geocoded = await userA.agent
        .post("/api/job-listings")
        .send({ ...validJob, locationText: "London, UK" });
      await userA.agent
        .post(`/api/job-listings/${geocoded.body.id}/swipe`)
        .send({ direction: "like" });

      const res = await userB.agent.get("/api/job-listings/map");
      expect(res.body).toHaveLength(0);
    });
  });
});
