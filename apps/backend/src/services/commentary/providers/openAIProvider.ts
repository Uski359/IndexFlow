import type { UsageOutputV1 } from '../../../core/contracts/usageOutputV1.js';
import type { InsightV1 } from '../../../core/insights/insightsV1.js';
import type { CommentaryProvider } from './provider.js';

type OpenAIProviderOptions = {
  apiKey: string;
  model: string;
  timeoutMs?: number;
};

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const limitToTwoSentences = (value: string) => {
  const sentences = value.split(/(?<=[.!?])\s+/);
  if (sentences.length <= 2) {
    return value;
  }
  return sentences.slice(0, 2).join(' ');
};

export class OpenAIProvider implements CommentaryProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: OpenAIProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? 8_000;
  }

  name() {
    return this.model;
  }

  async generate(input: { output: UsageOutputV1; insights: InsightV1 }): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const { output, insights } = input;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          max_tokens: 80,
          messages: [
            {
              role: 'system',
              content:
                'Write a concise, neutral wallet profile comment. Use 1-2 sentences. No markdown, no bullet points.'
            },
            {
              role: 'user',
              content: [
                `Campaign: ${output.campaign_id}`,
                `Window: ${output.window.start}-${output.window.end}`,
                `Tx count: ${output.usage_summary.tx_count}`,
                `Days active: ${output.usage_summary.days_active}`,
                `Unique contracts: ${output.usage_summary.unique_contracts}`,
                `Behavior tag: ${insights.behavior_tag}`,
                `Score: ${insights.overall_score}/100`,
                `Farming probability: ${Math.round(insights.farming_probability * 100)}%`
              ].join('\n')
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = data?.choices?.[0]?.message?.content ?? '';
      const normalized = normalizeText(content);
      if (!normalized) {
        throw new Error('OpenAI returned empty commentary');
      }

      return limitToTwoSentences(normalized);
    } finally {
      clearTimeout(timeout);
    }
  }
}

