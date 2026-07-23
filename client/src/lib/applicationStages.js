export const STAGES = [
  "LIKED",
  "APPLIED",
  "PHONE_SCREEN",
  "TECHNICAL_INTERVIEW",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

export const STAGE_LABELS = {
  LIKED: "Liked",
  APPLIED: "Applied",
  PHONE_SCREEN: "Phone Screen",
  TECHNICAL_INTERVIEW: "Technical Interview",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

// Color family per stage, keyed to the shared design-system palette (see
// FlipTile for the same key set). Distinct per stage on the board — unlike
// the Map's simpler 3-color pin scheme, which optimizes for at-a-glance
// status across many pins rather than distinguishing every stage.
export const STAGE_COLORS = {
  LIKED: "brand",
  APPLIED: "accent",
  PHONE_SCREEN: "accent",
  TECHNICAL_INTERVIEW: "brand",
  INTERVIEW: "brand",
  OFFER: "success",
  REJECTED: "slate",
};

export function groupApplicationsByStage(applications) {
  const groups = Object.fromEntries(STAGES.map((stage) => [stage, []]));
  for (const application of applications) {
    groups[application.stage]?.push(application);
  }
  return groups;
}
