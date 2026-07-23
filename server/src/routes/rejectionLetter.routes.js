import { Router } from "express";
import { downloadRejectionLetter } from "../controllers/rejectionLetter.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/:id/download", downloadRejectionLetter);

export default router;
