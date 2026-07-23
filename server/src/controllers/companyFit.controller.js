import { prisma } from "../lib/prisma.js";
import { analyzeCompanyFit } from "../services/aiCompanyFit.service.js";
import { AiExtractionError } from "../services/aiClient.service.js";

function getCredentials(req) {
  return { apiKey: req.get("X-AI-Api-Key"), model: req.get("X-AI-Model") };
}

/**
 * POST /api/company-fit/analyze
 * Assesses how good a fit the current user is for a pasted job/company
 * description, based on their saved skills. BYOK: the Anthropic API key
 * travels in the X-AI-Api-Key header on this request only — it is never
 * written to disk or the database.
 *
 * Inputs: header X-AI-Api-Key (required), X-AI-Model (optional);
 *   body { contextText: string }
 * Response: 200 { fitLabel, matchingSkills, gaps, summary }
 *   | 400 (missing key/contextText, or a bad request to Anthropic)
 *   | 401 (invalid key) | 403 (key lacks model access) | 429 (rate limited)
 *   | 502 (Anthropic unreachable or returned an unparseable response)
 */
export async function analyzeFit(req, res) {
  const { apiKey, model } = getCredentials(req);
  const { contextText } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "Missing X-AI-Api-Key header" });
  }
  if (!contextText || !contextText.trim()) {
    return res.status(400).json({ error: "contextText is required" });
  }

  const skills = await prisma.skill.findMany({
    where: { userId: req.session.userId },
  });

  try {
    const analysis = await analyzeCompanyFit({
      apiKey,
      model,
      userSkills: skills.map((s) => s.name),
      contextText,
    });
    res.status(200).json(analysis);
  } catch (err) {
    if (err instanceof AiExtractionError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}
