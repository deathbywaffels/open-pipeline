import { Router } from "express";
import { uploadCV, listCVs, downloadCV } from "../controllers/cv.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { cvUpload, handleUploadError } from "../lib/upload.js";

const router = Router();

router.use(requireAuth);
router.post("/", cvUpload.single("file"), handleUploadError, uploadCV);
router.get("/", listCVs);
router.get("/:id/download", downloadCV);

export default router;
