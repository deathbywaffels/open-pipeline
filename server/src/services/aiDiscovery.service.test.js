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
const { recommendCandidates } = await import("./aiDiscovery.service.js");
const { AiExtractionError } = await import("./aiClient.service.js");

const baseArgs = {
  apiKey: "sk-test",
  postingTitle: "Backend Engineer",
  postingDescription: "Build APIs.",
  requiredSkills: ["Node.js"],
  candidates: [{ id: 1, name: "Jane Dev", skills: ["Node.js", "SQL"] }],
};

beforeEach(() => {
  mockParse.mockReset();
});

describe("recommendCandidates", () => {
  test("returns the parsed recommendations on success", async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        recommendations: [
          { candidateId: 1, rationale: "Strong Node.js and SQL match." },
        ],
      },
    });

    const result = await recommendCandidates(baseArgs);

    expect(result).toEqual([
      { candidateId: 1, rationale: "Strong Node.js and SQL match." },
    ]);
  });

  test("includes the posting details and candidate list in the prompt", async () => {
    mockParse.mockResolvedValue({ parsed_output: { recommendations: [] } });

    await recommendCandidates(baseArgs);

    const content = mockParse.mock.calls[0][0].messages[0].content;
    expect(content).toContain("Backend Engineer");
    expect(content).toContain("Node.js");
    expect(content).toContain("ID 1: Jane Dev");
  });

  test("handles an empty candidate list without crashing", async () => {
    mockParse.mockResolvedValue({ parsed_output: { recommendations: [] } });

    await expect(
      recommendCandidates({ ...baseArgs, candidates: [] }),
    ).resolves.toEqual([]);
  });

  test("throws a 502 AiExtractionError when parsed_output is null", async () => {
    mockParse.mockResolvedValue({ parsed_output: null });

    await expect(recommendCandidates(baseArgs)).rejects.toMatchObject({
      status: 502,
    });
  });

  test("maps AuthenticationError to a 401 AiExtractionError", async () => {
    mockParse.mockRejectedValue(new Anthropic.AuthenticationError("bad key"));

    await expect(
      recommendCandidates({ ...baseArgs, apiKey: "sk-bad" }),
    ).rejects.toBeInstanceOf(AiExtractionError);
    await expect(
      recommendCandidates({ ...baseArgs, apiKey: "sk-bad" }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
