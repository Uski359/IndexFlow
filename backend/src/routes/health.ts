import { Router } from "express";
const router = Router();

router.get("/health", (req, res) => {
  return res.json({ ok: true, status: "running" });
});

export default router;
