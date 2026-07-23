import { prisma } from "../lib/prisma.js";

/**
 * GET /api/dislike-reasons
 * Lists the current user's accumulated dislike reasons, grouped by
 * reason text (case-insensitive, trimmed) so recurring dealbreakers (e.g.
 * "requires Java") surface as a single entry with a count, most common
 * first. Capture + display only in v1 — no algorithmic filtering yet.
 *
 * Inputs: none.
 * Response: 200 [{ reason: string, count: number, jobs: [{ id, title, company }] }]
 */
export async function listDislikeReasons(req, res) {
  const reasons = await prisma.dislikeReason.findMany({
    where: { userId: req.session.userId },
    include: {
      jobListing: { select: { id: true, title: true, company: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const groups = new Map();
  for (const r of reasons) {
    const key = r.reason.trim().toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, { reason: r.reason.trim(), count: 0, jobs: [] });
    }
    const group = groups.get(key);
    group.count += 1;
    group.jobs.push(r.jobListing);
  }

  const grouped = [...groups.values()].sort((a, b) => b.count - a.count);
  res.status(200).json(grouped);
}
