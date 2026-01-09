export type ProofOfUsageCriteria = {
  timeframeDays: number;
  minimumInteractions: number;
  minimumActiveDays?: number;
};

export const defaultProofOfUsageCriteria: ProofOfUsageCriteria = {
  timeframeDays: 30,
  minimumInteractions: 5,
  minimumActiveDays: 3,
};
