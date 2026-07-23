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

const pdfBuffer = Buffer.from("%PDF-1.4 fake rejection letter for testing");

const job = {
  title: "Backend Engineer",
  company: "Acme",
  description: "Build APIs",
  sourceUrl: "https://example.com/1",
};

async function createApplication(agent) {
  const created = await agent.post("/api/job-listings").send(job);
  await agent
    .post(`/api/job-listings/${created.body.id}/swipe`)
    .send({ direction: "like" });
  const list = await agent.get("/api/applications");
  return list.body[0].id;
}

describe("rejection letters", () => {
  afterEach(async () => {
    await cleanupTestUsers();
    objectStore.clear();
  });

  it("rejects unauthenticated requests", async () => {
    expect(
      (await request(app).post("/api/applications/1/rejection-letter")).status,
    ).toBe(401);
    expect(
      (await request(app).get("/api/rejection-letters/1/download")).status,
    ).toBe(401);
  });

  it("returns 404 uploading to a nonexistent application", async () => {
    const { agent } = await registerAndLogin(app);
    const res = await agent
      .post("/api/applications/999999/rejection-letter")
      .attach("file", pdfBuffer, {
        filename: "letter.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(404);
  });

  it("returns 404 uploading to another user's application", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    const applicationId = await createApplication(userA.agent);

    const res = await userB.agent
      .post(`/api/applications/${applicationId}/rejection-letter`)
      .attach("file", pdfBuffer, {
        filename: "letter.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(404);
  });

  it("rejects an upload with no file attached", async () => {
    const { agent } = await registerAndLogin(app);
    const applicationId = await createApplication(agent);

    const res = await agent.post(
      `/api/applications/${applicationId}/rejection-letter`,
    );
    expect(res.status).toBe(400);
  });

  it("rejects a disallowed file type", async () => {
    const { agent } = await registerAndLogin(app);
    const applicationId = await createApplication(agent);

    const res = await agent
      .post(`/api/applications/${applicationId}/rejection-letter`)
      .attach("file", Buffer.from("nope"), {
        filename: "letter.exe",
        contentType: "application/x-msdownload",
      });
    expect(res.status).toBe(400);
  });

  it("uploads a rejection letter and downloads it back with matching content", async () => {
    const { agent } = await registerAndLogin(app);
    const applicationId = await createApplication(agent);
    await agent
      .patch(`/api/applications/${applicationId}/stage`)
      .send({ toStage: "REJECTED" });

    const uploadRes = await agent
      .post(`/api/applications/${applicationId}/rejection-letter`)
      .attach("file", pdfBuffer, {
        filename: "letter.pdf",
        contentType: "application/pdf",
      });
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.filename).toBe("letter.pdf");

    const downloadRes = await agent.get(
      `/api/rejection-letters/${uploadRes.body.id}/download`,
    );
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body.toString()).toBe(pdfBuffer.toString());
  });

  it("returns 404 downloading another user's rejection letter", async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    const applicationId = await createApplication(userA.agent);

    const uploadRes = await userA.agent
      .post(`/api/applications/${applicationId}/rejection-letter`)
      .attach("file", pdfBuffer, {
        filename: "letter.pdf",
        contentType: "application/pdf",
      });

    const res = await userB.agent.get(
      `/api/rejection-letters/${uploadRes.body.id}/download`,
    );
    expect(res.status).toBe(404);
  });
});
