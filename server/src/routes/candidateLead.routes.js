import { Router } from "express";
import {
  createCandidateLead,
  listCandidateLeads,
  updateCandidateLead,
  deleteCandidateLead,
} from "../controllers/candidateLead.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.post("/", createCandidateLead);
router.get("/", listCandidateLeads);
router.patch("/:id", updateCandidateLead);
router.delete("/:id", deleteCandidateLead);

export default router;
