import { Router } from "express";
import { analyzeFit } from "../controllers/companyFit.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.post("/analyze", analyzeFit);

export default router;
