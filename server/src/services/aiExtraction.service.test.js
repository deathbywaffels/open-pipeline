import { jest } from "@jest/globals";

const mockParse = jest.fn();
const mockExtractRawText = jest.fn();

jest.unstable_mockModule("@anthropic-ai/sdk", () => {
  class AuthenticationError extends Error {}
  class PermissionDeniedError extends Error {}
  class NotFoundError extends Error {}
  class RateLimitError extends Error {}
  class BadRequestError extends Error {}
  class APIConnectionError extends Error {}
  class APIError extends Error {}

  class MockAnthropic {
    constructor(opts) {
      this.opts = opts;
      this.messages = { parse: mockParse };
    }
  }
  MockAnthropic.AuthenticationError = AuthenticationError;
  MockAnthropic.PermissionDeniedError = PermissionDeniedError;
  MockAnthropic.NotFoundError = NotFoundError;
  MockAnthropic.RateLimitError = RateLimitError;
  MockAnthropic.BadRequestError = BadRequestError;
  MockAnthropic.APIConnectionError = APIConnectionError;
  MockAnthropic.APIError = APIError;

  return { default: MockAnthropic };
});

jest.unstable_mockModule("mammoth", () => ({
  default: { extractRawText: mockExtractRawText },
}));

const Anthropic = (await import("@anthropic-ai/sdk")).default;
const { extractJobFromText, extractSkillsFromCv, AiExtractionError } =
  await import("./aiExtraction.service.js");

beforeEach(() => {
  mockParse.mockReset();
  mockExtractRawText.mockReset();
});

describe("extractJobFromText", () => {
  test("returns the parsed job fields on success", async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        title: "Backend Engineer",
        company: "Acme",
        locationText: "Remote",
        description: "Build APIs.",
        requiredSkills: ["Node.js", "SQL"],
      },
    });

    const result = await extractJobFromText({
      apiKey: "sk-test",
      model: "claude-opus-4-8",
      rawText: "Backend Engineer at Acme, remote, Node.js + SQL required.",
    });

    expect(result).toEqual({
      title: "Backend Engineer",
      company: "Acme",
      locationText: "Remote",
      description: "Build APIs.",
      requiredSkills: ["Node.js", "SQL"],
    });
    expect(mockParse).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-opus-4-8" }),
    );
  });

  test("falls back to the default model for an unrecognized model string", async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        title: "",
        company: "",
        locationText: null,
        description: "",
        requiredSkills: [],
      },
    });

    await extractJobFromText({
      apiKey: "sk-test",
      model: "gpt-5",
      rawText: "text",
    });

    expect(mockParse).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-opus-4-8" }),
    );
  });

  test("throws a 502 AiExtractionError when parsed_output is null", async () => {
    mockParse.mockResolvedValue({ parsed_output: null });

    await expect(
      extractJobFromText({ apiKey: "sk-test", rawText: "text" }),
    ).rejects.toMatchObject({ status: 502 });
  });

  test("maps AuthenticationError to a 401 AiExtractionError", async () => {
    mockParse.mockRejectedValue(new Anthropic.AuthenticationError("bad key"));

    await expect(
      extractJobFromText({ apiKey: "sk-bad", rawText: "text" }),
    ).rejects.toBeInstanceOf(AiExtractionError);
    await expect(
      extractJobFromText({ apiKey: "sk-bad", rawText: "text" }),
    ).rejects.toMatchObject({ status: 401 });
  });

  test("maps RateLimitError to a 429 AiExtractionError", async () => {
    mockParse.mockRejectedValue(new Anthropic.RateLimitError("slow down"));

    await expect(
      extractJobFromText({ apiKey: "sk-test", rawText: "text" }),
    ).rejects.toMatchObject({ status: 429 });
  });
});

describe("extractSkillsFromCv", () => {
  test("sends a base64 document block for a PDF and returns the skills", async () => {
    mockParse.mockResolvedValue({
      parsed_output: { skills: ["React", "Node.js"] },
    });

    const skills = await extractSkillsFromCv({
      apiKey: "sk-test",
      buffer: Buffer.from("%PDF-fake"),
      mimeType: "application/pdf",
    });

    expect(skills).toEqual(["React", "Node.js"]);
    const content = mockParse.mock.calls[0][0].messages[0].content;
    const documentBlock = content.find((block) => block.type === "document");
    expect(documentBlock.source).toEqual({
      type: "base64",
      media_type: "application/pdf",
      data: Buffer.from("%PDF-fake").toString("base64"),
    });
    expect(mockExtractRawText).not.toHaveBeenCalled();
  });

  test("extracts DOCX text via mammoth and sends it as a text block", async () => {
    mockExtractRawText.mockResolvedValue({
      value: "Experienced with Python and Docker.",
    });
    mockParse.mockResolvedValue({
      parsed_output: { skills: ["Python", "Docker"] },
    });

    const skills = await extractSkillsFromCv({
      apiKey: "sk-test",
      buffer: Buffer.from("docx-bytes"),
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    expect(skills).toEqual(["Python", "Docker"]);
    expect(mockExtractRawText).toHaveBeenCalledWith({
      buffer: Buffer.from("docx-bytes"),
    });
    const content = mockParse.mock.calls[0][0].messages[0].content;
    expect(content.some((b) => b.type === "document")).toBe(false);
    expect(content[0].text).toContain("Experienced with Python and Docker.");
  });

  test("rejects legacy .doc files without calling Anthropic", async () => {
    await expect(
      extractSkillsFromCv({
        apiKey: "sk-test",
        buffer: Buffer.from("doc-bytes"),
        mimeType: "application/msword",
      }),
    ).rejects.toMatchObject({ status: 400 });

    expect(mockParse).not.toHaveBeenCalled();
  });
});
