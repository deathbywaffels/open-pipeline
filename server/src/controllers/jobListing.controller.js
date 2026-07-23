import { prisma } from "../lib/prisma.js";
import { geocodeAddress } from "../services/geocoding.service.js";
import { computeSkillMatch } from "../services/skillMatch.service.js";
import { getPinColor } from "../services/mapPin.service.js";
import { isRecognizedSponsor } from "../services/sponsorMatch.service.js";
import { isInDesiredLocation } from "../services/locationMatch.service.js";

function normalizeSkillNames(requiredSkills) {
  if (!Array.isArray(requiredSkills)) return [];
  const trimmed = requiredSkills
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return [...new Set(trimmed)];
}

async function attachComputedFields(jobListing, userId) {
  const [userSkills, sponsorCompanies, desiredLocations, user] =
    await Promise.all([
      prisma.skill.findMany({ where: { userId } }),
      prisma.sponsorCompany.findMany({ where: { userId } }),
      prisma.desiredLocation.findMany({ where: { userId } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { commuteRadiusKm: true },
      }),
    ]);
  const userSkillNames = userSkills.map((s) => s.name);
  const sponsorNormalizedNames = new Set(
    sponsorCompanies.map((c) => c.normalizedName),
  );
  return withComputedFields(
    jobListing,
    userSkillNames,
    sponsorNormalizedNames,
    desiredLocations,
    user.commuteRadiusKm,
  );
}

function withComputedFields(
  jobListing,
  userSkillNames,
  sponsorNormalizedNames,
  desiredLocations,
  commuteRadiusKm,
) {
  const requiredSkillNames = jobListing.requiredSkills.map((s) => s.name);
  return {
    ...jobListing,
    skillMatchPercent: computeSkillMatch(userSkillNames, requiredSkillNames),
    isRecognizedSponsor: isRecognizedSponsor(
      jobListing.company,
      sponsorNormalizedNames,
    ),
    isInDesiredLocation: isInDesiredLocation(
      jobListing.latitude,
      jobListing.longitude,
      desiredLocations,
      commuteRadiusKm,
    ),
  };
}

/**
 * POST /api/job-listings
 * Manually pastes a job (link + description) into the tracker. Attempts
 * best-effort geocoding of the location text; a geocoding failure never
 * blocks saving the listing (latitude/longitude are simply left null).
 *
 * Inputs: body {
 *   title: string, company: string, description: string, sourceUrl: string,
 *   locationText?: string, requiredSkills?: string[]
 * }
 * Response: 201 JobListing (with requiredSkills, skillMatchPercent, isRecognizedSponsor, isInDesiredLocation) | 400 (missing fields)
 */
export async function createJobListing(req, res) {
  const {
    title,
    company,
    description,
    sourceUrl,
    locationText,
    requiredSkills,
  } = req.body;

  if (!title || !company || !description || !sourceUrl) {
    return res.status(400).json({
      error: "title, company, description, and sourceUrl are required",
    });
  }

  const skillNames = normalizeSkillNames(requiredSkills);
  const coords = await geocodeAddress(locationText);

  const jobListing = await prisma.jobListing.create({
    data: {
      userId: req.session.userId,
      title,
      company,
      description,
      sourceUrl,
      locationText: locationText || null,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      requiredSkills: {
        create: skillNames.map((name) => ({ name })),
      },
    },
    include: { requiredSkills: true },
  });

  res
    .status(201)
    .json(await attachComputedFields(jobListing, req.session.userId));
}

/**
 * GET /api/job-listings
 * Lists the current user's job listings, optionally filtered by swipe
 * status. Each listing includes skillMatchPercent (overlap between the
 * user's skill profile and the job's tagged required skills, null if the
 * job has no tagged required skills).
 *
 * Inputs: query { swipeStatus?: "PENDING" | "LIKED" | "DISLIKED" }
 * Response: 200 [JobListing & { skillMatchPercent: number | null, isRecognizedSponsor: boolean, isInDesiredLocation: boolean | null }]
 */
const VALID_SWIPE_STATUSES = ["PENDING", "LIKED", "DISLIKED"];

export async function listJobListings(req, res) {
  const { swipeStatus } = req.query;

  if (swipeStatus && !VALID_SWIPE_STATUSES.includes(swipeStatus)) {
    return res.status(400).json({ error: "Invalid swipeStatus filter" });
  }

  const [jobListings, userSkills, sponsorCompanies, desiredLocations, user] =
    await Promise.all([
      prisma.jobListing.findMany({
        where: {
          userId: req.session.userId,
          ...(swipeStatus ? { swipeStatus } : {}),
        },
        include: { requiredSkills: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.skill.findMany({ where: { userId: req.session.userId } }),
      prisma.sponsorCompany.findMany({
        where: { userId: req.session.userId },
      }),
      prisma.desiredLocation.findMany({
        where: { userId: req.session.userId },
      }),
      prisma.user.findUnique({
        where: { id: req.session.userId },
        select: { commuteRadiusKm: true },
      }),
    ]);

  const userSkillNames = userSkills.map((s) => s.name);
  const sponsorNormalizedNames = new Set(
    sponsorCompanies.map((c) => c.normalizedName),
  );
  res
    .status(200)
    .json(
      jobListings.map((job) =>
        withComputedFields(
          job,
          userSkillNames,
          sponsorNormalizedNames,
          desiredLocations,
          user.commuteRadiusKm,
        ),
      ),
    );
}

/**
 * GET /api/job-listings/:id
 * Fetches a single job listing owned by the current user.
 *
 * Inputs: path { id: number }
 * Response: 200 JobListing & { skillMatchPercent: number | null, isRecognizedSponsor: boolean, isInDesiredLocation: boolean | null } | 404
 */
export async function getJobListing(req, res) {
  const id = Number(req.params.id);

  const jobListing = await prisma.jobListing.findUnique({
    where: { id },
    include: { requiredSkills: true },
  });

  if (!jobListing || jobListing.userId !== req.session.userId) {
    return res.status(404).json({ error: "Job listing not found" });
  }

  res
    .status(200)
    .json(await attachComputedFields(jobListing, req.session.userId));
}

/**
 * POST /api/job-listings/:id/swipe
 * Records a like or dislike on a pending job listing. Liking transitions
 * swipeStatus to LIKED and creates the Application (stage LIKED) plus its
 * first StageEvent — a job never has an Application until it's liked,
 * since JobListing:Application is 1:1. Disliking transitions swipeStatus
 * to DISLIKED and, only if a reason was given, records a DislikeReason;
 * no Application is ever created for a disliked job.
 *
 * Inputs: path { id: number }, body { direction: "like" | "dislike", reason?: string }
 * Response: 200 JobListing & { skillMatchPercent, isRecognizedSponsor, isInDesiredLocation } | 400 (bad direction or
 *   already swiped) | 404 (not found or not owned by the current user)
 */
export async function swipeJobListing(req, res) {
  const id = Number(req.params.id);
  const { direction, reason } = req.body;

  if (direction !== "like" && direction !== "dislike") {
    return res
      .status(400)
      .json({ error: "direction must be 'like' or 'dislike'" });
  }

  const jobListing = await prisma.jobListing.findUnique({ where: { id } });
  if (!jobListing || jobListing.userId !== req.session.userId) {
    return res.status(404).json({ error: "Job listing not found" });
  }

  if (jobListing.swipeStatus !== "PENDING") {
    return res
      .status(400)
      .json({ error: "This job has already been swiped on" });
  }

  const userId = req.session.userId;

  if (direction === "like") {
    const [updated] = await prisma.$transaction([
      prisma.jobListing.update({
        where: { id },
        data: { swipeStatus: "LIKED" },
        include: { requiredSkills: true },
      }),
      prisma.application.create({
        data: {
          userId,
          jobListingId: id,
          stage: "LIKED",
          stageEvents: { create: { toStage: "LIKED" } },
        },
      }),
    ]);
    return res.status(200).json(await attachComputedFields(updated, userId));
  }

  const operations = [
    prisma.jobListing.update({
      where: { id },
      data: { swipeStatus: "DISLIKED" },
      include: { requiredSkills: true },
    }),
  ];
  if (reason && reason.trim()) {
    operations.push(
      prisma.dislikeReason.create({
        data: { userId, jobListingId: id, reason: reason.trim() },
      }),
    );
  }
  const [updated] = await prisma.$transaction(operations);
  res.status(200).json(await attachComputedFields(updated, userId));
}

/**
 * GET /api/job-listings/map
 * Lists the current user's liked-or-further jobs that have a resolved
 * location, for pin rendering. Only jobs with an Application (i.e. liked)
 * appear — pending/disliked jobs have no pipeline status to color a pin
 * by. Pin color is derived from the Application's stage: grey = Rejected,
 * blue = Liked (not yet applied), green = Applied or further along.
 *
 * Inputs: none.
 * Response: 200 [{ id, title, company, latitude, longitude, stage, pinColor }]
 */
export async function getMapListings(req, res) {
  const applications = await prisma.application.findMany({
    where: {
      userId: req.session.userId,
      jobListing: { latitude: { not: null }, longitude: { not: null } },
    },
    include: {
      jobListing: {
        select: {
          id: true,
          title: true,
          company: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  const pins = applications.map((application) => ({
    id: application.jobListing.id,
    title: application.jobListing.title,
    company: application.jobListing.company,
    latitude: application.jobListing.latitude,
    longitude: application.jobListing.longitude,
    stage: application.stage,
    pinColor: getPinColor(application.stage),
  }));

  res.status(200).json(pins);
}

/**
 * POST /api/job-listings/:id/geocode
 * Manually retries geocoding for a job listing whose location text
 * failed to resolve on creation (e.g. Nominatim was rate-limited or down).
 *
 * Inputs: path { id: number }
 * Response: 200 JobListing & { skillMatchPercent, isRecognizedSponsor, isInDesiredLocation } | 400 (no location
 *   text set) | 404 (not found or not owned by the current user)
 */
export async function retryGeocode(req, res) {
  const id = Number(req.params.id);

  const jobListing = await prisma.jobListing.findUnique({ where: { id } });
  if (!jobListing || jobListing.userId !== req.session.userId) {
    return res.status(404).json({ error: "Job listing not found" });
  }

  if (!jobListing.locationText) {
    return res
      .status(400)
      .json({ error: "This job has no location text to geocode" });
  }

  const coords = await geocodeAddress(jobListing.locationText);

  const updated = await prisma.jobListing.update({
    where: { id },
    data: {
      latitude: coords?.latitude ?? jobListing.latitude,
      longitude: coords?.longitude ?? jobListing.longitude,
    },
    include: { requiredSkills: true },
  });

  res.status(200).json(await attachComputedFields(updated, req.session.userId));
}
