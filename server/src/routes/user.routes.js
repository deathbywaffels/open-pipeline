import { Router } from "express";
import { updateUserSettings } from "../controllers/gamification.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.patch("/settings", updateUserSettings);

export default router;
