import { promises as fs } from "fs";
import path from "path";
import process from "process";

type ValidatorRecord = {
  id: string;
  stake: number;
  uptime: number;
};

const DEFAULT_TOTAL_REWARD = 10_000; // arbitrary unit for dry-run purposes

async function main() {
  const inputFile =
    process.env.VALIDATORS_FILE ?? path.join(__dirname, "validators.sample.json");
  const outputFile =
    process.env.REWARDS_FILE ?? path.join(__dirname, "..", "ops", "validator_rewards.csv");
  const targetRewards = Number(process.env.TOTAL_REWARD ?? DEFAULT_TOTAL_REWARD);

  const validators = await loadValidators(inputFile);
  const distribution = calculateDistribution(validators, targetRewards);
  await writeCsv(outputFile, distribution);

  console.log(
    `[rewards] Wrote ${distribution.length} rows to ${outputFile}. Total rewards simulated: ${targetRewards}.`
  );
}

async function loadValidators(filePath: string): Promise<ValidatorRecord[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      throw new Error("File must contain an array of validator records");
    }

    return data.map((item, index) => {
      if (typeof item.id !== "string") {
        throw new Error(`Validator at index ${index} missing id`);
      }
      if (typeof item.stake !== "number" || item.stake <= 0) {
        throw new Error(`Validator ${item.id} has invalid stake`);
      }
      if (typeof item.uptime !== "number" || item.uptime < 0 || item.uptime > 1) {
        throw new Error(`Validator ${item.id} has invalid uptime`);
      }
      return {
        id: item.id,
        stake: item.stake,
        uptime: item.uptime
      };
    });
  } catch (error) {
    throw new Error(`Unable to load validators from ${filePath}: ${(error as Error).message}`);
  }
}

function calculateDistribution(validators: ValidatorRecord[], totalReward: number) {
  const weightedTotals = validators.map((validator) => ({
    ...validator,
    weight: validator.stake * validator.uptime
  }));

  const totalWeight = weightedTotals.reduce((acc, item) => acc + item.weight, 0);
  if (totalWeight === 0) {
    throw new Error("Total weight is zero; check validator inputs.");
  }

  return weightedTotals.map((item) => {
    const reward = (item.weight / totalWeight) * totalReward;
    return {
      id: item.id,
      stake: item.stake,
      uptime: item.uptime,
      reward: Number(reward.toFixed(2))
    };
  });
}

async function writeCsv(filePath: string, data: Array<Record<string, unknown>>) {
  const header = "validator_id,stake,uptime,reward\n";
  const rows = data
    .map((item) => `${item.id},${item.stake},${item.uptime},${item.reward}`)
    .join("\n");

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, header + rows + "\n", "utf8");
}

main().catch((error) => {
  console.error("[rewards] Simulation failed:", error);
  process.exitCode = 1;
});
