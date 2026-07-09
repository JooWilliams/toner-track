import { Router } from "express";
import { h } from "../lib/http.js";
import { computeSummary, computeSeries } from "../lib/stats.js";

const router = Router();

// GET /api/dashboard
router.get(
  "/",
  h((_req, res) => {
    const totals = computeSummary();
    const { monthly, yearly } = computeSeries();
    res.json({ totals, monthly, yearly });
  })
);

export default router;
