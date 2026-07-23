import { prisma } from "../lib/prisma.js";
import { getObjectBuffer } from "../lib/objectStorage.js";
import {
  extractJobFromText,
  extractSkillsFromCv,
  AiExtractionError,
} from "../services/aiExtraction.service.js";

function getCredentials(req) {
  return { apiKey: req.get("X-AI-Api-Key"), model: req.get("X-AI-Model") };
}

/**
 * POST /api/ai/extract-job
 * Extracts structured job-listing fields from raw pasted text. BYOK: the
 * Anthropic API key travels in the X-AI-Api-Key header on this request
 * only — it is never written to disk or the database.
 *
 * Inputs: header X-AI-Api-Key (required), X-AI-Model (optional);
 *   body { rawText: string }
 * Response: 200 { title, company, locationText, description, requiredSkills }
 *   | 400 (missing key/rawText, or a bad request to Anthropic)
 *   | 401 (invalid key) | 403 (key lacks model access) | 429 (rate limited)
 *   | 502 (Anthropic unreachable or returned an unparseable response)
 */
export async function extractJob(req, res) {
  const { apiKey, model } = getCredentials(req);
  const { rawText } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "Missing X-AI-Api-Key header" });
  }
  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ error: "rawText is required" });
  }

  try {
    const extracted = await extractJobFromText({ apiKey, model, rawText });
    res.status(200).json(extracted);
  } catch (err) {
    if (err instanceof AiExtractionError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}

/**
 * POST /api/ai/extract-cv-skills/:cvId
 * Extracts a skills list from an already-uploaded CV owned by the current
 * user. BYOK: same per-request key handling as extract-job.
 *
 * Inputs: path { cvId: number }; header X-AI-Api-Key (required), X-AI-Model (optional)
 * Response: 200 { skills: string[] }
 *   | 400 (missing key, or file type unsupported for AI extraction)
 *   | 401 (invalid key) | 404 (CV not found/not owned) | 429 | 502
 */
export async function extractCvSkills(req, res) {
  const { apiKey, model } = getCredentials(req);
  const cvId = Number(req.params.cvId);

  if (!apiKey) {
    return res.status(400).json({ error: "Missing X-AI-Api-Key header" });
  }

  const cv = await prisma.cv.findUnique({ where: { id: cvId } });
  if (!cv || cv.userId !== req.session.userId) {
    return res.status(404).json({ error: "CV not found" });
  }

  try {
    const buffer = await getObjectBuffer(cv.storageKey);
    const skills = await extractSkillsFromCv({
      apiKey,
      model,
      buffer,
      mimeType: cv.mimeType,
    });
    res.status(200).json({ skills });
  } catch (err) {
    if (err instanceof AiExtractionError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}
