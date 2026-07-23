/**
 * GET /api/health
 * Reports basic liveness status for the API.
 *
 * Inputs: none.
 * Response: 200 { status: "ok", timestamp: string (ISO 8601) }
 */
export function getHealth(req, res) {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
}
