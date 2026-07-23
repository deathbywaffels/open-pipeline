import { Router } from "express";
import {
  listMatchedCandidates,
  recommendMatchedCandidates,
} from "../controllers/discovery.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/candidates", listMatchedCandidates);
router.post("/recommend", recommendMatchedCandidates);

export default router;
