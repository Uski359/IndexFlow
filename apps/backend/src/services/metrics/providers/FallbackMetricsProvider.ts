import type {
  GetWalletMetricsInput,
  IMetricsProvider,
  WalletMetricsV1
} from '../IMetricsProvider.js';
import { MetricsNotAvailableError } from '../errors.js';

export class FallbackMetricsProvider implements IMetricsProvider {
  constructor(private readonly providers: IMetricsProvider[]) {}

  async getWalletMetrics(input: GetWalletMetricsInput): Promise<WalletMetricsV1> {
    let lastError: MetricsNotAvailableError | undefined;

    for (const provider of this.providers) {
      try {
        return await provider.getWalletMetrics(input);
      } catch (error) {
        if (error instanceof MetricsNotAvailableError) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new MetricsNotAvailableError('metrics_not_available');
  }
}
