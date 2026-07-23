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
const { analyzeCompanyFit } = await import("./aiCompanyFit.service.js");
const { AiExtractionError } = await import("./aiClient.service.js");

beforeEach(() => {
  mockParse.mockReset();
});

describe("analyzeCompanyFit", () => {
  test("returns the parsed fit analysis on success", async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        fitLabel: "strong",
        matchingSkills: ["React"],
        gaps: ["GraphQL"],
        summary: "Good match overall.",
      },
    });

    const result = await analyzeCompanyFit({
      apiKey: "sk-test",
      model: "claude-opus-4-8",
      userSkills: ["React", "Node.js"],
      contextText: "Looking for a React + GraphQL developer.",
    });

    expect(result).toEqual({
      fitLabel: "strong",
      matchingSkills: ["React"],
      gaps: ["GraphQL"],
      summary: "Good match overall.",
    });
  });

  test("includes the user's skills and the pasted context in the prompt", async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        fitLabel: "moderate",
        matchingSkills: [],
        gaps: [],
        summary: "s",
      },
    });

    await analyzeCompanyFit({
      apiKey: "sk-test",
      userSkills: ["Python"],
      contextText: "Data engineering role at Acme.",
    });

    const content = mockParse.mock.calls[0][0].messages[0].content;
    expect(content).toContain("Python");
    expect(content).toContain("Data engineering role at Acme.");
  });

  test("handles an empty skills list without crashing", async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        fitLabel: "weak",
        matchingSkills: [],
        gaps: [],
        summary: "s",
      },
    });

    await expect(
      analyzeCompanyFit({
        apiKey: "sk-test",
        userSkills: [],
        contextText: "Some role.",
      }),
    ).resolves.toMatchObject({ fitLabel: "weak" });
  });

  test("throws a 502 AiExtractionError when parsed_output is null", async () => {
    mockParse.mockResolvedValue({ parsed_output: null });

    await expect(
      analyzeCompanyFit({
        apiKey: "sk-test",
        userSkills: [],
        contextText: "text",
      }),
    ).rejects.toMatchObject({ status: 502 });
  });

  test("maps AuthenticationError to a 401 AiExtractionError", async () => {
    mockParse.mockRejectedValue(new Anthropic.AuthenticationError("bad key"));

    await expect(
      analyzeCompanyFit({
        apiKey: "sk-bad",
        userSkills: [],
        contextText: "text",
      }),
    ).rejects.toBeInstanceOf(AiExtractionError);
    await expect(
      analyzeCompanyFit({
        apiKey: "sk-bad",
        userSkills: [],
        contextText: "text",
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
