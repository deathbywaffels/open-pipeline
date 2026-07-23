import { prisma } from "../lib/prisma.js";

const VALID_STAGES = [
  "SOURCED",
  "CONTACTED",
  "PHONE_SCREEN",
  "TECHNICAL_INTERVIEW",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

/** Every CandidateLead endpoint is scoped to the current Employer's own
 * Organization — see jobPosting.controller.js for the same helper. */
async function getOrganizationId(userId) {
  const organization = await prisma.organization.findUnique({
    where: { userId },
    select: { id: true },
  });
  return organization?.id ?? null;
}

/**
 * POST /api/candidate-leads
 * Adds a candidate the current Employer is tracking against one of their
 * own job postings, plus its first CandidateLeadStageEvent (SOURCED) —
 * mirrors how liking a job creates a candidate's first StageEvent. Either
 * a manually-typed name, or a candidateUserId sourced from Discovery
 * (/api/discovery/candidates) — when candidateUserId is given, the lead's
 * name always comes from that account's current name (any client-supplied
 * name is ignored), and the account must be a public Candidate.
 *
 * Inputs: body {
 *   jobPostingId: number, name?: string, candidateUserId?: number, notes?: string
 * }
 * Response: 201 CandidateLead & { jobPosting: { id, title } }
 *   | 400 (missing jobPostingId, or neither name nor candidateUserId given)
 *   | 404 (jobPostingId not owned by this Employer, or candidateUserId isn't a public Candidate)
 */
export async function createCandidateLead(req, res) {
  const { name, jobPostingId, notes, candidateUserId } = req.body;

  if ((!name && !candidateUserId) || !jobPostingId) {
    return res.status(400).json({
      error: "jobPostingId and either name or candidateUserId are required",
    });
  }

  const organizationId = await getOrganizationId(req.session.userId);
  const jobPosting = organizationId
    ? await prisma.jobPosting.findUnique({
        where: { id: Number(jobPostingId) },
      })
    : null;
  if (!jobPosting || jobPosting.organizationId !== organizationId) {
    return res.status(404).json({ error: "Job posting not found" });
  }

  let leadName = name;
  let resolvedCandidateUserId = null;
  if (candidateUserId) {
    const candidateUser = await prisma.user.findUnique({
      where: { id: Number(candidateUserId) },
    });
    if (
      !candidateUser ||
      candidateUser.role !== "CANDIDATE" ||
      !candidateUser.isPublic
    ) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    leadName = candidateUser.name;
    resolvedCandidateUserId = candidateUser.id;
  }

  const candidateLead = await prisma.candidateLead.create({
    data: {
      organizationId,
      jobPostingId: jobPosting.id,
      candidateUserId: resolvedCandidateUserId,
      name: leadName,
      notes: notes || null,
      stage: "SOURCED",
      stageEvents: { create: { toStage: "SOURCED" } },
    },
    include: { jobPosting: { select: { id: true, title: true } } },
  });

  res.status(201).json(candidateLead);
}

/**
 * GET /api/candidate-leads
 * Lists the current Employer's own candidate leads.
 *
 * Inputs: none.
 * Response: 200 [CandidateLead & { jobPosting: { id, title } }]
 */
export async function listCandidateLeads(req, res) {
  const organizationId = await getOrganizationId(req.session.userId);
  if (!organizationId) {
    return res.status(200).json([]);
  }

  const candidateLeads = await prisma.candidateLead.findMany({
    where: { organizationId },
    include: { jobPosting: { select: { id: true, title: true } } },
    orderBy: { lastStageChangeAt: "desc" },
  });

  res.status(200).json(candidateLeads);
}

/**
 * PATCH /api/candidate-leads/:id
 * Updates a candidate lead. Only fields present in the body are changed.
 * Moving to a different stage updates lastStageChangeAt and logs a
 * CandidateLeadStageEvent in the same transaction; setting notes doesn't
 * touch the stage/event side at all.
 *
 * Inputs: path { id: number }, body { notes?: string, stage?: CandidateLeadStage }
 * Response: 200 CandidateLead & { jobPosting: { id, title } } | 400 (invalid stage) | 404
 */
export async function updateCandidateLead(req, res) {
  const id = Number(req.params.id);
  const { notes, stage } = req.body;

  if (stage !== undefined && !VALID_STAGES.includes(stage)) {
    return res.status(400).json({ error: "Invalid stage" });
  }

  const organizationId = await getOrganizationId(req.session.userId);
  const existing = await prisma.candidateLead.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== organizationId) {
    return res.status(404).json({ error: "Candidate lead not found" });
  }

  const include = { jobPosting: { select: { id: true, title: true } } };

  if (stage !== undefined && stage !== existing.stage) {
    const [updated] = await prisma.$transaction([
      prisma.candidateLead.update({
        where: { id },
        data: {
          stage,
          lastStageChangeAt: new Date(),
          ...(notes !== undefined ? { notes } : {}),
        },
        include,
      }),
      prisma.candidateLeadStageEvent.create({
        data: {
          candidateLeadId: id,
          fromStage: existing.stage,
          toStage: stage,
        },
      }),
    ]);
    return res.status(200).json(updated);
  }

  const data = {};
  if (notes !== undefined) data.notes = notes;

  const updated = await prisma.candidateLead.update({
    where: { id },
    data,
    include,
  });
  res.status(200).json(updated);
}

/**
 * DELETE /api/candidate-leads/:id
 * Removes a candidate lead.
 *
 * Inputs: path { id: number }
 * Response: 204 | 404 (not found or not owned by the current Employer)
 */
export async function deleteCandidateLead(req, res) {
  const id = Number(req.params.id);
  const organizationId = await getOrganizationId(req.session.userId);

  const existing = await prisma.candidateLead.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== organizationId) {
    return res.status(404).json({ error: "Candidate lead not found" });
  }

  await prisma.candidateLead.delete({ where: { id } });
  res.status(204).end();
}
