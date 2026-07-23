import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import mammoth from "mammoth";
import {
  resolveModel,
  mapAnthropicError,
  AiExtractionError,
} from "./aiClient.service.js";

export { AiExtractionError } from "./aiClient.service.js";

const JobExtractionSchema = z.object({
  title: z.string(),
  company: z.string(),
  locationText: z.string().nullable(),
  description: z.string(),
  requiredSkills: z.array(z.string()),
});

/**
 * Extracts structured job-listing fields from raw pasted text (e.g. a job
 * ad copy-pasted from a careers page). Uses the caller's own Anthropic API
 * key — never persisted, used only for this one request.
 *
 * @param {{ apiKey: string, model?: string, rawText: string }} args
 * @returns {Promise<{ title: string, company: string, locationText: string|null, description: string, requiredSkills: string[] }>}
 */
export async function extractJobFromText({ apiKey, model, rawText }) {
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: resolveModel(model),
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Extract structured job-posting fields from this raw pasted text (it may include navigation chrome, ads, or other page clutter mixed in — ignore that). If a field can't be determined, use an empty string for title/company/description, or null for locationText. requiredSkills should be short skill/technology names (e.g. "React", "SQL"), not full sentences — omit it if none are mentioned.\n\n---\n${rawText}\n---`,
        },
      ],
      output_config: { format: zodOutputFormat(JobExtractionSchema) },
    });

    if (!response.parsed_output) {
      throw new AiExtractionError("AI response could not be parsed", 502);
    }
    return response.parsed_output;
  } catch (err) {
    if (err instanceof AiExtractionError) throw err;
    throw mapAnthropicError(err);
  }
}

const SkillExtractionSchema = z.object({
  skills: z.array(z.string()),
});

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Extracts a flat skills list from a CV file buffer. PDFs are sent natively
 * (base64 document block); DOCX text is extracted first via mammoth, since
 * Claude has no native DOCX support. Legacy .doc has no reliable pure-JS
 * text extractor, so it's rejected here (the file itself can still be
 * uploaded/stored — this only blocks the AI-extraction path).
 *
 * @param {{ apiKey: string, model?: string, buffer: Buffer, mimeType: string }} args
 * @returns {Promise<string[]>}
 */
export async function extractSkillsFromCv({ apiKey, model, buffer, mimeType }) {
  const instruction =
    'Extract a flat list of professional skills, technologies, tools, and competencies mentioned in this CV/resume. Return short skill names (e.g. "React", "Project Management"), not sentences. No duplicates.';

  let content;
  if (mimeType === "application/pdf") {
    content = [
      { type: "text", text: instruction },
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: buffer.toString("base64"),
        },
      },
    ];
  } else if (mimeType === DOCX_MIME_TYPE) {
    const { value: text } = await mammoth.extractRawText({ buffer });
    content = [{ type: "text", text: `${instruction}\n\n---\n${text}\n---` }];
  } else {
    throw new AiExtractionError(
      "AI skill extraction supports PDF and DOCX only (not legacy .doc)",
      400,
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: resolveModel(model),
      max_tokens: 2000,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(SkillExtractionSchema) },
    });

    if (!response.parsed_output) {
      throw new AiExtractionError("AI response could not be parsed", 502);
    }
    return response.parsed_output.skills;
  } catch (err) {
    if (err instanceof AiExtractionError) throw err;
    throw mapAnthropicError(err);
  }
}
