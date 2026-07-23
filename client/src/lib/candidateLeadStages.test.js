import { describe, it, expect } from "vitest";
import {
  STAGES,
  STAGE_COLORS,
  groupCandidateLeadsByStage,
} from "./candidateLeadStages.js";

describe("STAGE_COLORS", () => {
  it("defines a color for every stage", () => {
    for (const stage of STAGES) {
      expect(STAGE_COLORS[stage]).toBeTruthy();
    }
  });
});

describe("groupCandidateLeadsByStage", () => {
  it("creates an empty array for every known stage", () => {
    const groups = groupCandidateLeadsByStage([]);
    for (const stage of STAGES) {
      expect(groups[stage]).toEqual([]);
    }
  });

  it("buckets leads by their stage field", () => {
    const leads = [
      { id: 1, stage: "SOURCED" },
      { id: 2, stage: "CONTACTED" },
      { id: 3, stage: "SOURCED" },
    ];
    const groups = groupCandidateLeadsByStage(leads);
    expect(groups.SOURCED.map((l) => l.id)).toEqual([1, 3]);
    expect(groups.CONTACTED.map((l) => l.id)).toEqual([2]);
    expect(groups.OFFER).toEqual([]);
  });
});
