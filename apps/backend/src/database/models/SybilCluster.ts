import { model, models, Schema, type Model } from 'mongoose';

export interface SybilClusterRecord {
  clusterId: string;
  wallets: string[];
  fundingSourceAddresses: string[];
  description?: string;
  isActive: boolean;
  createdAt: Date;
}

export const sybilClusterSchema = new Schema<SybilClusterRecord>(
  {
    clusterId: { type: String, required: true, trim: true, unique: true },
    wallets: { type: [{ type: String, trim: true, lowercase: true }], required: true, default: [] },
    fundingSourceAddresses: {
      type: [{ type: String, trim: true, lowercase: true }],
      required: true,
      default: []
    },
    description: { type: String, trim: true },
    isActive: { type: Boolean, required: true, default: true },
    createdAt: { type: Date, required: true, default: Date.now }
  },
  { collection: 'sybil_clusters', versionKey: false }
);

sybilClusterSchema.index({ wallets: 1 });
sybilClusterSchema.index({ fundingSourceAddresses: 1 });

export const SybilCluster =
  (models.SybilCluster as Model<SybilClusterRecord> | undefined) ??
  model<SybilClusterRecord>('SybilCluster', sybilClusterSchema);