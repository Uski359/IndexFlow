'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DatasetTable } from '@/components/data/DatasetTable';
import { safeApiFetch } from '@/lib/apiClient';
import { DataEntry } from '@/types/protocol';

interface SearchResponse {
  query: string;
  sql: string;
  results: DataEntry[];
}

export function SearchClient() {
  const [query, setQuery] = useState('');

  const { mutate, data, isPending } = useMutation<SearchResponse, Error, string>({
    mutationFn: async (payload) => {
      const trimmed = payload.trim();
      return safeApiFetch<SearchResponse>(
        `/search${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ''}`,
        {
          query: trimmed,
          sql: '',
          results: []
        }
      );
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="space-y-8">
      <Card>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutate(query.trim() || 'Popular DeFi datasets this week');
          }}
        >
          <label className="block text-sm font-medium text-white/70">
            Natural language prompt
            <textarea
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
              rows={3}
              placeholder="Find NFT collections with >10% floor price increase over the last 7 days..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/50">
              Requests are translated into SQL using our ElasticSearch + LLM co-pilot.
            </p>
            <Button type="submit" loading={isPending} className="w-full sm:w-auto">
              {isPending ? 'Searching...' : 'Run Semantic Search'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-white">SQL Preview</h2>
        <p className="mt-2 text-sm text-white/60">
          Review and edit the generated query before execution on IndexFlow subgraphs.
        </p>
        <pre className="mt-4 max-h-60 overflow-auto rounded-xl bg-black/50 p-4 text-xs text-brand-light">
{data?.sql ?? ''}
        </pre>
      </Card>

      <div>
        <h2 className="text-xl font-semibold text-white">Result Preview</h2>
        <p className="mt-2 text-sm text-white/60">
          Showing top datasets, aggregated by validator-supplied quality scores.
        </p>
        <div className="mt-4">
          <DatasetTable
            datasets={data?.results ?? []}
            isLoading={isPending}
            emptyMessage="No datasets matched the query."
          />
        </div>
      </div>
    </div>
  );
}
