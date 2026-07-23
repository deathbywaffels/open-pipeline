import { Router } from "express";
import { extractJob, extractCvSkills } from "../controllers/ai.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.post("/extract-job", extractJob);
router.post("/extract-cv-skills/:cvId", extractCvSkills);

export default router;
