import { Router } from "express";

import {
  getTopScores,
  createScore,
} from "../controllers/scoreController.js";

const router = Router();

router.get("/", getTopScores);
router.post("/", createScore);

export default router;
