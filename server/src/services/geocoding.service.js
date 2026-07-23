const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MIN_INTERVAL_MS = 1100; // stay under Nominatim's ~1 req/sec usage-policy cap
const USER_AGENT = "job-search-tracker (personal use; contact: n/a)";

let lastCallAt = 0;

async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastCallAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastCallAt = Date.now();
}

/**
 * Best-effort geocoding of a free-text address via Nominatim (OpenStreetMap).
 * Never throws — returns null on any failure (network error, no match,
 * rate limit) so a geocoder outage never blocks saving a job listing.
 *
 * @param {string} address
 * @returns {Promise<{ latitude: number, longitude: number } | null>}
 */
export async function geocodeAddress(address) {
  if (!address || !address.trim()) return null;

  try {
    await throttle();

    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) return null;

    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    const { lat, lon } = results[0];
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null;
  }
}
