import { Router } from "express";
import { getStreak } from "../controllers/gamification.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", getStreak);

export default router;
