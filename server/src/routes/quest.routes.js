import { Router } from "express";
import { getTodayQuest } from "../controllers/gamification.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/today", getTodayQuest);

export default router;
