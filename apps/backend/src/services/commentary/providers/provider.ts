import type { UsageOutputV1 } from '../../../core/contracts/usageOutputV1.js';
import type { InsightV1 } from '../../../core/insights/insightsV1.js';

export interface CommentaryProvider {
  name(): string;
  generate(input: { output: UsageOutputV1; insights: InsightV1 }): Promise<string>;
}

