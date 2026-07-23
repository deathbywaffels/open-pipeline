import { prisma } from "../lib/prisma.js";

const STALE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days, per SPEC

const VALID_STAGES = [
  "LIKED",
  "APPLIED",
  "PHONE_SCREEN",
  "TECHNICAL_INTERVIEW",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

function withIsStale(application) {
  const isStale =
    application.stage === "APPLIED" &&
    Date.now() - application.lastStageChangeAt.getTime() > STALE_THRESHOLD_MS;
  return { ...application, isStale };
}

/**
 * GET /api/applications
 * Lists the current user's applications (jobs that have been liked),
 * each with its job listing summary and a computed isStale flag — true
 * when an application has sat in APPLIED for more than 14 days with no
 * stage change. isStale is computed on read, not stored, so it's always
 * correct without any background job.
 *
 * Inputs: none.
 * Response: 200 [Application & { isStale: boolean, jobListing: {...} }]
 */
export async function listApplications(req, res) {
  const applications = await prisma.application.findMany({
    where: { userId: req.session.userId },
    include: {
      jobListing: {
        select: {
          id: true,
          title: true,
          company: true,
          locationText: true,
          sourceUrl: true,
        },
      },
    },
    orderBy: { lastStageChangeAt: "desc" },
  });

  res.status(200).json(applications.map(withIsStale));
}

/**
 * PATCH /api/applications/:id/stage
 * Moves an application to a new pipeline stage (kanban drag-and-drop).
 * Any stage may move to REJECTED. Moving into APPLIED for the first time
 * stamps appliedAt. Every real transition logs a StageEvent and updates
 * lastStageChangeAt; moving to the application's current stage is a no-op.
 *
 * Inputs: path { id: number }, body { toStage: ApplicationStage }
 * Response: 200 Application & { isStale } | 400 (invalid stage) | 404
 */
export async function updateApplicationStage(req, res) {
  const id = Number(req.params.id);
  const { toStage } = req.body;

  if (!VALID_STAGES.includes(toStage)) {
    return res.status(400).json({ error: "Invalid stage" });
  }

  const application = await prisma.application.findUnique({ where: { id } });
  if (!application || application.userId !== req.session.userId) {
    return res.status(404).json({ error: "Application not found" });
  }

  if (application.stage === toStage) {
    const unchanged = await prisma.application.findUnique({
      where: { id },
      include: {
        jobListing: {
          select: {
            id: true,
            title: true,
            company: true,
            locationText: true,
            sourceUrl: true,
          },
        },
      },
    });
    return res.status(200).json(withIsStale(unchanged));
  }

  const now = new Date();
  const [updated] = await prisma.$transaction([
    prisma.application.update({
      where: { id },
      data: {
        stage: toStage,
        lastStageChangeAt: now,
        ...(toStage === "APPLIED" && !application.appliedAt
          ? { appliedAt: now }
          : {}),
      },
      include: {
        jobListing: {
          select: {
            id: true,
            title: true,
            company: true,
            locationText: true,
            sourceUrl: true,
          },
        },
      },
    }),
    prisma.stageEvent.create({
      data: { applicationId: id, fromStage: application.stage, toStage },
    }),
  ]);

  res.status(200).json(withIsStale(updated));
}
