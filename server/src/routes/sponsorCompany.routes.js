import { Router } from "express";
import {
  importSponsorCompanies,
  listSponsorCompanies,
  updateSponsorCompany,
  deleteSponsorCompany,
} from "../controllers/sponsorCompany.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listSponsorCompanies);
router.post("/import", importSponsorCompanies);
router.patch("/:id", updateSponsorCompany);
router.delete("/:id", deleteSponsorCompany);

export default router;
