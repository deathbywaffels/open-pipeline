/**
 * Computes the percentage overlap between a user's skills and a job's
 * required-skill tags, using case-insensitive exact-string matching (no
 * fuzzy matching — skills and required-skill tags are both manually
 * entered, so an exact match is the meaningful signal).
 *
 * Returns null (render as "—", not 0%/100%) when the job has no tagged
 * required skills, since neither number would be a meaningful signal.
 *
 * @param {string[]} userSkillNames
 * @param {string[]} jobRequiredSkillNames
 * @returns {number | null}
 */
export function computeSkillMatch(userSkillNames, jobRequiredSkillNames) {
  if (!jobRequiredSkillNames || jobRequiredSkillNames.length === 0) {
    return null;
  }

  const normalizedUserSkills = (userSkillNames || []).map((s) =>
    s.trim().toLowerCase(),
  );

  const matched = jobRequiredSkillNames.filter((req) =>
    normalizedUserSkills.includes(req.trim().toLowerCase()),
  );

  return Math.round((matched.length / jobRequiredSkillNames.length) * 100);
}
