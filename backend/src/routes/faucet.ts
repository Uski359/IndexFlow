import { Router } from "express";
import { ethers } from "ethers";

const router = Router();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.FAUCET_PRIVATE_KEY!, provider);

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS!;
const FAUCET_AMOUNT = ethers.parseUnits(
  process.env.FAUCET_AMOUNT || "10",
  18
);

const tokenAbi = [
  "function transfer(address to, uint256 value) public returns (bool)"
];
const token = new ethers.Contract(TOKEN_ADDRESS, tokenAbi, wallet);

const walletCooldown = new Map<string, number>();
const ipCooldown = new Map<string, number>();
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

router.post("/", async (req, res) => {
  const { address } = req.body ?? {};
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.ip) || "unknown";

  if (!address) {
    return res.status(400).json({ error: "Missing address" });
  }

  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }

  const now = Date.now();

  if (walletCooldown.has(address) && now - walletCooldown.get(address)! < COOLDOWN_MS) {
    return res.status(429).json({ error: "Address cooldown active" });
  }

  if (ipCooldown.has(ip) && now - ipCooldown.get(ip)! < COOLDOWN_MS) {
    return res.status(429).json({ error: "IP cooldown active" });
  }

  try {
    const tx = await token.transfer(address, FAUCET_AMOUNT);
    await tx.wait();

    walletCooldown.set(address, now);
    ipCooldown.set(ip, now);

    return res.json({ success: true, hash: tx.hash });
  } catch (err: any) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Faucet failed", details: err?.message });
  }
});

export default router;
