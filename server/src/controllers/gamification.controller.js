import { prisma } from "../lib/prisma.js";
import { computeStreak, toISODateString } from "../services/streak.service.js";

/** Groups records by the UTC day of one of their date fields. Shared by
 * every daily-goal count below (applications, pasted jobs, sponsor
 * outreach) so they all bucket days the same way. */
function countsByDay(records, dateField) {
  const counts = new Map();
  for (const record of records) {
    const value = record[dateField];
    if (!value) continue;
    const day = toISODateString(value);
    counts.set(day, (counts.get(day) || 0) + 1);
  }
  return counts;
}

/** Applications' appliedAt grouped by UTC day, for the current user. Used
 * by both quest-today and streak. appliedAt is set exactly once (the
 * first time an Application enters APPLIED — see application.controller),
 * so counting by appliedAt day already means "first-entry-to-APPLIED
 * events per day" without needing to separately query StageEvent. */
async function getAppliedCountsByDay(userId) {
  const applications = await prisma.application.findMany({
    where: { userId, appliedAt: { not: null } },
    select: { appliedAt: true },
  });
  return countsByDay(applications, "appliedAt");
}

/** Pasted jobs' createdAt grouped by UTC day, for the current user. */
async function getPasteCountsByDay(userId) {
  const jobListings = await prisma.jobListing.findMany({
    where: { userId },
    select: { createdAt: true },
  });
  return countsByDay(jobListings, "createdAt");
}

/** Sponsor companies' lastOutreachAt grouped by UTC day, for the current
 * user — lastOutreachAt is only set when outreachStatus is explicitly
 * changed (see sponsorCompany.controller), not on every edit. */
async function getReachOutCountsByDay(userId) {
  const sponsorCompanies = await prisma.sponsorCompany.findMany({
    where: { userId, lastOutreachAt: { not: null } },
    select: { lastOutreachAt: true },
  });
  return countsByDay(sponsorCompanies, "lastOutreachAt");
}

/**
 * GET /api/quest/today
 * Reports today's progress against all daily goals: applications,
 * pasted jobs, sponsor outreach, and an automatic "opened the app today"
 * check-in. Calling this endpoint IS the check-in — it's already fetched
 * once per Home mount, so no separate request or button is needed.
 *
 * Inputs: none.
 * Response: 200 {
 *   count: number, target: number, metToday: boolean,
 *   paste: { count, target, metToday },
 *   reachOut: { count, target, metToday },
 *   checkedInToday: true
 * }
 */
export async function getTodayQuest(req, res) {
  const userId = req.session.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const today = toISODateString(new Date());

  const [appliedCounts, pasteCounts, reachOutCounts] = await Promise.all([
    getAppliedCountsByDay(userId),
    getPasteCountsByDay(userId),
    getReachOutCountsByDay(userId),
  ]);

  const count = appliedCounts.get(today) || 0;
  const pasteCount = pasteCounts.get(today) || 0;
  const reachOutCount = reachOutCounts.get(today) || 0;

  if (!user.lastActiveAt || toISODateString(user.lastActiveAt) !== today) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    });
  }

  res.status(200).json({
    count,
    target: user.dailyQuestTarget,
    metToday: count >= user.dailyQuestTarget,
    paste: {
      count: pasteCount,
      target: user.dailyPasteTarget,
      metToday: pasteCount >= user.dailyPasteTarget,
    },
    reachOut: {
      count: reachOutCount,
      target: user.dailyReachOutTarget,
      metToday: reachOutCount >= user.dailyReachOutTarget,
    },
    checkedInToday: true,
  });
}

/**
 * GET /api/streak
 * Reports the user's current consecutive-day streak of meeting their
 * daily applications quest target. Scoped to the applications goal only
 * — the newer pasted-jobs/reach-out/check-in goals don't have streaks of
 * their own yet.
 *
 * Inputs: none.
 * Response: 200 { streak: number }
 */
export async function getStreak(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
  });
  const countsByDayMap = await getAppliedCountsByDay(req.session.userId);

  const metDays = new Set(
    [...countsByDayMap.entries()]
      .filter(([, count]) => count >= user.dailyQuestTarget)
      .map(([day]) => day),
  );

  res.status(200).json({ streak: computeStreak(metDays, new Date()) });
}

/**
 * PATCH /api/user/settings
 * Updates the current user's preferences. Only fields present in the body
 * are changed.
 *
 * Inputs: body {
 *   dailyQuestTarget?: number, dailyPasteTarget?: number,
 *   dailyReachOutTarget?: number, needsSponsorship?: boolean,
 *   commuteRadiusKm?: number, isPublic?: boolean
 * }
 * Response: 200 {
 *   dailyQuestTarget, dailyPasteTarget, dailyReachOutTarget,
 *   needsSponsorship, commuteRadiusKm, isPublic
 * } | 400 (invalid value for a field that was present)
 */
export async function updateUserSettings(req, res) {
  const {
    dailyQuestTarget,
    dailyPasteTarget,
    dailyReachOutTarget,
    needsSponsorship,
    commuteRadiusKm,
    isPublic,
  } = req.body;

  if (
    dailyQuestTarget !== undefined &&
    (!Number.isInteger(dailyQuestTarget) || dailyQuestTarget < 1)
  ) {
    return res
      .status(400)
      .json({ error: "dailyQuestTarget must be a positive integer" });
  }
  if (
    dailyPasteTarget !== undefined &&
    (!Number.isInteger(dailyPasteTarget) || dailyPasteTarget < 1)
  ) {
    return res
      .status(400)
      .json({ error: "dailyPasteTarget must be a positive integer" });
  }
  if (
    dailyReachOutTarget !== undefined &&
    (!Number.isInteger(dailyReachOutTarget) || dailyReachOutTarget < 1)
  ) {
    return res
      .status(400)
      .json({ error: "dailyReachOutTarget must be a positive integer" });
  }
  if (needsSponsorship !== undefined && typeof needsSponsorship !== "boolean") {
    return res
      .status(400)
      .json({ error: "needsSponsorship must be a boolean" });
  }
  if (
    commuteRadiusKm !== undefined &&
    (!Number.isInteger(commuteRadiusKm) || commuteRadiusKm < 1)
  ) {
    return res
      .status(400)
      .json({ error: "commuteRadiusKm must be a positive integer" });
  }
  if (isPublic !== undefined && typeof isPublic !== "boolean") {
    return res.status(400).json({ error: "isPublic must be a boolean" });
  }

  const data = {};
  if (dailyQuestTarget !== undefined) data.dailyQuestTarget = dailyQuestTarget;
  if (dailyPasteTarget !== undefined) data.dailyPasteTarget = dailyPasteTarget;
  if (dailyReachOutTarget !== undefined)
    data.dailyReachOutTarget = dailyReachOutTarget;
  if (needsSponsorship !== undefined) data.needsSponsorship = needsSponsorship;
  if (commuteRadiusKm !== undefined) data.commuteRadiusKm = commuteRadiusKm;
  if (isPublic !== undefined) data.isPublic = isPublic;

  const user = await prisma.user.update({
    where: { id: req.session.userId },
    data,
  });

  res.status(200).json({
    dailyQuestTarget: user.dailyQuestTarget,
    dailyPasteTarget: user.dailyPasteTarget,
    dailyReachOutTarget: user.dailyReachOutTarget,
    needsSponsorship: user.needsSponsorship,
    commuteRadiusKm: user.commuteRadiusKm,
    isPublic: user.isPublic,
  });
}
