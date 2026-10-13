import { Router } from 'express';
import { isAddress } from 'viem';

import {
  getReputationsCollection,
  getSybilClustersCollection
} from '../infra/indexer/db/mongo.js';

const sybilRouter = Router();

sybilRouter.post('/check', async (req, res, next) => {
  const candidate = req.body?.agentAddress ?? req.query.agentAddress;
  if (typeof candidate !== 'string' || !isAddress(candidate, { strict: false })) {
    res.status(400).json({ error: 'agentAddress must be a valid EVM address' });
    return;
  }

  const agentAddress = candidate.toLowerCase();

  try {
    const sybilClusters = await getSybilClustersCollection();
    const matchedClusters = await sybilClusters
      .find({
        isActive: { $ne: false },
        $or: [
          { wallets: agentAddress },
          { fundingSourceAddresses: agentAddress }
        ]
      })
      .toArray();

    const relatedReviewers = new Set<string>([agentAddress]);
    for (const cluster of matchedClusters) {
      for (const wallet of cluster.wallets) {
        relatedReviewers.add(wallet.toLowerCase());
      }
    }

    const reputations = await getReputationsCollection();
    const feedback = await reputations
      .find({ reviewer: { $in: [...relatedReviewers] } })
      .toArray();

    const reputationScores = feedback
      .map((record) => record.weightedScore)
      .filter((score) => Number.isFinite(score));
    const reputationScore =
      reputationScores.length > 0
        ? reputationScores.reduce((sum, score) => sum + score, 0) / reputationScores.length
        : undefined;

    const feedbackRisk = feedback.reduce((maxRisk, record) => {
      const recordRisk = record.isSybil
        ? 100
        : Math.max(0, Math.min(100, record.sybilScore * 100));
      return Math.max(maxRisk, recordRisk);
    }, 0);
    const riskScore = Math.max(matchedClusters.length > 0 ? 100 : 0, feedbackRisk);

    res.json({
      agentAddress,
      riskScore,
      ...(reputationScore !== undefined ? { reputationScore } : {}),
      isSybil: riskScore > 70
    });
  } catch (error) {
    next(error);
  }
});

export default sybilRouter;