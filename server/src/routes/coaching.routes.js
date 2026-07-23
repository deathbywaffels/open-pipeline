import { Router } from "express";
import {
  getCoachingSummary,
  getRoleSuggestions,
} from "../controllers/coaching.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/summary", getCoachingSummary);
router.post("/role-suggestions", getRoleSuggestions);

export default router;
