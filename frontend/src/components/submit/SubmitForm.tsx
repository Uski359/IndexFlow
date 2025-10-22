'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { estimateReward } from '@/lib/rewards';
import { apiFetch } from '@/lib/apiClient';
import type { DataEntry } from '@/types/protocol';

const submissionSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  datasetType: z.enum(['on-chain', 'off-chain']),
  dataFormat: z.enum(['json', 'csv', 'parquet']),
  sourceUrl: z
    .string()
    .url('Source URL must be a valid URL')
    .optional()
    .or(z.literal('')),
  sizeInMb: z.coerce.number().min(1, 'Size must be at least 1 MB'),
  qualityScore: z.coerce.number().min(0).max(100),
  reputationScore: z.coerce.number().min(0).max(100),
  stakeAmount: z.coerce.number().min(0),
  tags: z.string().optional(),
  sample: z.string().optional(),
  expectedSchema: z.string().optional(),
  sqlQuery: z.string().optional()
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

interface ValidationSummary {
  valid: boolean;
  datasetHash: string;
  sqlHash?: string;
  issues: string[];
  inferredSchema: Record<string, string>;
  rowCount: number;
}

interface SubmissionResponse {
  dataset: DataEntry;
  stakeRequired: number;
  estimatedReward: number;
  validation?: ValidationSummary;
}

export function SubmitForm() {
  const { address } = useAccount();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      datasetType: 'on-chain',
      dataFormat: 'json',
      sourceUrl: '',
      sizeInMb: 100,
      qualityScore: 85,
      reputationScore: 70,
      stakeAmount: 1000,
      tags: '',
      sample: '',
      expectedSchema: '',
      sqlQuery: ''
    }
  });

  const watched = watch();
  const estimatedReward = useMemo(() => {
    try {
      return estimateReward({
        datasetType: watched.datasetType,
        sizeInMb: Number(watched.sizeInMb),
        qualityScore: Number(watched.qualityScore),
        reputationScore: Number(watched.reputationScore),
        stakeAmount: Number(watched.stakeAmount)
      });
    } catch {
      return 0;
    }
  }, [watched]);

  const { mutate, isPending, data } = useMutation<SubmissionResponse, Error, SubmissionFormValues>({
    mutationFn: async (values) => {
      if (!address) {
        throw new Error('Connect your wallet before submitting a dataset.');
      }

      const tags = (values.tags ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (!tags.includes(values.dataFormat)) {
        tags.push(values.dataFormat);
      }

      const source = values.sourceUrl?.trim();
      let expectedSchema: Record<string, string> | undefined;
      if (values.expectedSchema?.trim()) {
        try {
          const parsed = JSON.parse(values.expectedSchema);
          if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
            throw new Error();
          }
          expectedSchema = Object.fromEntries(
            Object.entries(parsed).map(([key, value]) => [key, String(value)])
          );
        } catch {
          throw new Error(
            'Expected schema must be valid JSON (e.g. {"address":"string","amount":"numeric"}).'
          );
        }
      }

      const sqlQuery = values.sqlQuery?.trim() ? values.sqlQuery.trim() : undefined;

      const payload = {
        metadata: {
          name: values.name,
          description: values.description,
          tags,
          datasetType: values.datasetType,
          ...(source ? { source } : {}),
          sizeInMb: Number(values.sizeInMb)
        },
        submitter: address,
        stakeAmount: Number(values.stakeAmount),
        dataFormat: values.dataFormat,
        sample: values.sample?.trim() ? values.sample.trim() : undefined,
        expectedSchema,
        sqlQuery
      };

      return apiFetch<SubmissionResponse>('/data/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: (result) => {
      toast.success(
        `Dataset submitted! Stake at least ${result.stakeRequired} IndexFlowT to activate.`
      );
      reset();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <form
          className="grid gap-4"
          onSubmit={handleSubmit((values) => mutate(values))}
          noValidate
        >
          <div>
            <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
              Dataset name
              <input
                {...register('name')}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
                placeholder="Ethereum DEX Swaps"
              />
            </label>
            {errors.name && <FormError message={errors.name.message} />}
          </div>

          <div>
            <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
              Description
              <textarea
                {...register('description')}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
                rows={3}
                placeholder="Normalized swaps and liquidity events from major DEXes on Ethereum."
              />
            </label>
            {errors.description && <FormError message={errors.description.message} />}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldSelect
              label="Dataset Type"
              options={[
                { value: 'on-chain', label: 'On-chain' },
                { value: 'off-chain', label: 'Off-chain' }
              ]}
              {...register('datasetType')}
            />
            <FieldSelect
              label="Data Format"
              options={[
                { value: 'json', label: 'JSON' },
                { value: 'csv', label: 'CSV' },
                { value: 'parquet', label: 'Parquet' }
              ]}
              {...register('dataFormat')}
            />
            <div>
              <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
                Size (MB)
                <input
                  type="number"
                  min={1}
                  {...register('sizeInMb')}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </label>
              {errors.sizeInMb && <FormError message={errors.sizeInMb.message} />}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Quality Score"
              suffix="%"
              min={0}
              max={100}
              registerProps={register('qualityScore')}
              error={errors.qualityScore?.message}
            />
            <NumberField
              label="Reputation Score"
              suffix="%"
              min={0}
              max={100}
              registerProps={register('reputationScore')}
              error={errors.reputationScore?.message}
            />
            <NumberField
              label="Stake Amount"
              suffix="IndexFlowT"
              min={0}
              registerProps={register('stakeAmount')}
              error={errors.stakeAmount?.message}
            />
          </div>

          <div>
            <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
              Source URL (optional)
              <input
                {...register('sourceUrl')}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
                placeholder="https://"
              />
            </label>
            {errors.sourceUrl && <FormError message={errors.sourceUrl.message} />}
          </div>

          <div>
            <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
              Tags (comma separated)
              <input
                {...register('tags')}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
                placeholder="dex, defi, ethereum"
              />
            </label>
          </div>

          <div>
            <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
              Sample JSON / Schema (optional)
              <textarea
                {...register('sample')}
                className="font-mono rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
                rows={6}
                placeholder='{"address":"0x...","amount":12345}'
              />
            </label>
          </div>

          <div>
            <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
              Expected Schema JSON (optional)
              <textarea
                {...register('expectedSchema')}
                className="font-mono rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
                rows={4}
                placeholder='{"address":"string","amount":"numeric"}'
              />
            </label>
          </div>

          <div>
            <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
              Reference SQL Query (optional)
              <textarea
                {...register('sqlQuery')}
                className="font-mono rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
                rows={6}
                placeholder="SELECT date, COUNT(*) AS swaps FROM dex_trades WHERE date >= CURRENT_DATE - INTERVAL '7 DAY';"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/50">
              Submissions trigger Proof of SQL verification. Validators reference your schema to
              replicate results.
            </p>
            <Button type="submit" loading={isPending} className="w-full sm:w-auto" disabled={isPending}>
              {isPending ? 'Submitting...' : 'Submit Dataset'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Estimated Reward</h3>
        <p className="text-sm text-white/60">
          Based on current validator multipliers and staking boost.
        </p>
        <div className="rounded-2xl border border-brand/40 bg-brand/10 px-6 py-8 text-center">
          <p className="text-xs uppercase tracking-wide text-brand-light">Potential Reward</p>
          <p className="mt-2 text-4xl font-bold text-white">{estimatedReward} IndexFlowR</p>
        </div>
        {data && data.dataset && (
          <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
            <p>
              <span className="text-white/40">Status:</span> {data.dataset.status}
            </p>
            <p>
              <span className="text-white/40">Stake Requirement:</span>{' '}
              {data.stakeRequired} IndexFlowT
            </p>
            <p>
              <span className="text-white/40">Dataset ID:</span> {data.dataset.id}
            </p>
            <p>
              <span className="text-white/40">Dataset Hash:</span> {data.dataset.hash}
            </p>
            {data.validation && (
              <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="font-semibold text-white">Validator Summary</p>
                <p className="text-xs text-white/60">
                  Status:{' '}
                  <span className={data.validation.valid ? 'text-success' : 'text-danger'}>
                    {data.validation.valid ? 'Valid' : 'Review Issues'}
                  </span>
                </p>
                <p className="text-xs text-white/60">
                  Inferred Rows: {data.validation.rowCount.toLocaleString()}
                </p>
                {data.validation.sqlHash && (
                  <p className="text-xs text-white/60">SQL Hash: {data.validation.sqlHash}</p>
                )}
                {Object.keys(data.validation.inferredSchema).length > 0 && (
                  <div className="text-xs text-white/60">
                    <p className="font-semibold text-white">Inferred Schema</p>
                    <ul className="mt-1 space-y-1">
                      {Object.entries(data.validation.inferredSchema).map(([key, value]) => (
                        <li key={key}>
                          <span className="text-white/40">{key}:</span> {value}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.validation.issues.length > 0 && (
                  <ul className="space-y-1 text-xs text-danger">
                    {data.validation.issues.map((issue) => (
                      <li key={issue}>- {issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
        <Card>
          <h4 className="text-sm font-semibold text-white">Submission Checklist</h4>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-white/60">
            <li>Ensure data complies with on-chain/off-chain usage policies.</li>
            <li>Attach schema or JSON sample for Proof of SQL verification.</li>
            <li>Higher stake amounts unlock curator fast-tracking.</li>
          </ul>
        </Card>
      </Card>
    </div>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

interface FieldSelectProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  name?: string;
}

function FieldSelect({ label, options, ...rest }: FieldSelectProps & Record<string, unknown>) {
  return (
    <div>
      <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
        {label}
        <select
          {...rest}
          className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
        >
          {options.map((option) => (
            <option className="bg-[#0f0f1a]" value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  suffix?: string;
  min?: number;
  max?: number;
  registerProps: Record<string, unknown>;
  error?: string;
}

function NumberField({ label, suffix, error, registerProps, ...rest }: NumberFieldProps) {
  return (
    <div>
      <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
        {label}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/50">
          <input
            type="number"
            className="w-full bg-transparent text-white outline-none"
            {...registerProps}
            {...rest}
          />
          {suffix && <span className="text-xs text-white/50">{suffix}</span>}
        </div>
      </label>
      {error && <FormError message={error} />}
    </div>
  );
}
