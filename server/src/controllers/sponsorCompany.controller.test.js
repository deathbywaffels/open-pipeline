import { describe, it, expect, afterEach } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";

const app = createApp();

describe("sponsor companies", () => {
  afterEach(async () => {
    await cleanupTestUsers();
  });

  it("rejects unauthenticated requests on every endpoint", async () => {
    expect((await request(app).get("/api/sponsor-companies")).status).toBe(401);
    expect(
      (await request(app).post("/api/sponsor-companies/import")).status,
    ).toBe(401);
    expect((await request(app).patch("/api/sponsor-companies/1")).status).toBe(
      401,
    );
    expect((await request(app).delete("/api/sponsor-companies/1")).status).toBe(
      401,
    );
  });

  describe("POST /import", () => {
    it("imports newline- and comma-separated names, deduped, defaulting to NL", async () => {
      const { agent } = await registerAndLogin(app);

      const res = await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V.\nGlobex NV, Acme B.V.\n\nInitech" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ created: 3, skippedExisting: 0 });

      const list = await agent.get("/api/sponsor-companies");
      expect(list.body.companies).toHaveLength(3);
      expect(list.body.total).toBe(3);
      expect(list.body.companies.every((c) => c.country === "NL")).toBe(true);
      expect(
        list.body.companies.every((c) => c.outreachStatus === "NOT_STARTED"),
      ).toBe(true);
    });

    it("skips names that already exist on re-import instead of duplicating", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V.\nGlobex NV" });

      const res = await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "acme b.v.\nInitech" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ created: 1, skippedExisting: 1 });

      const list = await agent.get("/api/sponsor-companies");
      expect(list.body.total).toBe(3);
    });

    it("rejects text with no parseable company names", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "   \n , ,  " });
      expect(res.status).toBe(400);
    });

    it("accepts a custom country", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme GmbH", country: "DE" });
      expect(res.status).toBe(201);

      const list = await agent.get("/api/sponsor-companies?country=DE");
      expect(list.body.companies).toHaveLength(1);
      expect(list.body.companies[0].country).toBe("DE");
    });
  });

  describe("GET /", () => {
    it("only lists the current user's companies", async () => {
      const userA = await registerAndLogin(app);
      const userB = await registerAndLogin(app);
      await userA.agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V." });
      await userB.agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Globex NV" });

      const res = await userA.agent.get("/api/sponsor-companies");
      expect(res.body.companies).toHaveLength(1);
      expect(res.body.companies[0].name).toBe("Acme B.V.");
    });

    it("filters by status", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V.\nGlobex NV" });
      const list = await agent.get("/api/sponsor-companies");
      await agent
        .patch(`/api/sponsor-companies/${list.body.companies[0].id}`)
        .send({ outreachStatus: "APPLIED" });

      const res = await agent.get("/api/sponsor-companies?status=APPLIED");
      expect(res.body.companies).toHaveLength(1);
      expect(res.body.companies[0].outreachStatus).toBe("APPLIED");
    });

    it("rejects an invalid status filter", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent.get("/api/sponsor-companies?status=BOGUS");
      expect(res.status).toBe(400);
    });

    it("filters by a case-insensitive name search", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Booking.com B.V.\nAdyen N.V." });

      const res = await agent.get("/api/sponsor-companies?search=booking");
      expect(res.body.companies).toHaveLength(1);
      expect(res.body.companies[0].name).toBe("Booking.com B.V.");
    });

    it("paginates results and reports the total separately from the page size", async () => {
      const { agent } = await registerAndLogin(app);
      await agent.post("/api/sponsor-companies/import").send({
        text: Array.from({ length: 45 }, (_, i) => `Company ${i}`).join("\n"),
      });

      const page1 = await agent.get("/api/sponsor-companies?limit=20&page=1");
      expect(page1.body.companies).toHaveLength(20);
      expect(page1.body.total).toBe(45);
      expect(page1.body.page).toBe(1);

      const page3 = await agent.get("/api/sponsor-companies?limit=20&page=3");
      expect(page3.body.companies).toHaveLength(5);
    });

    it("caps the page size at the maximum limit", async () => {
      const { agent } = await registerAndLogin(app);
      const res = await agent.get("/api/sponsor-companies?limit=99999");
      expect(res.body.limit).toBe(100);
    });
  });

  describe("PATCH /:id", () => {
    it("updates outreach status, notes, hiresItWorkers, and careersUrl", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V." });
      const list = await agent.get("/api/sponsor-companies");
      const id = list.body.companies[0].id;

      const res = await agent.patch(`/api/sponsor-companies/${id}`).send({
        outreachStatus: "RESEARCHING",
        hiresItWorkers: true,
        notes: "Has an open-source team",
        careersUrl: "https://acme.example.com/careers",
      });

      expect(res.status).toBe(200);
      expect(res.body.outreachStatus).toBe("RESEARCHING");
      expect(res.body.hiresItWorkers).toBe(true);
      expect(res.body.notes).toBe("Has an open-source team");
      expect(res.body.careersUrl).toBe("https://acme.example.com/careers");
    });

    it("allows explicitly resetting hiresItWorkers to null", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V." });
      const list = await agent.get("/api/sponsor-companies");
      const id = list.body.companies[0].id;
      await agent
        .patch(`/api/sponsor-companies/${id}`)
        .send({ hiresItWorkers: true });

      const res = await agent
        .patch(`/api/sponsor-companies/${id}`)
        .send({ hiresItWorkers: null });

      expect(res.status).toBe(200);
      expect(res.body.hiresItWorkers).toBeNull();
    });

    it("rejects an invalid outreachStatus", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V." });
      const list = await agent.get("/api/sponsor-companies");

      const res = await agent
        .patch(`/api/sponsor-companies/${list.body.companies[0].id}`)
        .send({ outreachStatus: "BOGUS" });
      expect(res.status).toBe(400);
    });

    it("returns 404 for another user's company", async () => {
      const userA = await registerAndLogin(app);
      const userB = await registerAndLogin(app);
      await userA.agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V." });
      const list = await userA.agent.get("/api/sponsor-companies");

      const res = await userB.agent
        .patch(`/api/sponsor-companies/${list.body.companies[0].id}`)
        .send({ notes: "sneaky" });
      expect(res.status).toBe(404);
    });

    it("sets lastOutreachAt when outreachStatus changes", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V." });
      const list = await agent.get("/api/sponsor-companies");
      const id = list.body.companies[0].id;
      expect(list.body.companies[0].lastOutreachAt).toBeNull();

      const res = await agent
        .patch(`/api/sponsor-companies/${id}`)
        .send({ outreachStatus: "RESEARCHING" });

      expect(res.body.lastOutreachAt).not.toBeNull();
    });

    it("does not set lastOutreachAt on a notes-only edit", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V." });
      const list = await agent.get("/api/sponsor-companies");
      const id = list.body.companies[0].id;

      const res = await agent
        .patch(`/api/sponsor-companies/${id}`)
        .send({ notes: "Has an open-source team" });

      expect(res.body.lastOutreachAt).toBeNull();
    });

    it("does not re-touch lastOutreachAt when outreachStatus is set to its current value", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V." });
      const list = await agent.get("/api/sponsor-companies");
      const id = list.body.companies[0].id;
      const first = await agent
        .patch(`/api/sponsor-companies/${id}`)
        .send({ outreachStatus: "RESEARCHING" });

      const second = await agent
        .patch(`/api/sponsor-companies/${id}`)
        .send({ outreachStatus: "RESEARCHING", notes: "still researching" });

      expect(second.body.lastOutreachAt).toBe(first.body.lastOutreachAt);
    });
  });

  describe("DELETE /:id", () => {
    it("deletes a company owned by the current user", async () => {
      const { agent } = await registerAndLogin(app);
      await agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V." });
      const list = await agent.get("/api/sponsor-companies");

      const res = await agent.delete(
        `/api/sponsor-companies/${list.body.companies[0].id}`,
      );
      expect(res.status).toBe(204);

      const after = await agent.get("/api/sponsor-companies");
      expect(after.body.total).toBe(0);
    });

    it("returns 404 deleting another user's company", async () => {
      const userA = await registerAndLogin(app);
      const userB = await registerAndLogin(app);
      await userA.agent
        .post("/api/sponsor-companies/import")
        .send({ text: "Acme B.V." });
      const list = await userA.agent.get("/api/sponsor-companies");

      const res = await userB.agent.delete(
        `/api/sponsor-companies/${list.body.companies[0].id}`,
      );
      expect(res.status).toBe(404);
    });
  });
});
