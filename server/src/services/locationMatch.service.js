const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance between two lat/lon points, in kilometers
 * (haversine formula).
 *
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number}
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Checks whether a job falls within the user's commute radius of any of
 * their desired locations. Returns null (not false) whenever there isn't
 * enough information to say — the job has no resolved coordinates, or the
 * user has no desired location that successfully geocoded — since neither
 * case means "out of range," just "unknown."
 *
 * @param {number|null} jobLat
 * @param {number|null} jobLon
 * @param {{ latitude: number|null, longitude: number|null }[]} desiredLocations
 * @param {number} radiusKm
 * @returns {boolean | null}
 */
export function isInDesiredLocation(
  jobLat,
  jobLon,
  desiredLocations,
  radiusKm,
) {
  if (jobLat == null || jobLon == null) return null;

  const geocoded = (desiredLocations || []).filter(
    (loc) => loc.latitude != null && loc.longitude != null,
  );
  if (geocoded.length === 0) return null;

  return geocoded.some(
    (loc) =>
      haversineDistanceKm(jobLat, jobLon, loc.latitude, loc.longitude) <=
      radiusKm,
  );
}
