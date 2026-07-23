import { prisma } from "../lib/prisma.js";
import { buildObjectKey } from "../lib/upload.js";
import { uploadObject, getObject } from "../lib/objectStorage.js";

/**
 * Route middleware verifying the current user owns the Application named
 * by :id. Must run BEFORE uploadRejectionLetter — the R2 object key is
 * built directly from :id (see buildObjectKey), so skipping this check
 * first would let a file be stored under another user's application id
 * before any ownership check ever runs.
 */
export async function requireOwnApplication(req, res, next) {
  const application = await prisma.application.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!application || application.userId !== req.session.userId) {
    return res.status(404).json({ error: "Application not found" });
  }
  next();
}

/**
 * POST /api/applications/:id/rejection-letter
 * Uploads a rejection letter for an application (multipart/form-data,
 * field "file"). PDF/DOC/DOCX only, max 10MB.
 *
 * Inputs: path { id: number }, multipart file field "file"
 * Response: 201 RejectionLetter | 400 (no file / rejected by file filter)
 *   | 404 (application not found or not owned — checked by
 *   requireOwnApplication before this handler runs)
 */
export async function uploadRejectionLetter(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const storageKey = buildObjectKey(
    "rejection-letters",
    req.params.id,
    req.file.originalname,
  );
  await uploadObject(storageKey, req.file.buffer, req.file.mimetype);

  const letter = await prisma.rejectionLetter.create({
    data: {
      applicationId: Number(req.params.id),
      filename: req.file.originalname,
      storageKey,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    },
  });

  res.status(201).json({
    id: letter.id,
    filename: letter.filename,
    mimeType: letter.mimeType,
    sizeBytes: letter.sizeBytes,
    uploadedAt: letter.uploadedAt,
  });
}

/**
 * GET /api/rejection-letters/:id/download
 * Streams a rejection letter file from R2. Never served via express.static
 * — ownership is verified (via the parent Application) before streaming.
 *
 * Inputs: path { id: number }
 * Response: 200 (file stream) | 404 (not found or not owned by the current user)
 */
export async function downloadRejectionLetter(req, res) {
  const id = Number(req.params.id);

  const letter = await prisma.rejectionLetter.findUnique({
    where: { id },
    include: { application: true },
  });
  if (!letter || letter.application.userId !== req.session.userId) {
    return res.status(404).json({ error: "Rejection letter not found" });
  }

  const { stream, contentType } = await getObject(letter.storageKey);
  res.attachment(letter.filename);
  res.setHeader("Content-Type", contentType);
  stream.pipe(res);
}
