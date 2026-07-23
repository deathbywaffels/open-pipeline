import { Router } from "express";
import {
  createJobPosting,
  listJobPostings,
  retryGeocode,
  deleteJobPosting,
} from "../controllers/jobPosting.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.post("/", createJobPosting);
router.get("/", listJobPostings);
router.post("/:id/geocode", retryGeocode);
router.delete("/:id", deleteJobPosting);

export default router;
