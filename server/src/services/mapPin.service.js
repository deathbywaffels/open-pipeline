const GREEN_STAGES = new Set([
  "APPLIED",
  "PHONE_SCREEN",
  "TECHNICAL_INTERVIEW",
  "INTERVIEW",
  "OFFER",
]);

/**
 * Derives a map pin color from an Application's pipeline stage:
 * grey = Rejected, blue = Liked (not yet applied), green = Applied or
 * further along. Exact icon overlays per stage are a UI-design detail
 * deferred past v1 (see SPEC.md) — color is the v1 signal.
 *
 * @param {string} stage - an ApplicationStage value
 * @returns {"grey" | "blue" | "green"}
 */
export function getPinColor(stage) {
  if (stage === "REJECTED") return "grey";
  if (stage === "LIKED") return "blue";
  if (GREEN_STAGES.has(stage)) return "green";
  throw new Error(`Unknown application stage: ${stage}`);
}
