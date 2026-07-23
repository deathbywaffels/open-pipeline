import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";

const app = createApp();

describe("desired locations", () => {
  afterEach(async () => {
    await cleanupTestUsers();
  });

  it("rejects unauthenticated requests on every endpoint", async () => {
    expect((await request(app).get("/api/desired-locations")).status).toBe(401);
    expect((await request(app).post("/api/desired-locations")).status).toBe(
      401,
    );
    expect(
      (await request(app).post("/api/desired-locations/1/geocode")).status,
    ).toBe(401);
    expect((await request(app).delete("/api/desired-locations/1")).status).toBe(
      401,
    );
  });

  it("rejects an empty label", async () => {
    const { agent } = await registerAndLogin(app);
    const res = await agent.post("/api/desired-locations").send({
      label: "   ",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate label for the same user", async () => {
    const { agent } = await registerAndLogin(app);
    await agent.post("/api/desired-locations").send({ label: "Amsterdam" });

    const res = await agent
      .post("/api/desired-locations")
      .send({ label: "Amsterdam" });
    expect(res.status).toBe(409);
  });

  it("only lists the current user's own locations", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);

    await userA.agent
      .post("/api/desired-locations")
      .send({ label: "Amsterdam" });
    await userB.agent.post("/api/desired-locations").send({ label: "Utrecht" });

    const res = await userA.agent.get("/api/desired-locations");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].label).toBe("Amsterdam");
  });

  it("deletes a location owned by the current user", async () => {
    const { agent } = await registerAndLogin(app);
    const created = await agent
      .post("/api/desired-locations")
      .send({ label: "Amsterdam" });

    const res = await agent.delete(`/api/desired-locations/${created.body.id}`);
    expect(res.status).toBe(204);

    const list = await agent.get("/api/desired-locations");
    expect(list.body).toHaveLength(0);
  });

  it("returns 404 deleting another user's location", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    const created = await userA.agent
      .post("/api/desired-locations")
      .send({ label: "Amsterdam" });

    const res = await userB.agent.delete(
      `/api/desired-locations/${created.body.id}`,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 retrying geocode on another user's location", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    const created = await userA.agent
      .post("/api/desired-locations")
      .send({ label: "Amsterdam" });

    const res = await userB.agent.post(
      `/api/desired-locations/${created.body.id}/geocode`,
    );
    expect(res.status).toBe(404);
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
        json: async () => [{ lat: "52.3676", lon: "4.9041" }],
      });
      const { agent } = await registerAndLogin(app);

      const res = await agent
        .post("/api/desired-locations")
        .send({ label: "Amsterdam" });

      expect(res.status).toBe(201);
      expect(res.body.latitude).toBeCloseTo(52.3676);
      expect(res.body.longitude).toBeCloseTo(4.9041);
    });

    it("still saves the location when geocoding fails", async () => {
      global.fetch.mockRejectedValueOnce(new Error("network down"));
      const { agent } = await registerAndLogin(app);

      const res = await agent
        .post("/api/desired-locations")
        .send({ label: "Nowhere" });

      expect(res.status).toBe(201);
      expect(res.body.latitude).toBeNull();
      expect(res.body.longitude).toBeNull();
    });

    it("retries geocoding on request and updates coordinates", async () => {
      global.fetch.mockResolvedValueOnce({ ok: false }); // create-time attempt fails
      const { agent } = await registerAndLogin(app);
      const created = await agent
        .post("/api/desired-locations")
        .send({ label: "Amsterdam" });
      expect(created.body.latitude).toBeNull();

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "52.3676", lon: "4.9041" }],
      });
      const res = await agent.post(
        `/api/desired-locations/${created.body.id}/geocode`,
      );

      expect(res.status).toBe(200);
      expect(res.body.latitude).toBeCloseTo(52.3676);
    });
  });
});
