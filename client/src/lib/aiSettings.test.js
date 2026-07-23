import { describe, it, expect, beforeEach } from "vitest";
import {
  AI_MODELS,
  DEFAULT_AI_MODEL,
  getApiKey,
  setApiKey,
  hasApiKey,
  getModel,
  setModel,
  aiHeaders,
} from "./aiSettings.js";

beforeEach(() => {
  localStorage.clear();
});

describe("apiKey storage", () => {
  it("returns an empty string when no key is stored", () => {
    expect(getApiKey()).toBe("");
    expect(hasApiKey()).toBe(false);
  });

  it("round-trips a key through localStorage", () => {
    setApiKey("sk-ant-test-123");
    expect(getApiKey()).toBe("sk-ant-test-123");
    expect(hasApiKey()).toBe(true);
  });

  it("clears the stored key when set to an empty value", () => {
    setApiKey("sk-ant-test-123");
    setApiKey("");
    expect(getApiKey()).toBe("");
    expect(hasApiKey()).toBe(false);
  });
});

describe("model storage", () => {
  it("defaults to DEFAULT_AI_MODEL when nothing is stored", () => {
    expect(getModel()).toBe(DEFAULT_AI_MODEL);
    expect(AI_MODELS.some((m) => m.value === DEFAULT_AI_MODEL)).toBe(true);
  });

  it("round-trips a chosen model through localStorage", () => {
    setModel("claude-haiku-4-5");
    expect(getModel()).toBe("claude-haiku-4-5");
  });
});

describe("aiHeaders", () => {
  it("builds headers from the currently stored key and model", () => {
    setApiKey("sk-ant-test-123");
    setModel("claude-sonnet-5");
    expect(aiHeaders()).toEqual({
      "X-AI-Api-Key": "sk-ant-test-123",
      "X-AI-Model": "claude-sonnet-5",
    });
  });
});
