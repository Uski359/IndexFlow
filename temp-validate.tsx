import { proofGenerationSchema } from "./backend/src/schema/validatorSchema.ts";
import { readFileSync } from "node:fs";
const payload = JSON.parse(readFileSync("proof-payload.json", "utf8"));
try {
  const result = proofGenerationSchema.parse(payload);
  console.log('ok');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify(error, null, 2));
  process.exit(1);
}
