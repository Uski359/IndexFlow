import { Contract, isAddress, type ContractEventPayload } from 'ethers';

import { processReputationWithSybilFilter } from './sybilProcessor.js';
import { connectDB } from '../infra/indexer/db/mongo.js';
import { logger } from '../infra/indexer/logger.js';
import { getProvider } from '../infra/indexer/services/provider.js';

const BASE_REPUTATION_REGISTRY_ABI = [
  'event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)'
];

type NewFeedbackListener = (
  agentId: bigint,
  reviewer: string,
  feedbackIndex: bigint,
  score: bigint,
  valueDecimals: bigint,
  indexedTag1: string,
  tag1: string,
  tag2: string,
  endpoint: string,
  feedbackURI: string,
  feedbackHash: string,
  event: ContractEventPayload
) => Promise<void>;

export const startBaseIndexer = async (): Promise<() => Promise<void>> => {
  const registryAddress = process.env.BASE_ERC8004_REPUTATION_REGISTRY_ADDRESS?.trim();
  if (!registryAddress) {
    logger.warn('Base ERC-8004 indexer disabled: registry address is not configured');
    return async () => undefined;
  }
  if (!isAddress(registryAddress)) {
    throw new Error('BASE_ERC8004_REPUTATION_REGISTRY_ADDRESS must be a valid EVM address');
  }

  const db = await connectDB();
  await db.command({ ping: 1 });

  const provider = getProvider('base');
  const contract = new Contract(registryAddress, BASE_REPUTATION_REGISTRY_ABI, provider.provider);

  const onNewFeedback: NewFeedbackListener = async (
    agentId,
    reviewer,
    feedbackIndex,
    score,
    valueDecimals,
    indexedTag1,
    tag1,
    tag2,
    endpoint,
    feedbackURI,
    feedbackHash,
    event
  ) => {
    try {
      await processReputationWithSybilFilter({
        agentId,
        reviewer,
        rawScore: Number(score) / 10 ** Number(valueDecimals),
        comment: JSON.stringify({
          feedbackIndex: feedbackIndex.toString(),
          valueDecimals: Number(valueDecimals),
          indexedTag1,
          tag1,
          tag2,
          endpoint,
          feedbackURI,
          feedbackHash
        }),
        txHash: event.log.transactionHash,
        chainId: 'base',
        blockNumber: event.log.blockNumber
      });
    } catch (error) {
      logger.error('Failed to process Base ERC-8004 NewFeedback event', {
        agentId: agentId.toString(),
        reviewer,
        txHash: event.log.transactionHash,
        err: error
      });
    }
  };

  await contract.on('NewFeedback', onNewFeedback);
  logger.info('Subscribed to Base ERC-8004 NewFeedback events', { registryAddress });

  return async () => {
    await contract.off('NewFeedback', onNewFeedback);
    await provider.provider.destroy();
  };
};