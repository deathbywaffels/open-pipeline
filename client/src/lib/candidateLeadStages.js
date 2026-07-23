export const STAGES = [
  "SOURCED",
  "CONTACTED",
  "PHONE_SCREEN",
  "TECHNICAL_INTERVIEW",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

export const STAGE_LABELS = {
  SOURCED: "Sourced",
  CONTACTED: "Contacted",
  PHONE_SCREEN: "Phone Screen",
  TECHNICAL_INTERVIEW: "Technical Interview",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

// Same color-family convention as applicationStages.js's STAGE_COLORS —
// keyed to the shared design-system palette (see FlipTile for the same
// key set).
export const STAGE_COLORS = {
  SOURCED: "brand",
  CONTACTED: "accent",
  PHONE_SCREEN: "accent",
  TECHNICAL_INTERVIEW: "brand",
  INTERVIEW: "brand",
  OFFER: "success",
  REJECTED: "slate",
};

export function groupCandidateLeadsByStage(candidateLeads) {
  const groups = Object.fromEntries(STAGES.map((stage) => [stage, []]));
  for (const lead of candidateLeads) {
    groups[lead.stage]?.push(lead);
  }
  return groups;
}
