import { prisma } from "../lib/prisma.js";
import { geocodeAddress } from "../services/geocoding.service.js";

/**
 * POST /api/desired-locations
 * Adds a desired work location. Attempts best-effort geocoding so it can
 * later be used for distance-based job flagging; a geocoding failure never
 * blocks saving the location (latitude/longitude are simply left null,
 * retriable via the /geocode endpoint) — same pattern as JobListing.
 *
 * Inputs: body { label: string }
 * Response: 201 DesiredLocation | 400 (missing label) | 409 (duplicate)
 */
export async function createDesiredLocation(req, res) {
  const { label } = req.body;

  if (!label || !label.trim()) {
    return res.status(400).json({ error: "label is required" });
  }
  const trimmedLabel = label.trim();

  const existing = await prisma.desiredLocation.findUnique({
    where: {
      userId_label: { userId: req.session.userId, label: trimmedLabel },
    },
  });
  if (existing) {
    return res.status(409).json({ error: "Location already added" });
  }

  const coords = await geocodeAddress(trimmedLabel);

  const location = await prisma.desiredLocation.create({
    data: {
      userId: req.session.userId,
      label: trimmedLabel,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    },
  });

  res.status(201).json(location);
}

/**
 * GET /api/desired-locations
 * Lists the current user's desired work locations.
 *
 * Inputs: none.
 * Response: 200 [DesiredLocation]
 */
export async function listDesiredLocations(req, res) {
  const locations = await prisma.desiredLocation.findMany({
    where: { userId: req.session.userId },
    orderBy: { createdAt: "asc" },
  });
  res.status(200).json(locations);
}

/**
 * POST /api/desired-locations/:id/geocode
 * Manually retries geocoding for a location that failed to resolve when
 * it was added.
 *
 * Inputs: path { id: number }
 * Response: 200 DesiredLocation | 404 (not found or not owned by the current user)
 */
export async function retryGeocodeDesiredLocation(req, res) {
  const id = Number(req.params.id);

  const location = await prisma.desiredLocation.findUnique({ where: { id } });
  if (!location || location.userId !== req.session.userId) {
    return res.status(404).json({ error: "Location not found" });
  }

  const coords = await geocodeAddress(location.label);

  const updated = await prisma.desiredLocation.update({
    where: { id },
    data: {
      latitude: coords?.latitude ?? location.latitude,
      longitude: coords?.longitude ?? location.longitude,
    },
  });

  res.status(200).json(updated);
}

/**
 * DELETE /api/desired-locations/:id
 * Removes a desired work location.
 *
 * Inputs: path { id: number }
 * Response: 204 | 404 (not found or not owned by the current user)
 */
export async function deleteDesiredLocation(req, res) {
  const id = Number(req.params.id);

  const location = await prisma.desiredLocation.findUnique({ where: { id } });
  if (!location || location.userId !== req.session.userId) {
    return res.status(404).json({ error: "Location not found" });
  }

  await prisma.desiredLocation.delete({ where: { id } });
  res.status(204).end();
}
