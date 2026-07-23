import { Router } from "express";
import {
  listSkills,
  createSkill,
  deleteSkill,
} from "../controllers/skill.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listSkills);
router.post("/", createSkill);
router.delete("/:id", deleteSkill);

export default router;
