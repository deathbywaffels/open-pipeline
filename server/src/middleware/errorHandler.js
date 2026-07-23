/**
 * Centralized Express error-handling middleware. Catches errors passed via
 * next(err) or thrown in async route handlers (Express 5 auto-forwards
 * rejected promises), and returns a consistent JSON error shape.
 */
export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = status === 500 ? "Internal server error" : err.message;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({ error: message });
}

/** 404 handler for unmatched routes, placed after all route registrations. */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Not found" });
}
