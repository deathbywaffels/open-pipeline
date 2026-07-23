/**
 * Normalizes a company name for matching: trim, lowercase, collapse
 * internal whitespace. No suffix-stripping (e.g. "B.V.", "Ltd.") — keeping
 * matching exact-after-normalization avoids false-positive matches between
 * unrelated companies that happen to share a common suffix.
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizeCompanyName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Checks whether a job's company name matches an entry in the user's
 * sponsor-company list.
 *
 * @param {string} companyName
 * @param {Set<string>} normalizedSponsorNames
 * @returns {boolean}
 */
export function isRecognizedSponsor(companyName, normalizedSponsorNames) {
  return normalizedSponsorNames.has(normalizeCompanyName(companyName));
}
