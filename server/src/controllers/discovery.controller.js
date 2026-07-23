import { prisma } from "../lib/prisma.js";
import { computeSkillMatch } from "../services/skillMatch.service.js";
import { isInDesiredLocation } from "../services/locationMatch.service.js";
import { recommendCandidates } from "../services/aiDiscovery.service.js";
import { AiExtractionError } from "../services/aiClient.service.js";

const CANDIDATE_POOL_CAP = 30;

/** Every Discovery endpoint is scoped to the current Employer's own
 * Organization — see jobPosting.controller.js for the same helper. */
async function getOrganizationId(userId) {
  const organization = await prisma.organization.findUnique({
    where: { userId },
    select: { id: true },
  });
  return organization?.id ?? null;
}

function getCredentials(req) {
  return { apiKey: req.get("X-AI-Api-Key"), model: req.get("X-AI-Model") };
}

/** Loads the given posting (ownership-checked) plus up to
 * CANDIDATE_POOL_CAP public Candidates with their skills/desired
 * locations, and returns each candidate decorated with skillMatchPercent
 * (posting's required skills vs. the candidate's own skills) and
 * isInDesiredLocation (posting's coordinates vs. the candidate's own
 * desired locations/commute radius — the same locationMatch.service.js
 * function already used the other direction for job listings). Returns
 * null for jobPosting when it doesn't belong to this Employer. */
async function loadPostingAndMatchedCandidates(organizationId, jobPostingId) {
  const jobPosting = organizationId
    ? await prisma.jobPosting.findUnique({
        where: { id: Number(jobPostingId) },
        include: { requiredSkills: true },
      })
    : null;
  if (!jobPosting || jobPosting.organizationId !== organizationId) {
    return { jobPosting: null, candidates: [] };
  }

  const publicCandidates = await prisma.user.findMany({
    where: { role: "CANDIDATE", isPublic: true },
    include: { skills: true, desiredLocations: true },
    orderBy: { lastActiveAt: "desc" },
    take: CANDIDATE_POOL_CAP,
  });

  const requiredSkillNames = jobPosting.requiredSkills.map((s) => s.name);

  const candidates = publicCandidates.map((candidate) => {
    const skillNames = candidate.skills.map((s) => s.name);
    return {
      id: candidate.id,
      name: candidate.name,
      skillNames,
      skillMatchPercent: computeSkillMatch(skillNames, requiredSkillNames),
      isInDesiredLocation: isInDesiredLocation(
        jobPosting.latitude,
        jobPosting.longitude,
        candidate.desiredLocations,
        candidate.commuteRadiusKm,
      ),
    };
  });

  return { jobPosting, candidates };
}

/**
 * GET /api/discovery/candidates
 * Lists public Candidates matched against one of the current Employer's
 * own job postings — skill overlap and whether the posting falls within
 * the candidate's own stated commute radius of one of their desired
 * locations. Sorted by skill match percentage, highest first (candidates
 * with no computable match sort last).
 *
 * Inputs: query { jobPostingId: number }
 * Response: 200 [{ id, name, skillMatchPercent, isInDesiredLocation }]
 *   | 400 (missing jobPostingId) | 404 (jobPostingId not owned by this Employer)
 */
export async function listMatchedCandidates(req, res) {
  const { jobPostingId } = req.query;
  if (!jobPostingId) {
    return res.status(400).json({ error: "jobPostingId is required" });
  }

  const organizationId = await getOrganizationId(req.session.userId);
  const { jobPosting, candidates } = await loadPostingAndMatchedCandidates(
    organizationId,
    jobPostingId,
  );
  if (!jobPosting) {
    return res.status(404).json({ error: "Job posting not found" });
  }

  const sorted = [...candidates].sort(
    (a, b) => (b.skillMatchPercent ?? -1) - (a.skillMatchPercent ?? -1),
  );

  res.status(200).json(
    sorted.map(({ id, name, skillMatchPercent, isInDesiredLocation }) => ({
      id,
      name,
      skillMatchPercent,
      isInDesiredLocation,
    })),
  );
}

/**
 * POST /api/discovery/recommend
 * AI-ranks the top 3 best-fit public Candidates for one of the current
 * Employer's own job postings. BYOK: the Anthropic API key travels in
 * the X-AI-Api-Key header on this request only.
 *
 * Inputs: header X-AI-Api-Key (required), X-AI-Model (optional);
 *   body { jobPostingId: number }
 * Response: 200 { recommendations: [{ id, name, rationale }] }
 *   | 400 (missing key/jobPostingId) | 401 | 403 | 404 (jobPostingId not owned) | 429 | 502
 */
export async function recommendMatchedCandidates(req, res) {
  const { apiKey, model } = getCredentials(req);
  const { jobPostingId } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "Missing X-AI-Api-Key header" });
  }
  if (!jobPostingId) {
    return res.status(400).json({ error: "jobPostingId is required" });
  }

  const organizationId = await getOrganizationId(req.session.userId);
  const { jobPosting, candidates } = await loadPostingAndMatchedCandidates(
    organizationId,
    jobPostingId,
  );
  if (!jobPosting) {
    return res.status(404).json({ error: "Job posting not found" });
  }

  try {
    const recommendations = await recommendCandidates({
      apiKey,
      model,
      postingTitle: jobPosting.title,
      postingDescription: jobPosting.description,
      requiredSkills: jobPosting.requiredSkills.map((s) => s.name),
      candidates: candidates.map((c) => ({
        id: c.id,
        name: c.name,
        skills: c.skillNames,
      })),
    });

    const byId = new Map(candidates.map((c) => [c.id, c]));
    const matched = recommendations
      .filter((r) => byId.has(r.candidateId))
      .map((r) => ({
        id: r.candidateId,
        name: byId.get(r.candidateId).name,
        rationale: r.rationale,
      }));

    res.status(200).json({ recommendations: matched });
  } catch (err) {
    if (err instanceof AiExtractionError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}
