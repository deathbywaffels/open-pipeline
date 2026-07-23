import { Router } from "express";
import {
  createDesiredLocation,
  listDesiredLocations,
  retryGeocodeDesiredLocation,
  deleteDesiredLocation,
} from "../controllers/desiredLocation.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listDesiredLocations);
router.post("/", createDesiredLocation);
router.post("/:id/geocode", retryGeocodeDesiredLocation);
router.delete("/:id", deleteDesiredLocation);

export default router;
