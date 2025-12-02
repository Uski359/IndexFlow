import { Router } from "express";
import { TransferRepository } from "../repositories/transferRepository.js";

const router = Router();

const getRecentTransfers = async (req, res, next) => {
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
    next(err);
  }
};

router.get("/", getRecentTransfers);
router.get("/recent", getRecentTransfers);

export default router;
