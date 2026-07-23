import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  resolveModel,
  mapAnthropicError,
  AiExtractionError,
} from "./aiClient.service.js";

const RoleSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      role: z.string(),
      rationale: z.string(),
    }),
  ),
});

/**
 * Suggests alternate job titles/roles the user may not have considered,
 * grounded in their actual skills and steering clear of roles they've
 * already applied to. Uses the caller's own Anthropic API key — never
 * persisted, used only for this one request.
 *
 * @param {{ apiKey: string, model?: string, userSkills: string[], appliedJobTitles: string[] }} args
 * @returns {Promise<{ role: string, rationale: string }[]>}
 */
export async function suggestAlternateRoles({
  apiKey,
  model,
  userSkills,
  appliedJobTitles,
}) {
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: resolveModel(model),
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `My skills: ${userSkills.length ? userSkills.join(", ") : "(none listed)"}\n\nJob titles I've already applied to: ${appliedJobTitles.length ? appliedJobTitles.join(", ") : "(none yet)"}\n\nSuggest 3 alternate job titles/roles I could realistically apply for that I may not have considered, based on my actual skills. Avoid suggesting titles I've already applied to. For each, give a one-sentence rationale grounded in my specific skills.`,
        },
      ],
      output_config: { format: zodOutputFormat(RoleSuggestionSchema) },
    });

    if (!response.parsed_output) {
      throw new AiExtractionError("AI response could not be parsed", 502);
    }
    return response.parsed_output.suggestions;
  } catch (err) {
    if (err instanceof AiExtractionError) throw err;
    throw mapAnthropicError(err);
  }
}
