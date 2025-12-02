import { Router } from "express";
import { TransferRepository } from "../repositories/transferRepository.js";

const router = Router();

router.get("/recent", async (req, res) => {
  try {
    const repo = new TransferRepository();
    const list = await repo.getRecent(50);

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
