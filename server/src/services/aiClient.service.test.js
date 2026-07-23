import { jest } from "@jest/globals";

jest.unstable_mockModule("@anthropic-ai/sdk", () => {
  class AuthenticationError extends Error {}
  class PermissionDeniedError extends Error {}
  class NotFoundError extends Error {}
  class RateLimitError extends Error {}
  class BadRequestError extends Error {}
  class APIConnectionError extends Error {}
  class APIError extends Error {}

  class MockAnthropic {}
  MockAnthropic.AuthenticationError = AuthenticationError;
  MockAnthropic.PermissionDeniedError = PermissionDeniedError;
  MockAnthropic.NotFoundError = NotFoundError;
  MockAnthropic.RateLimitError = RateLimitError;
  MockAnthropic.BadRequestError = BadRequestError;
  MockAnthropic.APIConnectionError = APIConnectionError;
  MockAnthropic.APIError = APIError;

  return { default: MockAnthropic };
});

const Anthropic = (await import("@anthropic-ai/sdk")).default;
const { resolveModel, mapAnthropicError, AiExtractionError, DEFAULT_MODEL } =
  await import("./aiClient.service.js");

describe("resolveModel", () => {
  test("passes through an allowlisted model", () => {
    expect(resolveModel("claude-sonnet-5")).toBe("claude-sonnet-5");
  });

  test("falls back to the default model for anything not allowlisted", () => {
    expect(resolveModel("gpt-5")).toBe(DEFAULT_MODEL);
    expect(resolveModel(undefined)).toBe(DEFAULT_MODEL);
  });
});

describe("mapAnthropicError", () => {
  test.each([
    [Anthropic.AuthenticationError, 401],
    [Anthropic.PermissionDeniedError, 403],
    [Anthropic.NotFoundError, 400],
    [Anthropic.RateLimitError, 429],
    [Anthropic.BadRequestError, 400],
    [Anthropic.APIConnectionError, 502],
    [Anthropic.APIError, 502],
  ])("maps %p to status %d", (ErrorClass, status) => {
    const mapped = mapAnthropicError(new ErrorClass("boom"));
    expect(mapped).toBeInstanceOf(AiExtractionError);
    expect(mapped.status).toBe(status);
  });

  test("maps an unrecognized error to a 502", () => {
    const mapped = mapAnthropicError(new Error("something else"));
    expect(mapped.status).toBe(502);
  });
});
