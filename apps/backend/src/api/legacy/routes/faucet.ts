import { Router } from "express";
import { ethers } from "ethers";

const router = Router();

const tokenAbi = [
  "function transfer(address to, uint256 value) public returns (bool)"
];
const PRIVATE_KEY_REGEX = /^0x[0-9a-fA-F]{64}$/;

type FaucetState = {
  token: ethers.Contract;
  amount: bigint;
};

let cachedState: FaucetState | null | undefined;

const getFaucetState = (): FaucetState | null => {
  if (cachedState !== undefined) {
    return cachedState;
  }

  const rpcUrl = process.env.RPC_URL?.trim();
  const privateKey = process.env.FAUCET_PRIVATE_KEY?.trim();
  const tokenAddress = process.env.TOKEN_ADDRESS?.trim();
  const tokenDecimalsRaw = process.env.TOKEN_DECIMALS?.trim();

  if (!rpcUrl || !privateKey || !tokenAddress || !tokenDecimalsRaw) {
    cachedState = null;
    return cachedState;
  }

  if (!PRIVATE_KEY_REGEX.test(privateKey)) {
    cachedState = null;
    return cachedState;
  }

  const decimals = Number(tokenDecimalsRaw);
  if (!Number.isInteger(decimals) || decimals < 0) {
    cachedState = null;
    return cachedState;
  }

  const faucetAmountRaw = process.env.FAUCET_AMOUNT?.trim() || "10";
  const amount = ethers.parseUnits(faucetAmountRaw, decimals);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const token = new ethers.Contract(tokenAddress, tokenAbi, wallet);

  cachedState = { token, amount };
  return cachedState;
};

const walletCooldown = new Map<string, number>();
const ipCooldown = new Map<string, number>();
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

router.post("/", async (req, res) => {
  const faucetState = getFaucetState();
  if (!faucetState) {
    return res.status(503).json({ error: "faucet_disabled" });
  }

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
    const tx = await faucetState.token.transfer(address, faucetState.amount);
    await tx.wait();

    walletCooldown.set(address, now);
    ipCooldown.set(ip, now);

    return res.json({ success: true, hash: tx.hash });
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Faucet failed", details: message });
  }
});

export default router;

