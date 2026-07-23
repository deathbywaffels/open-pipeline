import { describe, it, expect, afterEach, jest } from "@jest/globals";
import request from "supertest";
import { Readable } from "node:stream";
import {
  registerAndLogin,
  cleanupTestUsers,
} from "../test-utils/registerAndLogin.js";

// In-memory stand-in for R2 so tests don't need real bucket credentials —
// still exercises a real upload -> download byte-for-byte round trip.
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

describe("cv", () => {
  afterEach(async () => {
    await cleanupTestUsers();
    objectStore.clear();
  });

  it("rejects unauthenticated requests on every endpoint", async () => {
    expect((await request(app).get("/api/cv")).status).toBe(401);
    expect((await request(app).post("/api/cv")).status).toBe(401);
    expect((await request(app).get("/api/cv/1/download")).status).toBe(401);
  });

  it("rejects an upload with no file attached", async () => {
    const { agent } = await registerAndLogin(app);
    const res = await agent.post("/api/cv");
    expect(res.status).toBe(400);
  });

  it("rejects a disallowed file type", async () => {
    const { agent } = await registerAndLogin(app);
    const res = await agent
      .post("/api/cv")
      .attach("file", Buffer.from("not a real cv"), {
        filename: "resume.exe",
        contentType: "application/x-msdownload",
      });
    expect(res.status).toBe(400);
  });

  it("rejects a file over the 10MB limit", async () => {
    const { agent } = await registerAndLogin(app);
    const tooBig = Buffer.alloc(11 * 1024 * 1024);
    const res = await agent.post("/api/cv").attach("file", tooBig, {
      filename: "big.pdf",
      contentType: "application/pdf",
    });
    expect(res.status).toBe(400);
  }, 15000);

  it("uploads a CV and lists it back", async () => {
    const { agent } = await registerAndLogin(app);

    const uploadRes = await agent.post("/api/cv").attach("file", pdfBuffer, {
      filename: "resume.pdf",
      contentType: "application/pdf",
    });
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.filename).toBe("resume.pdf");
    expect(uploadRes.body).not.toHaveProperty("storageKey");

    const listRes = await agent.get("/api/cv");
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].filename).toBe("resume.pdf");
  });

  it("downloads an uploaded CV with matching content", async () => {
    const { agent } = await registerAndLogin(app);
    const uploadRes = await agent.post("/api/cv").attach("file", pdfBuffer, {
      filename: "resume.pdf",
      contentType: "application/pdf",
    });

    const downloadRes = await agent.get(
      `/api/cv/${uploadRes.body.id}/download`,
    );
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body.toString()).toBe(pdfBuffer.toString());
  });

  it("only lists the current user's CVs", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    await userA.agent.post("/api/cv").attach("file", pdfBuffer, {
      filename: "a.pdf",
      contentType: "application/pdf",
    });

    const res = await userB.agent.get("/api/cv");
    expect(res.body).toHaveLength(0);
  });

  it("returns 404 downloading another user's CV", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    const uploadRes = await userA.agent
      .post("/api/cv")
      .attach("file", pdfBuffer, {
        filename: "a.pdf",
        contentType: "application/pdf",
      });

    const res = await userB.agent.get(`/api/cv/${uploadRes.body.id}/download`);
    expect(res.status).toBe(404);
  });
});
