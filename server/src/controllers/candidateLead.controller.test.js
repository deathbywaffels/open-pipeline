import { describe, it, expect, afterEach } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();

async function registerEmployer(app, overrides = {}) {
  return registerAndLogin(app, { role: "EMPLOYER", ...overrides });
}

async function createPosting(agent, overrides = {}) {
  const res = await agent.post("/api/job-postings").send({
    title: "Backend Engineer",
    description: "Build APIs.",
    ...overrides,
  });
  return res.body.id;
}

describe("candidate leads", () => {
  afterEach(async () => {
    await cleanupTestUsers();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/candidate-leads");
    expect(res.status).toBe(401);
  });

  describe("POST /", () => {
    it("creates a lead with its first SOURCED stage event", async () => {
      const { agent, userId } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);

      const res = await agent.post("/api/candidate-leads").send({
        name: "Jane Dev",
        jobPostingId,
        notes: "Strong React background",
      });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Jane Dev");
      expect(res.body.stage).toBe("SOURCED");
      expect(res.body.notes).toBe("Strong React background");
      expect(res.body.jobPosting.title).toBe("Backend Engineer");

      const org = await prisma.organization.findUnique({ where: { userId } });
      const events = await prisma.candidateLeadStageEvent.findMany({
        where: { candidateLeadId: res.body.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].toStage).toBe("SOURCED");
      expect(events[0].fromStage).toBeNull();
      expect(res.body.organizationId).toBe(org.id);
    });

    it("rejects a lead missing name or jobPostingId", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);

      expect(
        (await agent.post("/api/candidate-leads").send({ jobPostingId }))
          .status,
      ).toBe(400);
      expect(
        (await agent.post("/api/candidate-leads").send({ name: "Jane" }))
          .status,
      ).toBe(400);
    });

    it("404s creating a lead against another Employer's posting", async () => {
      const employerA = await registerEmployer(app);
      const employerB = await registerEmployer(app);
      const jobPostingId = await createPosting(employerA.agent);

      const res = await employerB.agent
        .post("/api/candidate-leads")
        .send({ name: "Jane Dev", jobPostingId });
      expect(res.status).toBe(404);
    });

    it("400s when neither name nor candidateUserId is given", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);

      const res = await agent
        .post("/api/candidate-leads")
        .send({ jobPostingId });
      expect(res.status).toBe(400);
    });

    describe("candidateUserId (sourced from Discovery)", () => {
      it("derives the name from the real account, ignoring any client-supplied name", async () => {
        const { agent } = await registerEmployer(app);
        const jobPostingId = await createPosting(agent);
        const candidate = await registerAndLogin(app, {
          name: "Real Candidate Name",
        });
        await candidate.agent
          .patch("/api/user/settings")
          .send({ isPublic: true });

        const res = await agent.post("/api/candidate-leads").send({
          jobPostingId,
          candidateUserId: candidate.userId,
          name: "Ignored Name",
        });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe("Real Candidate Name");
        expect(res.body.candidateUserId).toBe(candidate.userId);
      });

      it("404s for a private candidate", async () => {
        const { agent } = await registerEmployer(app);
        const jobPostingId = await createPosting(agent);
        const candidate = await registerAndLogin(app); // isPublic defaults false

        const res = await agent.post("/api/candidate-leads").send({
          jobPostingId,
          candidateUserId: candidate.userId,
        });
        expect(res.status).toBe(404);
      });

      it("404s for an Employer account (not a Candidate)", async () => {
        const employerA = await registerEmployer(app);
        const jobPostingId = await createPosting(employerA.agent);
        const employerB = await registerEmployer(app);
        await employerB.agent
          .patch("/api/user/settings")
          .send({ isPublic: true });

        const res = await employerA.agent.post("/api/candidate-leads").send({
          jobPostingId,
          candidateUserId: employerB.userId,
        });
        expect(res.status).toBe(404);
      });

      it("404s for a nonexistent candidateUserId", async () => {
        const { agent } = await registerEmployer(app);
        const jobPostingId = await createPosting(agent);

        const res = await agent.post("/api/candidate-leads").send({
          jobPostingId,
          candidateUserId: 999999,
        });
        expect(res.status).toBe(404);
      });
    });
  });

  describe("GET /", () => {
    it("lists only the current Employer's own leads", async () => {
      const employerA = await registerEmployer(app);
      const employerB = await registerEmployer(app);
      const postingA = await createPosting(employerA.agent);
      const postingB = await createPosting(employerB.agent);
      await employerA.agent
        .post("/api/candidate-leads")
        .send({ name: "Jane Dev", jobPostingId: postingA });
      await employerB.agent
        .post("/api/candidate-leads")
        .send({ name: "John Dev", jobPostingId: postingB });

      const res = await employerA.agent.get("/api/candidate-leads");
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Jane Dev");
    });
  });

  describe("PATCH /:id", () => {
    it("updates notes only, without touching stage or logging an event", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);
      const created = await agent
        .post("/api/candidate-leads")
        .send({ name: "Jane Dev", jobPostingId });

      const res = await agent
        .patch(`/api/candidate-leads/${created.body.id}`)
        .send({ notes: "Followed up on LinkedIn" });

      expect(res.status).toBe(200);
      expect(res.body.notes).toBe("Followed up on LinkedIn");
      expect(res.body.stage).toBe("SOURCED");

      const events = await prisma.candidateLeadStageEvent.findMany({
        where: { candidateLeadId: created.body.id },
      });
      expect(events).toHaveLength(1); // just the creation event
    });

    it("moves stage, updates lastStageChangeAt, and logs a stage event", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);
      const created = await agent
        .post("/api/candidate-leads")
        .send({ name: "Jane Dev", jobPostingId });

      const res = await agent
        .patch(`/api/candidate-leads/${created.body.id}`)
        .send({ stage: "CONTACTED" });

      expect(res.status).toBe(200);
      expect(res.body.stage).toBe("CONTACTED");
      expect(new Date(res.body.lastStageChangeAt).getTime()).toBeGreaterThan(
        new Date(created.body.lastStageChangeAt).getTime() - 1,
      );

      const events = await prisma.candidateLeadStageEvent.findMany({
        where: { candidateLeadId: created.body.id },
        orderBy: { occurredAt: "asc" },
      });
      expect(events).toHaveLength(2);
      expect(events[1]).toMatchObject({
        fromStage: "SOURCED",
        toStage: "CONTACTED",
      });
    });

    it("does not log a stage event when the stage is unchanged", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);
      const created = await agent
        .post("/api/candidate-leads")
        .send({ name: "Jane Dev", jobPostingId });

      await agent
        .patch(`/api/candidate-leads/${created.body.id}`)
        .send({ stage: "SOURCED" });

      const events = await prisma.candidateLeadStageEvent.findMany({
        where: { candidateLeadId: created.body.id },
      });
      expect(events).toHaveLength(1);
    });

    it("rejects an invalid stage", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);
      const created = await agent
        .post("/api/candidate-leads")
        .send({ name: "Jane Dev", jobPostingId });

      const res = await agent
        .patch(`/api/candidate-leads/${created.body.id}`)
        .send({ stage: "BOGUS" });
      expect(res.status).toBe(400);
    });

    it("404s patching another Employer's lead", async () => {
      const employerA = await registerEmployer(app);
      const employerB = await registerEmployer(app);
      const jobPostingId = await createPosting(employerA.agent);
      const created = await employerA.agent
        .post("/api/candidate-leads")
        .send({ name: "Jane Dev", jobPostingId });

      const res = await employerB.agent
        .patch(`/api/candidate-leads/${created.body.id}`)
        .send({ notes: "sneaky" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /:id", () => {
    it("deletes a lead owned by the current Employer", async () => {
      const { agent } = await registerEmployer(app);
      const jobPostingId = await createPosting(agent);
      const created = await agent
        .post("/api/candidate-leads")
        .send({ name: "Jane Dev", jobPostingId });

      const res = await agent.delete(`/api/candidate-leads/${created.body.id}`);
      expect(res.status).toBe(204);

      const list = await agent.get("/api/candidate-leads");
      expect(list.body).toHaveLength(0);
    });

    it("404s deleting another Employer's lead", async () => {
      const employerA = await registerEmployer(app);
      const employerB = await registerEmployer(app);
      const jobPostingId = await createPosting(employerA.agent);
      const created = await employerA.agent
        .post("/api/candidate-leads")
        .send({ name: "Jane Dev", jobPostingId });

      const res = await employerB.agent.delete(
        `/api/candidate-leads/${created.body.id}`,
      );
      expect(res.status).toBe(404);
    });
  });
});
