import { prisma } from "../lib/prisma.js";
import { buildObjectKey } from "../lib/upload.js";
import { uploadObject, getObject } from "../lib/objectStorage.js";

/**
 * POST /api/cv
 * Uploads a CV (multipart/form-data, field "file"). PDF/DOC/DOCX only,
 * max 10MB — enforced by multer's fileFilter/limits (see lib/upload.js).
 * The file itself is stored in R2, not on local disk (see lib/objectStorage.js).
 *
 * Inputs: multipart file field "file"
 * Response: 201 CV | 400 (no file attached, or rejected by the file filter)
 */
export async function uploadCV(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const storageKey = buildObjectKey(
    "cv",
    req.session.userId,
    req.file.originalname,
  );
  await uploadObject(storageKey, req.file.buffer, req.file.mimetype);

  const cv = await prisma.cv.create({
    data: {
      userId: req.session.userId,
      filename: req.file.originalname,
      storageKey,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    },
  });

  res.status(201).json({
    id: cv.id,
    filename: cv.filename,
    mimeType: cv.mimeType,
    sizeBytes: cv.sizeBytes,
    uploadedAt: cv.uploadedAt,
  });
}

/**
 * GET /api/cv
 * Lists the current user's uploaded CVs (metadata only, no file paths).
 *
 * Inputs: none.
 * Response: 200 [{ id, filename, mimeType, sizeBytes, uploadedAt }]
 */
export async function listCVs(req, res) {
  const cvs = await prisma.cv.findMany({
    where: { userId: req.session.userId },
    orderBy: { uploadedAt: "desc" },
  });

  res.status(200).json(
    cvs.map((cv) => ({
      id: cv.id,
      filename: cv.filename,
      mimeType: cv.mimeType,
      sizeBytes: cv.sizeBytes,
      uploadedAt: cv.uploadedAt,
    })),
  );
}

/**
 * GET /api/cv/:id/download
 * Streams a CV file from R2. Never served via express.static — ownership is
 * verified here before the file is streamed, so a guessed/enumerated URL
 * can't leak another user's private CV.
 *
 * Inputs: path { id: number }
 * Response: 200 (file stream) | 404 (not found or not owned by the current user)
 */
export async function downloadCV(req, res) {
  const id = Number(req.params.id);

  const cv = await prisma.cv.findUnique({ where: { id } });
  if (!cv || cv.userId !== req.session.userId) {
    return res.status(404).json({ error: "CV not found" });
  }

  const { stream, contentType } = await getObject(cv.storageKey);
  res.attachment(cv.filename); // sets a safely-escaped Content-Disposition
  res.setHeader("Content-Type", contentType); // override attachment()'s extension guess
  stream.pipe(res);
}
