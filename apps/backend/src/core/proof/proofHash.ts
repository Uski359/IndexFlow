import { keccak256, toUtf8Bytes } from 'ethers';

import type { UsageOutputV1 } from '../contracts/usageOutputV1.js';
import { canonicalizeUsageOutputV1 } from '../canonicalize/canonicalJson.js';

export const getUsageOutputHash = (
  output: UsageOutputV1
): { canonical_json: string; hash: string } => {
  const outputForHash: UsageOutputV1 = {
    ...output,
    proof: {
      ...output.proof,
      canonical_hash: ''
    }
  };

  const canonical_json = canonicalizeUsageOutputV1(outputForHash);
  return {
    canonical_json,
    hash: keccak256(toUtf8Bytes(canonical_json))
  };
};
