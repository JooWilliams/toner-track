import { Router } from "express";
import { h } from "../lib/http.js";
import { computePrinterStats } from "../lib/stats.js";

const router = Router();

// GET /api/stats/printers
router.get(
  "/printers",
  h((_req, res) => {
    res.json(computePrinterStats());
  })
);

export default router;
