import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    clearMocks: true,
    env: {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/indexflow_test",
      RPC_URL: "http://localhost:8545",
      CHAIN_ID: "sepolia",
      PORT: "4010"
    }
  },
  resolve: {
    alias: {
      "@config": path.resolve(__dirname, "src/config"),
      "@db": path.resolve(__dirname, "src/db"),
      "@graphql": path.resolve(__dirname, "src/graphql"),
      "@indexer": path.resolve(__dirname, "src/indexer"),
      "@proofs": path.resolve(__dirname, "src/proofs"),
      "@telemetry": path.resolve(__dirname, "src/telemetry"),
      "@utils": path.resolve(__dirname, "src/utils")
    }
  }
});
