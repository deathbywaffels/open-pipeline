import { Router } from "express";
import { listDislikeReasons } from "../controllers/dislikeReason.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listDislikeReasons);

export default router;
