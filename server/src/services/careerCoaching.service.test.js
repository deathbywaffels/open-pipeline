import {
  findMostMissingSkill,
  computeWeeklyStats,
} from "./careerCoaching.service.js";

describe("findMostMissingSkill", () => {
  test("returns the skill that appears most often among jobs, excluding skills the user has", () => {
    const appliedJobs = [
      { requiredSkills: [{ name: "React" }, { name: "SQL" }] },
      { requiredSkills: [{ name: "React" }, { name: "Docker" }] },
      { requiredSkills: [{ name: "react" }] }, // different casing, same skill
    ];

    const result = findMostMissingSkill(appliedJobs, ["SQL"]);

    expect(result).toEqual({ name: "React", count: 3 });
  });

  test("excludes skills already in the user's skill list", () => {
    const appliedJobs = [{ requiredSkills: [{ name: "React" }] }];

    expect(findMostMissingSkill(appliedJobs, ["React"])).toBeNull();
  });

  test("returns null when there are no applied jobs", () => {
    expect(findMostMissingSkill([], ["React"])).toBeNull();
  });

  test("returns null when applied jobs have no tagged required skills", () => {
    const appliedJobs = [{ requiredSkills: [] }];
    expect(findMostMissingSkill(appliedJobs, [])).toBeNull();
  });
});

describe("computeWeeklyStats", () => {
  const now = new Date("2026-07-21T12:00:00.000Z");
  const withinWeek = new Date("2026-07-18T00:00:00.000Z");
  const overAWeekAgo = new Date("2026-07-10T00:00:00.000Z");

  test("counts jobs pasted within the last 7 days", () => {
    const stats = computeWeeklyStats(now, {
      jobListings: [{ createdAt: withinWeek }, { createdAt: overAWeekAgo }],
      applications: [],
      stageEvents: [],
    });
    expect(stats.jobsPasted).toBe(1);
  });

  test("counts applications submitted within the last 7 days, ignoring unapplied ones", () => {
    const stats = computeWeeklyStats(now, {
      jobListings: [],
      applications: [
        { appliedAt: withinWeek },
        { appliedAt: overAWeekAgo },
        { appliedAt: null },
      ],
      stageEvents: [],
    });
    expect(stats.applicationsSubmitted).toBe(1);
  });

  test("counts stage progressions and interviews reached within the last 7 days", () => {
    const stats = computeWeeklyStats(now, {
      jobListings: [],
      applications: [],
      stageEvents: [
        { occurredAt: withinWeek, toStage: "APPLIED" },
        { occurredAt: withinWeek, toStage: "PHONE_SCREEN" },
        { occurredAt: withinWeek, toStage: "TECHNICAL_INTERVIEW" },
        { occurredAt: overAWeekAgo, toStage: "INTERVIEW" },
      ],
    });
    expect(stats.stageProgressions).toBe(3);
    expect(stats.interviewsReached).toBe(2);
  });

  test("returns all zeros with no activity", () => {
    const stats = computeWeeklyStats(now, {
      jobListings: [],
      applications: [],
      stageEvents: [],
    });
    expect(stats).toEqual({
      jobsPasted: 0,
      applicationsSubmitted: 0,
      stageProgressions: 0,
      interviewsReached: 0,
    });
  });
});
