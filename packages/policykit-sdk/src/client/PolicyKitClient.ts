import type { DecisionReceipt, EvaluationRequest, PolicyConfig } from '../types/index.js';

interface SybilCheckResult {
  riskScore: number;
  reputationScore?: number;
  isSybil?: boolean;
}

const SYBIL_CHECK_PATH = '/api/v1/sybil/check';
const SYBIL_REVIEW_THRESHOLD = 70;
const SYBIL_DENY_THRESHOLD = 90;
const SYBIL_REQUEST_TIMEOUT_MS = 10_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeRiskScore = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError('Sybil check response must include a non-negative numeric risk score');
  }

  const percentage = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, percentage));
};

const makeReceipt = (
  status: DecisionReceipt['status'],
  reason: string,
  riskScore = 0,
  reputationScore?: number
): DecisionReceipt => ({
  status,
  reason,
  riskScore,
  timestamp: Date.now(),
  ...(reputationScore !== undefined ? { reputationScore } : {})
});

export class PolicyKitClient {
  private readonly backendUrl: string;
  private readonly config?: PolicyConfig;

  constructor(backendUrl: string, config?: PolicyConfig) {
    const normalizedUrl = backendUrl.trim().replace(/\/+$/u, '');
    if (!/^https?:\/\//iu.test(normalizedUrl)) {
      throw new TypeError('backendUrl must be an absolute HTTP or HTTPS URL');
    }
    if (
      config &&
      (!Number.isFinite(config.maxTxValueEth) ||
        config.maxTxValueEth < 0 ||
        !Number.isFinite(config.minReputationScore) ||
        config.minReputationScore < 0 ||
        config.minReputationScore > 100)
    ) {
      throw new TypeError('PolicyConfig budget and reputation score must be valid non-negative values');
    }

    this.backendUrl = normalizedUrl;
    this.config = config
      ? {
          ...config,
          allowedContracts: config.allowedContracts.map((contract) => contract.trim().toLowerCase())
        }
      : undefined;
  }

  async evaluateTransaction(request: EvaluationRequest): Promise<DecisionReceipt> {
    if (!request.agentAddress.trim() || !request.targetContract.trim()) {
      return makeReceipt('DENY', 'Agent address and target contract are required.');
    }
    if (!Number.isFinite(request.txValueEth) || request.txValueEth < 0) {
      return makeReceipt('DENY', 'Transaction value must be a non-negative finite number.');
    }
    if (
      request.x402Price !== undefined &&
      (!Number.isFinite(request.x402Price) || request.x402Price < 0)
    ) {
      return makeReceipt('DENY', 'x402 price must be a non-negative finite number.');
    }

    if (
      this.config &&
      !this.config.allowedContracts.includes(request.targetContract.trim().toLowerCase())
    ) {
      return makeReceipt('DENY', 'Target contract is not in the policy allowlist.');
    }

    if (
      this.config &&
      (request.txValueEth > this.config.maxTxValueEth ||
        (request.x402Price !== undefined && request.x402Price > this.config.maxTxValueEth))
    ) {
      return makeReceipt('DENY', 'Transaction value or x402 price exceeds the configured budget.');
    }

    if (this.config?.requiredZkTlsProof && request.zkTlsProof == null) {
      return makeReceipt('DENY', 'A zkTLS proof is required by the configured policy.');
    }

    let sybilResult: SybilCheckResult;
    try {
      sybilResult = await this.checkSybilRisk(request.agentAddress);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown backend error';
      return makeReceipt('REVIEW', `Sybil risk check unavailable: ${reason}`, 100);
    }

    if (sybilResult.isSybil || sybilResult.riskScore >= SYBIL_DENY_THRESHOLD) {
      return makeReceipt(
        'DENY',
        'Agent has a high Sybil risk.',
        sybilResult.riskScore,
        sybilResult.reputationScore
      );
    }
    if (sybilResult.riskScore >= SYBIL_REVIEW_THRESHOLD) {
      return makeReceipt(
        'REVIEW',
        'Agent Sybil risk requires manual review.',
        sybilResult.riskScore,
        sybilResult.reputationScore
      );
    }
    if (
      this.config &&
      sybilResult.reputationScore === undefined &&
      this.config.minReputationScore > 0
    ) {
      return makeReceipt(
        'REVIEW',
        'Backend did not return a reputation score required by policy.',
        sybilResult.riskScore,
        sybilResult.reputationScore
      );
    }
    if (
      this.config &&
      sybilResult.reputationScore !== undefined &&
      sybilResult.reputationScore < this.config.minReputationScore
    ) {
      return makeReceipt(
        'REVIEW',
        'Agent reputation is below the configured minimum.',
        sybilResult.riskScore,
        sybilResult.reputationScore
      );
    }

    return makeReceipt(
      'ALLOW',
      'Transaction satisfies the configured policy.',
      sybilResult.riskScore,
      sybilResult.reputationScore
    );
  }

  private async checkSybilRisk(agentAddress: string): Promise<SybilCheckResult> {
    const response = await fetch(`${this.backendUrl}${SYBIL_CHECK_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ agentAddress }),
      signal: AbortSignal.timeout(SYBIL_REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`Backend returned HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload)) {
      throw new TypeError('Sybil check response must be an object');
    }

    const rawRiskScore = payload.riskScore ?? payload.sybilScore;
    const riskScore = normalizeRiskScore(rawRiskScore);
    const reputationScore = payload.reputationScore;
    if (
      reputationScore !== undefined &&
      (typeof reputationScore !== 'number' || !Number.isFinite(reputationScore))
    ) {
      throw new TypeError('Sybil check reputationScore must be numeric');
    }

    return {
      riskScore,
      ...(reputationScore !== undefined ? { reputationScore } : {}),
      ...(typeof payload.isSybil === 'boolean' ? { isSybil: payload.isSybil } : {})
    };
  }
}