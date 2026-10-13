import { describe, it, expect } from "vitest";

import { collectMetrics, metricsContentType } from "@telemetry/metrics";

describe("metrics export", () => {
  it("returns Prometheus formatted metrics with indexflow labels", async () => {
    const body = await collectMetrics();
    expect(body).toContain("indexflow_");
    expect(metricsContentType()).toContain("text/plain");
  });
});
