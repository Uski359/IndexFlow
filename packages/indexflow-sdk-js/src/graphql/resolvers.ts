import type { ProofData } from '../../scripts/mockData.js';
import type { SdkContext } from '../sdk/index.js';
import { getVerifiedData } from '../sdk/index.js';

interface VerifiedDataArgs {
  address?: string;
  eventType?: string;
}

export const resolvers = {
  Query: {
    verifiedData: async (
      _parent: unknown,
      args: VerifiedDataArgs,
      context?: SdkContext
    ): Promise<ProofData[]> => {
      const sdk = context?.sdk ?? { getVerifiedData };
      return sdk.getVerifiedData(args.address, args.eventType);
    }
  }
};
