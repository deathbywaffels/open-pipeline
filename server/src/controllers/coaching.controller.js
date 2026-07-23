import { prisma } from "../lib/prisma.js";
import {
  findMostMissingSkill,
  computeWeeklyStats,
} from "../services/careerCoaching.service.js";
import { suggestAlternateRoles } from "../services/aiCoaching.service.js";
import { AiExtractionError } from "../services/aiClient.service.js";

function getCredentials(req) {
  return { apiKey: req.get("X-AI-Api-Key"), model: req.get("X-AI-Model") };
}

/** Fetches everything needed to derive both the deterministic summary and
 * the AI role suggestions, in one place so the two endpoints stay
 * consistent with each other. */
async function loadCoachingContext(userId) {
  const [appliedJobs, jobListings, applications, stageEvents, skills] =
    await Promise.all([
      prisma.application.findMany({
        where: { userId, appliedAt: { not: null } },
        include: { jobListing: { include: { requiredSkills: true } } },
      }),
      prisma.jobListing.findMany({
        where: { userId },
        select: { createdAt: true },
      }),
      prisma.application.findMany({
        where: { userId },
        select: { appliedAt: true },
      }),
      prisma.stageEvent.findMany({
        where: { application: { userId } },
        select: { occurredAt: true, toStage: true },
      }),
      prisma.skill.findMany({ where: { userId } }),
    ]);

  return {
    appliedJobsWithSkills: appliedJobs.map((a) => ({
      requiredSkills: a.jobListing.requiredSkills,
    })),
    appliedJobTitles: appliedJobs.map((a) => a.jobListing.title),
    jobListings,
    applications,
    stageEvents,
    skillNames: skills.map((s) => s.name),
  };
}

/**
 * GET /api/coaching/summary
 * Deterministic career-coaching readout — no AI key required. Reports
 * the required skill that shows up most often across the jobs you've
 * applied to but don't already have, and a rolling 7-day activity
 * summary.
 *
 * Inputs: none.
 * Response: 200 {
 *   missingSkill: { name: string, count: number } | null,
 *   weeklyStats: { jobsPasted, applicationsSubmitted, stageProgressions, interviewsReached }
 * }
 */
export async function getCoachingSummary(req, res) {
  const context = await loadCoachingContext(req.session.userId);

  const missingSkill = findMostMissingSkill(
    context.appliedJobsWithSkills,
    context.skillNames,
  );
  const weeklyStats = computeWeeklyStats(new Date(), {
    jobListings: context.jobListings,
    applications: context.applications,
    stageEvents: context.stageEvents,
  });

  res.status(200).json({ missingSkill, weeklyStats });
}

/**
 * POST /api/coaching/role-suggestions
 * Suggests alternate job titles/roles based on your skills, avoiding
 * ones you've already applied to. BYOK: the Anthropic API key travels
 * in the X-AI-Api-Key header on this request only.
 *
 * Inputs: header X-AI-Api-Key (required), X-AI-Model (optional).
 * Response: 200 { suggestions: { role: string, rationale: string }[] }
 *   | 400 (missing key) | 401 | 403 | 429 | 502
 */
export async function getRoleSuggestions(req, res) {
  const { apiKey, model } = getCredentials(req);

  if (!apiKey) {
    return res.status(400).json({ error: "Missing X-AI-Api-Key header" });
  }

  const context = await loadCoachingContext(req.session.userId);

  try {
    const suggestions = await suggestAlternateRoles({
      apiKey,
      model,
      userSkills: context.skillNames,
      appliedJobTitles: context.appliedJobTitles,
    });
    res.status(200).json({ suggestions });
  } catch (err) {
    if (err instanceof AiExtractionError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}
