export type ProofOfUsageCriteria = {
  timeframeDays: number;
  minimumInteractions: number;
};

export const defaultProofOfUsageCriteria: ProofOfUsageCriteria = {
  timeframeDays: 30,
  minimumInteractions: 3,
};
