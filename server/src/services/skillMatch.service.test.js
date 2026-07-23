import { describe, it, expect } from "@jest/globals";
import { computeSkillMatch } from "./skillMatch.service.js";

describe("computeSkillMatch", () => {
  it("returns null when the job has no required skills", () => {
    expect(computeSkillMatch(["React"], [])).toBeNull();
    expect(computeSkillMatch(["React"], undefined)).toBeNull();
  });

  it("returns 100 when all required skills are matched", () => {
    expect(computeSkillMatch(["React", "SQL"], ["React", "SQL"])).toBe(100);
  });

  it("returns 0 when none of the required skills are matched", () => {
    expect(computeSkillMatch(["React"], ["Java"])).toBe(0);
  });

  it("returns a rounded partial percentage", () => {
    expect(computeSkillMatch(["React"], ["React", "Java", "PHP"])).toBe(33);
  });

  it("matches case-insensitively and trims whitespace", () => {
    expect(computeSkillMatch([" react "], ["React"])).toBe(100);
  });

  it("treats an empty user skill list as zero matches", () => {
    expect(computeSkillMatch([], ["React"])).toBe(0);
  });
});
