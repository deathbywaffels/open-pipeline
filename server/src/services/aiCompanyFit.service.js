import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  resolveModel,
  mapAnthropicError,
  AiExtractionError,
} from "./aiClient.service.js";

const FitAnalysisSchema = z.object({
  fitLabel: z.enum(["strong", "moderate", "weak"]),
  matchingSkills: z.array(z.string()),
  gaps: z.array(z.string()),
  summary: z.string(),
});

/**
 * Assesses how good a fit the user is for a pasted job/company
 * description, based only on their listed skills. Uses the caller's own
 * Anthropic API key — never persisted, used only for this one request.
 *
 * @param {{ apiKey: string, model?: string, userSkills: string[], contextText: string }} args
 * @returns {Promise<{ fitLabel: "strong"|"moderate"|"weak", matchingSkills: string[], gaps: string[], summary: string }>}
 */
export async function analyzeCompanyFit({
  apiKey,
  model,
  userSkills,
  contextText,
}) {
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: resolveModel(model),
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `My skills: ${userSkills.length ? userSkills.join(", ") : "(none listed)"}\n\nHere's a job or company description:\n---\n${contextText}\n---\n\nAssess how good a fit I am for this, based only on my listed skills versus what's described. Give an overall fit label (strong, moderate, or weak), which of my skills match, what's missing/gaps, and a short 2-3 sentence summary of your reasoning.`,
        },
      ],
      output_config: { format: zodOutputFormat(FitAnalysisSchema) },
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
