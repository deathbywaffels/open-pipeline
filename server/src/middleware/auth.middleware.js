/**
 * Guards a route behind an authenticated session. Requires session
 * middleware to have already run. Responds 401 if no user is logged in.
 */
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}
