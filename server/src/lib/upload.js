import multer from "multer";
import { randomUUID } from "node:crypto";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
  }
  cb(null, true);
}

const storage = multer.memoryStorage();

// Files land in req.file.buffer rather than on local disk, since the
// production filesystem (Render's free tier) is ephemeral — the buffer is
// uploaded to R2 by the controller, which also builds the object key via
// buildObjectKey below.
export const cvUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

export const rejectionLetterUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

/** Builds an R2 object key: `<subdir>/<id>/<uuid>-<filename>`. */
export function buildObjectKey(subdir, id, filename) {
  return `${subdir}/${id}/${randomUUID()}-${filename}`;
}

/** Express error-handling middleware for multer errors (bad mimetype,
 * file too large) so they surface as clean 400s instead of 500s. */
export function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError || err?.message?.includes("allowed")) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}
