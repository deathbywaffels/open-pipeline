import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";

describe("GET /api/health", () => {
  it("returns 200 with an ok status and a timestamp", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });
});
