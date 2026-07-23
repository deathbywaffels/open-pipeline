const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const INTERVIEW_STAGES = new Set([
  "PHONE_SCREEN",
  "TECHNICAL_INTERVIEW",
  "INTERVIEW",
]);

/**
 * Finds the required skill that appears most often across the user's
 * applied-to jobs, among skills the user doesn't already have — this is
 * the "one skill all these jobs wanted that I'm missing" signal. Uses
 * the same case-insensitive exact-match normalization as
 * computeSkillMatch (skills/required-skill tags are both manually
 * entered, so an exact match is the meaningful signal).
 *
 * @param {{ requiredSkills: { name: string }[] }[]} appliedJobsWithSkills
 * @param {string[]} userSkillNames
 * @returns {{ name: string, count: number } | null}
 */
export function findMostMissingSkill(appliedJobsWithSkills, userSkillNames) {
  const userSkillSet = new Set(
    (userSkillNames || []).map((s) => s.trim().toLowerCase()),
  );

  const counts = new Map();
  for (const job of appliedJobsWithSkills) {
    for (const skill of job.requiredSkills) {
      const normalized = skill.name.trim().toLowerCase();
      if (userSkillSet.has(normalized)) continue;
      const existing = counts.get(normalized);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(normalized, { name: skill.name.trim(), count: 1 });
      }
    }
  }

  let best = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best;
}

/**
 * Rolling 7-day activity readout ("what you did this week"), computed
 * from an injected `now` so it's fully deterministic/testable — same
 * injected-clock convention as streak.service.js's computeStreak.
 *
 * @param {Date} now
 * @param {{
 *   jobListings: { createdAt: Date }[],
 *   applications: { appliedAt: Date | null }[],
 *   stageEvents: { occurredAt: Date, toStage: string }[],
 * }} data
 * @returns {{ jobsPasted: number, applicationsSubmitted: number, stageProgressions: number, interviewsReached: number }}
 */
export function computeWeeklyStats(
  now,
  { jobListings, applications, stageEvents },
) {
  const weekAgo = new Date(now.getTime() - WEEK_MS);

  const jobsPasted = jobListings.filter((j) => j.createdAt >= weekAgo).length;
  const applicationsSubmitted = applications.filter(
    (a) => a.appliedAt && a.appliedAt >= weekAgo,
  ).length;
  const recentStageEvents = stageEvents.filter((e) => e.occurredAt >= weekAgo);
  const stageProgressions = recentStageEvents.length;
  const interviewsReached = recentStageEvents.filter((e) =>
    INTERVIEW_STAGES.has(e.toStage),
  ).length;

  return {
    jobsPasted,
    applicationsSubmitted,
    stageProgressions,
    interviewsReached,
  };
}
