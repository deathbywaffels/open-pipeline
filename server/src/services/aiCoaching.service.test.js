import { jest } from "@jest/globals";

const mockParse = jest.fn();

jest.unstable_mockModule("@anthropic-ai/sdk", () => {
  class AuthenticationError extends Error {}
  class RateLimitError extends Error {}

  class MockAnthropic {
    constructor(opts) {
      this.opts = opts;
      this.messages = { parse: mockParse };
    }
  }
  MockAnthropic.AuthenticationError = AuthenticationError;
  MockAnthropic.RateLimitError = RateLimitError;

  return { default: MockAnthropic };
});

const Anthropic = (await import("@anthropic-ai/sdk")).default;
const { suggestAlternateRoles } = await import("./aiCoaching.service.js");
const { AiExtractionError } = await import("./aiClient.service.js");

beforeEach(() => {
  mockParse.mockReset();
});

describe("suggestAlternateRoles", () => {
  test("returns the parsed suggestions on success", async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        suggestions: [
          { role: "DevOps Engineer", rationale: "You know Docker and CI/CD." },
        ],
      },
    });

    const result = await suggestAlternateRoles({
      apiKey: "sk-test",
      model: "claude-opus-4-8",
      userSkills: ["Docker", "CI/CD"],
      appliedJobTitles: ["Backend Engineer"],
    });

    expect(result).toEqual([
      { role: "DevOps Engineer", rationale: "You know Docker and CI/CD." },
    ]);
  });

  test("includes the user's skills and already-applied titles in the prompt", async () => {
    mockParse.mockResolvedValue({ parsed_output: { suggestions: [] } });

    await suggestAlternateRoles({
      apiKey: "sk-test",
      userSkills: ["React"],
      appliedJobTitles: ["Frontend Engineer"],
    });

    const content = mockParse.mock.calls[0][0].messages[0].content;
    expect(content).toContain("React");
    expect(content).toContain("Frontend Engineer");
  });

  test("handles empty skills/applied-titles lists without crashing", async () => {
    mockParse.mockResolvedValue({ parsed_output: { suggestions: [] } });

    await expect(
      suggestAlternateRoles({
        apiKey: "sk-test",
        userSkills: [],
        appliedJobTitles: [],
      }),
    ).resolves.toEqual([]);
  });

  test("throws a 502 AiExtractionError when parsed_output is null", async () => {
    mockParse.mockResolvedValue({ parsed_output: null });

    await expect(
      suggestAlternateRoles({
        apiKey: "sk-test",
        userSkills: [],
        appliedJobTitles: [],
      }),
    ).rejects.toMatchObject({ status: 502 });
  });

  test("maps AuthenticationError to a 401 AiExtractionError", async () => {
    mockParse.mockRejectedValue(new Anthropic.AuthenticationError("bad key"));

    await expect(
      suggestAlternateRoles({
        apiKey: "sk-bad",
        userSkills: [],
        appliedJobTitles: [],
      }),
    ).rejects.toBeInstanceOf(AiExtractionError);
    await expect(
      suggestAlternateRoles({
        apiKey: "sk-bad",
        userSkills: [],
        appliedJobTitles: [],
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
