import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  resolveModel,
  mapAnthropicError,
  AiExtractionError,
} from "./aiClient.service.js";

const RecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      candidateId: z.number(),
      rationale: z.string(),
    }),
  ),
});

/**
 * Ranks the top 3 best-fit candidates for a job posting from a given
 * shortlist, with a rationale grounded in each candidate's actual skills.
 * The model is instructed to only pick from the given candidate IDs — the
 * caller should still treat the response as untrusted and drop any ID
 * outside the original set before using it. Uses the caller's own
 * Anthropic API key — never persisted, used only for this one request.
 *
 * @param {{
 *   apiKey: string, model?: string,
 *   postingTitle: string, postingDescription: string, requiredSkills: string[],
 *   candidates: { id: number, name: string, skills: string[] }[],
 * }} args
 * @returns {Promise<{ candidateId: number, rationale: string }[]>}
 */
export async function recommendCandidates({
  apiKey,
  model,
  postingTitle,
  postingDescription,
  requiredSkills,
  candidates,
}) {
  const client = new Anthropic({ apiKey });

  const candidateLines = candidates
    .map(
      (c) =>
        `ID ${c.id}: ${c.name} — skills: ${c.skills.length ? c.skills.join(", ") : "(none listed)"}`,
    )
    .join("\n");

  try {
    const response = await client.messages.parse({
      model: resolveModel(model),
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Job posting: ${postingTitle}\nRequired skills: ${requiredSkills.length ? requiredSkills.join(", ") : "(none listed)"}\nDescription: ${postingDescription}\n\nCandidates:\n${candidateLines || "(none)"}\n\nPick the top 3 best-fit candidates for this posting from the list above, using only the IDs given. For each, give a one-sentence rationale grounded in their actual listed skills.`,
        },
      ],
      output_config: { format: zodOutputFormat(RecommendationSchema) },
    });

    if (!response.parsed_output) {
      throw new AiExtractionError("AI response could not be parsed", 502);
    }
    return response.parsed_output.recommendations;
  } catch (err) {
    if (err instanceof AiExtractionError) throw err;
    throw mapAnthropicError(err);
  }
}
