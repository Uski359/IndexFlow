import { Router } from "express";
import { TransferModel } from "../models/Transfer.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 50;

    const transfers = await TransferModel.find()
      .sort({ blockNumber: -1 })
      .limit(limit)
      .lean();

    res.json({
      ok: true,
      count: transfers.length,
      transfers,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
