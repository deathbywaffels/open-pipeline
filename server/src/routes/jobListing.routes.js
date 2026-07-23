import { Router } from "express";
import {
  createJobListing,
  listJobListings,
  getJobListing,
  swipeJobListing,
  getMapListings,
  retryGeocode,
} from "../controllers/jobListing.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.post("/", createJobListing);
router.get("/", listJobListings);
router.get("/map", getMapListings); // must precede /:id so "map" isn't captured as an id
router.get("/:id", getJobListing);
router.post("/:id/swipe", swipeJobListing);
router.post("/:id/geocode", retryGeocode);

export default router;
