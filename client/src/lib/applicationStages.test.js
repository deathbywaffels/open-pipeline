import { describe, it, expect } from "vitest";
import {
  STAGES,
  STAGE_COLORS,
  groupApplicationsByStage,
} from "./applicationStages.js";

describe("STAGE_COLORS", () => {
  it("defines a color for every stage", () => {
    for (const stage of STAGES) {
      expect(STAGE_COLORS[stage]).toBeTruthy();
    }
  });
});

describe("groupApplicationsByStage", () => {
  it("creates an empty array for every known stage", () => {
    const groups = groupApplicationsByStage([]);
    for (const stage of STAGES) {
      expect(groups[stage]).toEqual([]);
    }
  });

  it("buckets applications by their stage field", () => {
    const applications = [
      { id: 1, stage: "LIKED" },
      { id: 2, stage: "APPLIED" },
      { id: 3, stage: "LIKED" },
    ];
    const groups = groupApplicationsByStage(applications);
    expect(groups.LIKED.map((a) => a.id)).toEqual([1, 3]);
    expect(groups.APPLIED.map((a) => a.id)).toEqual([2]);
    expect(groups.OFFER).toEqual([]);
  });
});
