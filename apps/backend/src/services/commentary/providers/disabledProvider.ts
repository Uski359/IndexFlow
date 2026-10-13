import type { UsageOutputV1 } from '../../../core/contracts/usageOutputV1.js';
import type { InsightV1 } from '../../../core/insights/insightsV1.js';
import type { CommentaryProvider } from './provider.js';

const pluralize = (value: number, label: string) => `${value} ${label}${value === 1 ? '' : 's'}`;

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const buildDeterministicCommentary = (output: UsageOutputV1, insights: InsightV1) => {
  const { tx_count, days_active, unique_contracts } = output.usage_summary;
  const days = pluralize(days_active, 'active day');
  const contracts = pluralize(unique_contracts, 'contract');

  let baseSentence = '';
  switch (insights.behavior_tag) {
    case 'organic':
      baseSentence = `Consistent activity across ${days} with ${contracts}; low farming risk.`;
      break;
    case 'suspected_farm':
      baseSentence = `High transaction concentration (${tx_count} tx over ${days}) with limited diversity (${contracts}); elevated farming risk signals.`;
      break;
    case 'inactive':
      baseSentence = `Very limited recent activity (${tx_count} tx over ${days}); wallet appears mostly inactive in this window.`;
      break;
    case 'mixed':
    default:
      baseSentence = `Moderate activity (${tx_count} tx, ${days}, ${contracts}) with mixed patterns; review details for campaign-specific intent.`;
      break;
  }

  const scoreSentence = `Score: ${insights.overall_score}/100, Farming risk: ${formatPercent(
    insights.farming_probability
  )}.`;

  return `${baseSentence} ${scoreSentence}`;
};

export class DisabledProvider implements CommentaryProvider {
  name() {
    return 'disabled';
  }

  async generate(input: { output: UsageOutputV1; insights: InsightV1 }): Promise<string> {
    return buildDeterministicCommentary(input.output, input.insights);
  }
}

export { buildDeterministicCommentary };

