"use client";

import { useState } from "react";
import { env } from "@/lib/env";
import { Play } from "lucide-react";

const defaultQuery = `query IndexedBatches {
  indexedBatches(limit: 5) {
    id
    startBlock
    endBlock
    poiLeafCount
    totalTransfers
  }
}`;

export function GraphQLPlayground() {
  const [query, setQuery] = useState(defaultQuery);
  const [result, setResult] = useState<string>("{}");
  const [loading, setLoading] = useState(false);

  const execute = async () => {
    setLoading(true);
    try {
      const response = await fetch(env.NEXT_PUBLIC_INDEX_NODE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const json = await response.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (error) {
      setResult(JSON.stringify({ error: String(error) }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="demo" className="section-spacing">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-white md:text-4xl">Run a live query</h2>
            <p className="mt-2 text-sm text-white/60">
              Pointing at <span className="text-white">{env.NEXT_PUBLIC_INDEX_NODE_URL}</span>
            </p>
          </div>
          <button
            onClick={execute}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-indexflow-secondary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indexflow-secondary/20 hover:shadow-xl disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {loading ? "Running..." : "Run query"}
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-80 w-full rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-indexflow-primary"
          />
          <pre className="h-80 overflow-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-indexflow-accent">
            {result}
          </pre>
        </div>
      </div>
    </section>
  );
}
