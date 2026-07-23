import { Router } from "express";
import {
  listApplications,
  updateApplicationStage,
} from "../controllers/application.controller.js";
import {
  requireOwnApplication,
  uploadRejectionLetter,
} from "../controllers/rejectionLetter.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { rejectionLetterUpload, handleUploadError } from "../lib/upload.js";

const router = Router();

router.use(requireAuth);
router.get("/", listApplications);
router.patch("/:id/stage", updateApplicationStage);
router.post(
  "/:id/rejection-letter",
  requireOwnApplication,
  rejectionLetterUpload.single("file"),
  handleUploadError,
  uploadRejectionLetter,
);

export default router;
