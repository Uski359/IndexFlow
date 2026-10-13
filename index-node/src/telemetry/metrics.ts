import client from "prom-client";
import type { ApolloServerPlugin } from "@apollo/server";
import { env } from "@config/env";

const register = new client.Registry();
register.setDefaultLabels({
  app: "indexflow-index-node",
  chainId: env.CHAIN_ID
});

client.collectDefaultMetrics({
  register,
  prefix: "indexflow_"
});

const indexedBlocksTotal = new client.Counter({
  name: "indexflow_indexed_blocks_total",
  help: "Total number of L1/L2 blocks persisted by the indexer",
  labelNames: ["chainId"],
  registers: [register]
});

const indexedTransfersTotal = new client.Counter({
  name: "indexflow_erc20_transfers_total",
  help: "Total number of ERC20 transfer logs persisted by the indexer",
  labelNames: ["chainId"],
  registers: [register]
});

const indexedTransactionsTotal = new client.Counter({
  name: "indexflow_transactions_total",
  help: "Total number of transactions persisted by the indexer",
  labelNames: ["chainId"],
  registers: [register]
});

const lastIndexedBlockGauge = new client.Gauge({
  name: "indexflow_last_indexed_block",
  help: "Height of the last fully indexed block",
  labelNames: ["chainId"],
  registers: [register]
});

const safeBlockGauge = new client.Gauge({
  name: "indexflow_safe_block_number",
  help: "Latest block number considered final after confirmations",
  labelNames: ["chainId"],
  registers: [register]
});

const onchainSubmissionsTotal = new client.Counter({
  name: "indexflow_onchain_submissions_total",
  help: "Number of coordinator submissions relayed on-chain",
  labelNames: ["chainId", "result"],
  registers: [register]
});

const rpcProviderRateLimitTotal = new client.Counter({
  name: "indexflow_rpc_provider_rate_limit_total",
  help: "Number of rate limit responses received from RPC providers",
  labelNames: ["chainId", "url"],
  registers: [register]
});

const graphqlRequestsTotal = new client.Counter({
  name: "indexflow_graphql_requests_total",
  help: "Total GraphQL requests served",
  labelNames: ["operation", "success"],
  registers: [register]
});

const graphqlDurationSeconds = new client.Histogram({
  name: "indexflow_graphql_request_duration_seconds",
  help: "GraphQL request duration in seconds",
  labelNames: ["operation", "success"],
  buckets: [0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register]
});

const indexerErrorsTotal = new client.Counter({
  name: "indexflow_indexer_errors_total",
  help: "Total number of indexer errors by stage",
  labelNames: ["chainId", "stage"],
  registers: [register]
});

export function recordIndexerBatchMetrics(stats: {
  blocks: number;
  transactions: number;
  transfers: number;
  lastIndexedBlock: number;
  safeBlockNumber: number;
}) {
  indexedBlocksTotal.inc({ chainId: env.CHAIN_ID }, stats.blocks);
  indexedTransactionsTotal.inc({ chainId: env.CHAIN_ID }, stats.transactions);
  indexedTransfersTotal.inc({ chainId: env.CHAIN_ID }, stats.transfers);
  lastIndexedBlockGauge.set({ chainId: env.CHAIN_ID }, stats.lastIndexedBlock);
  safeBlockGauge.set({ chainId: env.CHAIN_ID }, stats.safeBlockNumber);
}

export type OnchainSubmissionResult = "ok" | "error";

export function recordOnchainSubmission(result: OnchainSubmissionResult) {
  onchainSubmissionsTotal.inc({ chainId: env.CHAIN_ID, result });
}

export function recordRpcProviderRateLimit(url: string) {
  rpcProviderRateLimitTotal.inc({ chainId: env.CHAIN_ID, url });
}

export type IndexerErrorStage = "cycle" | "health";

export function recordIndexerError(stage: IndexerErrorStage = "cycle") {
  indexerErrorsTotal.inc({ chainId: env.CHAIN_ID, stage });
}

export const graphQLMetricsPlugin: ApolloServerPlugin = {
  async requestDidStart(requestContext) {
    const operation = requestContext.request.operationName ?? "anonymous";
    const stop = graphqlDurationSeconds.startTimer();

    return {
      async willSendResponse(ctx) {
        const success = !ctx.errors || ctx.errors.length === 0;
        const successLabel = success ? "true" : "false";
        graphqlRequestsTotal.inc({
          operation,
          success: successLabel
        });
        stop({
          operation,
          success: successLabel
        });
      }
    };
  }
};

export async function collectMetrics(): Promise<string> {
  return register.metrics();
}

export function metricsContentType(): string {
  return register.contentType;
}
