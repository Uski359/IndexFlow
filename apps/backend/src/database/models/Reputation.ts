import { model, models, Schema, type Model } from 'mongoose';

export interface ReputationRecord {
  agentId: number;
  reviewer: string;
  rawScore: number;
  weightedScore: number;
  isSybil: boolean;
  sybilScore: number;
  comment: string;
  txHash: string;
  processedAt: Date;
  chainId?: string;
  blockNumber?: number;
}

export const reputationSchema = new Schema<ReputationRecord>(
  {
    agentId: { type: Number, required: true },
    reviewer: { type: String, required: true, trim: true, lowercase: true },
    rawScore: { type: Number, required: true },
    weightedScore: { type: Number, required: true },
    isSybil: { type: Boolean, required: true },
    sybilScore: { type: Number, required: true, min: 0, max: 1 },
    comment: { type: String, default: '' },
    txHash: { type: String, required: true, trim: true, lowercase: true },
    processedAt: { type: Date, required: true, default: Date.now },
    chainId: { type: String, trim: true, lowercase: true },
    blockNumber: { type: Number, min: 0 }
  },
  { collection: 'reputations', versionKey: false }
);

reputationSchema.index({ txHash: 1 }, { unique: true });
reputationSchema.index({ agentId: 1, chainId: 1, blockNumber: 1 });

export const Reputation =
  (models.Reputation as Model<ReputationRecord> | undefined) ??
  model<ReputationRecord>('Reputation', reputationSchema);