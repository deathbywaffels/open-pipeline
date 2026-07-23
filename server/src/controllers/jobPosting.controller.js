import { prisma } from "../lib/prisma.js";
import { geocodeAddress } from "../services/geocoding.service.js";

function normalizeSkillNames(requiredSkills) {
  if (!Array.isArray(requiredSkills)) return [];
  const trimmed = requiredSkills
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return [...new Set(trimmed)];
}

/** Every JobPosting endpoint is scoped to the current Employer's own
 * Organization — this never returns null in practice since one is
 * created at registration time (see auth.controller.js), but a Candidate
 * account hitting these routes has no Organization at all. */
async function getOrganizationId(userId) {
  const organization = await prisma.organization.findUnique({
    where: { userId },
    select: { id: true },
  });
  return organization?.id ?? null;
}

/**
 * POST /api/job-postings
 * Creates a job posting for the current Employer's Organization. Attempts
 * best-effort geocoding of the location text; a geocoding failure never
 * blocks saving the posting (latitude/longitude are simply left null).
 *
 * Inputs: body {
 *   title: string, description: string, locationText?: string,
 *   requiredSkills?: string[]
 * }
 * Response: 201 JobPosting (with requiredSkills) | 400 (missing fields, or no Organization for this account)
 */
export async function createJobPosting(req, res) {
  const { title, description, locationText, requiredSkills } = req.body;

  if (!title || !description) {
    return res
      .status(400)
      .json({ error: "title and description are required" });
  }

  const organizationId = await getOrganizationId(req.session.userId);
  if (!organizationId) {
    return res.status(400).json({ error: "This account has no Organization" });
  }

  const skillNames = normalizeSkillNames(requiredSkills);
  const coords = await geocodeAddress(locationText);

  const jobPosting = await prisma.jobPosting.create({
    data: {
      organizationId,
      title,
      description,
      locationText: locationText || null,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      requiredSkills: {
        create: skillNames.map((name) => ({ name })),
      },
    },
    include: { requiredSkills: true },
  });

  res.status(201).json(jobPosting);
}

/**
 * GET /api/job-postings
 * Lists the current Employer's own job postings.
 *
 * Inputs: none.
 * Response: 200 [JobPosting & { requiredSkills }]
 */
export async function listJobPostings(req, res) {
  const organizationId = await getOrganizationId(req.session.userId);
  if (!organizationId) {
    return res.status(200).json([]);
  }

  const jobPostings = await prisma.jobPosting.findMany({
    where: { organizationId },
    include: { requiredSkills: true },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json(jobPostings);
}

/**
 * POST /api/job-postings/:id/geocode
 * Manually retries geocoding for a posting whose location text failed to
 * resolve on creation (e.g. Nominatim was rate-limited or down).
 *
 * Inputs: path { id: number }
 * Response: 200 JobPosting & { requiredSkills } | 400 (no location text set)
 *   | 404 (not found or not owned by the current Employer)
 */
export async function retryGeocode(req, res) {
  const id = Number(req.params.id);
  const organizationId = await getOrganizationId(req.session.userId);

  const jobPosting = await prisma.jobPosting.findUnique({ where: { id } });
  if (!jobPosting || jobPosting.organizationId !== organizationId) {
    return res.status(404).json({ error: "Job posting not found" });
  }

  if (!jobPosting.locationText) {
    return res
      .status(400)
      .json({ error: "This posting has no location text to geocode" });
  }

  const coords = await geocodeAddress(jobPosting.locationText);

  const updated = await prisma.jobPosting.update({
    where: { id },
    data: {
      latitude: coords?.latitude ?? jobPosting.latitude,
      longitude: coords?.longitude ?? jobPosting.longitude,
    },
    include: { requiredSkills: true },
  });

  res.status(200).json(updated);
}

/**
 * DELETE /api/job-postings/:id
 * Removes a job posting (and its candidate leads, via cascade).
 *
 * Inputs: path { id: number }
 * Response: 204 | 404 (not found or not owned by the current Employer)
 */
export async function deleteJobPosting(req, res) {
  const id = Number(req.params.id);
  const organizationId = await getOrganizationId(req.session.userId);

  const jobPosting = await prisma.jobPosting.findUnique({ where: { id } });
  if (!jobPosting || jobPosting.organizationId !== organizationId) {
    return res.status(404).json({ error: "Job posting not found" });
  }

  await prisma.jobPosting.delete({ where: { id } });
  res.status(204).end();
}
