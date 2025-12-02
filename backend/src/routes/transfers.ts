import { Router } from "express";
import { TransferRepository } from "../repositories/transferRepository.js";

const router = Router();

router.get("/recent", async (req, res) => {
  try {
    const limitParam = Number(req.query.limit);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;

    const repo = new TransferRepository();
    const list = await repo.getRecent(limit);

    res.json({
      status: "ok",
      count: list.length,
      data: list,
    });
  } catch (err) {
    console.error("Error in GET /transfers/recent:", err);
    res.status(500).json({ error: "internal server error" });
  }
}); 

export default router;
