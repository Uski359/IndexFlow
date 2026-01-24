export type VerifiedFilter = 'all' | 'true' | 'false';

export type InsightTagFilter = 'all' | 'organic' | 'suspected_farm' | 'inactive' | 'mixed';

export type FilterState = {
  verified: VerifiedFilter;
  minTxCount: number;
  minDaysActive: number;
  minUniqueContracts: number;
  minOverallScore: number;
  maxFarmingProbability: number;
  tag: InsightTagFilter;
  cachedOnly: boolean;
};

type FiltersProps = {
  value: FilterState;
  onChange: (next: FilterState) => void;
  disabled?: boolean;
};

const clampNumber = (value: string, max?: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  const clamped = Math.max(0, parsed);
  if (typeof max === 'number') {
    return Math.min(clamped, max);
  }
  return clamped;
};

const Filters = ({ value, onChange, disabled = false }: FiltersProps) => {
  const update = (patch: Partial<FilterState>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Verified filter
          <select
            value={value.verified}
            onChange={(event) =>
              update({ verified: event.target.value as VerifiedFilter })
            }
            disabled={disabled}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          >
            <option value="all">All</option>
            <option value="true">Verified</option>
            <option value="false">Not verified</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Min tx count
          <input
            type="number"
            min={0}
            value={value.minTxCount}
            onChange={(event) => update({ minTxCount: clampNumber(event.target.value) })}
            disabled={disabled}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Min days active
          <input
            type="number"
            min={0}
            value={value.minDaysActive}
            onChange={(event) =>
              update({ minDaysActive: clampNumber(event.target.value) })
            }
            disabled={disabled}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Min unique contracts
          <input
            type="number"
            min={0}
            value={value.minUniqueContracts}
            onChange={(event) =>
              update({ minUniqueContracts: clampNumber(event.target.value) })
            }
            disabled={disabled}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Min overall score
          <input
            type="number"
            min={0}
            max={100}
            value={value.minOverallScore}
            onChange={(event) =>
              update({ minOverallScore: clampNumber(event.target.value, 100) })
            }
            disabled={disabled}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Max farming probability (%)
          <input
            type="number"
            min={0}
            max={100}
            value={value.maxFarmingProbability}
            onChange={(event) =>
              update({ maxFarmingProbability: clampNumber(event.target.value, 100) })
            }
            disabled={disabled}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Insight tag
          <select
            value={value.tag}
            onChange={(event) =>
              update({ tag: event.target.value as InsightTagFilter })
            }
            disabled={disabled}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          >
            <option value="all">All</option>
            <option value="organic">Organic</option>
            <option value="suspected_farm">Suspected farm</option>
            <option value="inactive">Inactive</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={value.cachedOnly}
          onChange={(event) => update({ cachedOnly: event.target.checked })}
          disabled={disabled}
          className="h-4 w-4 rounded border-white/20 bg-black/30"
        />
        Show cached only
      </label>
    </div>
  );
};

export default Filters;
