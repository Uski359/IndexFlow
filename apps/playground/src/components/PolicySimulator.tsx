'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  FileUp,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
  ShieldX
} from 'lucide-react';
import { isAddress } from 'viem';

import { PolicyKitClient, type DecisionReceipt, type PolicyConfig } from '@policykit/sdk';

type ValueMode = 'eth' | 'x402';

const initialAgentAddress = '0x1111111111111111111111111111111111111111';
const initialTargetContract = '0x0000000000000000000000000000000000000001';
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

const inputClassName =
  'mt-2 w-full rounded-xl border border-border bg-background/80 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-accent/70 focus:ring-2 focus:ring-accent/15';

const decisionStyle: Record<
  DecisionReceipt['status'],
  { label: string; className: string; icon: typeof ShieldCheck; color: string }
> = {
  ALLOW: {
    label: 'Allowed',
    className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    icon: ShieldCheck,
    color: '#34d399'
  },
  REVIEW: {
    label: 'Needs review',
    className: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
    icon: ShieldAlert,
    color: '#fbbf24'
  },
  DENY: {
    label: 'Denied',
    className: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
    icon: ShieldX,
    color: '#fb7185'
  }
};

const parseAllowedContracts = (value: string): string[] =>
  value
    .split(/[\n,]/u)
    .map((address) => address.trim())
    .filter(Boolean);

const PolicySimulator = () => {
  const [agentAddress, setAgentAddress] = useState(initialAgentAddress);
  const [targetContract, setTargetContract] = useState(initialTargetContract);
  const [calldata, setCalldata] = useState('0x');
  const [valueMode, setValueMode] = useState<ValueMode>('eth');
  const [executionValue, setExecutionValue] = useState('0.05');
  const [maxTxValueEth, setMaxTxValueEth] = useState('0.25');
  const [allowedContractsText, setAllowedContractsText] = useState(initialTargetContract);
  const [allowlistEnabled, setAllowlistEnabled] = useState(true);
  const [requiredZkTlsProof, setRequiredZkTlsProof] = useState(false);
  const [zkTlsProof, setZkTlsProof] = useState<unknown>();
  const [proofFileName, setProofFileName] = useState('');
  const [minReputationScore, setMinReputationScore] = useState('0');
  const [formError, setFormError] = useState('');
  const [receipt, setReceipt] = useState<DecisionReceipt | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleProofUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (typeof parsed !== 'object' || parsed === null) {
        throw new TypeError('The proof file must contain a JSON object.');
      }
      setZkTlsProof(parsed);
      setProofFileName(file.name);
      setFormError('');
    } catch (error) {
      setZkTlsProof(undefined);
      setProofFileName('');
      setFormError(error instanceof Error ? error.message : 'Could not read proof file.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setReceipt(null);

    if (!isAddress(agentAddress, { strict: false })) {
      setFormError('Enter a valid EVM agent address.');
      return;
    }
    if (!isAddress(targetContract, { strict: false })) {
      setFormError('Enter a valid EVM target contract address.');
      return;
    }

    const allowedContracts = parseAllowedContracts(allowedContractsText);
    if (allowlistEnabled && allowedContracts.some((address) => !isAddress(address, { strict: false }))) {
      setFormError('Every allowlist entry must be a valid EVM address.');
      return;
    }

    const executionAmount = Number(executionValue);
    const maxValue = Number(maxTxValueEth);
    const reputationFloor = Number(minReputationScore);
    if (!Number.isFinite(executionAmount) || executionAmount < 0) {
      setFormError('Execution value must be a non-negative number.');
      return;
    }
    if (!Number.isFinite(maxValue) || maxValue < 0) {
      setFormError('Max ETH limit must be a non-negative number.');
      return;
    }
    if (!Number.isFinite(reputationFloor) || reputationFloor < 0 || reputationFloor > 100) {
      setFormError('Minimum reputation must be between 0 and 100.');
      return;
    }

    const policy: PolicyConfig = {
      maxTxValueEth: maxValue,
      allowedContracts: allowlistEnabled ? allowedContracts : [targetContract],
      requiredZkTlsProof,
      minReputationScore: reputationFloor
    };
    const client = new PolicyKitClient(backendUrl, policy);

    setIsEvaluating(true);
    try {
      const result = await client.evaluateTransaction({
        agentAddress,
        targetContract,
        calldata,
        txValueEth: valueMode === 'eth' ? executionAmount : 0,
        ...(valueMode === 'x402' ? { x402Price: executionAmount } : {}),
        ...(zkTlsProof !== undefined ? { zkTlsProof } : {})
      });
      setReceipt(result);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Policy evaluation failed.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const status = receipt ? decisionStyle[receipt.status] : null;
  const StatusIcon = status?.icon;
  const meterColor = status?.color ?? '#38bdf8';
  const score = receipt?.riskScore ?? 0;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-border/80 bg-card/90 p-5 shadow-card ring-1 ring-white/5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Simulation input</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Transaction context</h2>
          </div>
          <span className="rounded-lg border border-border bg-background/70 px-2.5 py-1.5 font-mono text-xs text-slate-400">
            Base · ERC-8004
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-200">
            Agent address
            <input
              className={`${inputClassName} font-mono text-xs`}
              value={agentAddress}
              onChange={(event) => setAgentAddress(event.target.value)}
              placeholder="0x..."
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Target contract
            <input
              className={`${inputClassName} font-mono text-xs`}
              value={targetContract}
              onChange={(event) => setTargetContract(event.target.value)}
              placeholder="0x..."
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-200">
          Calldata
          <textarea
            className={`${inputClassName} min-h-24 resize-y font-mono text-xs leading-5`}
            value={calldata}
            onChange={(event) => setCalldata(event.target.value)}
            placeholder="0x..."
            spellCheck={false}
          />
        </label>

        <section className="space-y-4 rounded-2xl border border-border/80 bg-background/45 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Execution value</p>
              <p className="mt-1 text-xs text-slate-400">Select the amount type used for this simulation.</p>
            </div>
            <div className="inline-flex rounded-xl border border-border bg-background p-1" role="group" aria-label="Execution value type">
              {(['eth', 'x402'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setValueMode(mode)}
                  aria-pressed={valueMode === mode}
                  className={`min-w-20 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    valueMode === mode
                      ? 'bg-white text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'eth' ? 'ETH' : 'x402 USD'}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm font-medium text-slate-200">
            {valueMode === 'eth' ? 'Transaction value (ETH)' : 'x402 price (USD)'}
            <input
              className={inputClassName}
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={executionValue}
              onChange={(event) => setExecutionValue(event.target.value)}
            />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-border/80 bg-background/45 p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold text-white">Policy rules</p>
            <p className="mt-1 text-xs text-slate-400">Local limits are evaluated before the backend risk check.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-200">
              Max ETH limit
              <input
                className={inputClassName}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={maxTxValueEth}
                onChange={(event) => setMaxTxValueEth(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-200">
              Minimum reputation
              <input
                className={inputClassName}
                type="number"
                min="0"
                max="100"
                step="1"
                value={minReputationScore}
                onChange={(event) => setMinReputationScore(event.target.value)}
              />
            </label>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 px-3.5 py-3">
            <span>
              <span className="block text-sm font-medium text-slate-200">Restrict to allowlist</span>
              <span className="mt-0.5 block text-xs text-slate-500">Only listed target contracts can pass.</span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-sky-400"
              checked={allowlistEnabled}
              onChange={(event) => setAllowlistEnabled(event.target.checked)}
            />
          </label>
          {allowlistEnabled ? (
            <label className="block text-sm font-medium text-slate-200">
              Allowed contracts
              <textarea
                className={`${inputClassName} min-h-20 resize-y font-mono text-xs leading-5`}
                value={allowedContractsText}
                onChange={(event) => setAllowedContractsText(event.target.value)}
                placeholder="One address per line"
                spellCheck={false}
              />
            </label>
          ) : null}

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 px-3.5 py-3">
            <span>
              <span className="block text-sm font-medium text-slate-200">Require zkTLS proof</span>
              <span className="mt-0.5 block text-xs text-slate-500">Attach a JSON proof when this rule is active.</span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-sky-400"
              checked={requiredZkTlsProof}
              onChange={(event) => setRequiredZkTlsProof(event.target.checked)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-accent/50 hover:text-white">
              <FileUp size={16} className="text-accent" />
              {proofFileName ? 'Replace proof JSON' : 'Attach proof JSON'}
              <input className="sr-only" type="file" accept="application/json,.json" onChange={handleProofUpload} />
            </label>
            {proofFileName ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-200">
                <Check size={14} /> {proofFileName}
              </span>
            ) : (
              <span className="text-xs text-slate-500">Optional unless required above</span>
            )}
          </div>
        </section>

        {formError ? (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 px-3.5 py-3 text-sm text-rose-200">
            <AlertCircle size={17} className="mt-0.5 shrink-0" /> {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isEvaluating}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-sky-200 disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:min-w-52"
        >
          {isEvaluating ? <LoaderCircle size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
          {isEvaluating ? 'Evaluating...' : 'Evaluate Policy'}
        </button>
      </form>

      <aside className="rounded-3xl border border-border/80 bg-card/90 p-5 shadow-card ring-1 ring-white/5 sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Evaluation output</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Decision receipt</h2>
          </div>
          {status && StatusIcon ? (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${status.className}`}>
              <StatusIcon size={15} /> {status.label}
            </span>
          ) : (
            <span className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-slate-400">
              Awaiting run
            </span>
          )}
        </div>

        {receipt ? (
          <div className="space-y-6 pt-6" aria-live="polite">
            <div className="flex items-center gap-5 rounded-2xl border border-border/70 bg-background/50 p-4">
              <div
                className="grid h-24 w-24 shrink-0 place-items-center rounded-full p-2"
                style={{
                  background: `conic-gradient(${meterColor} ${score * 3.6}deg, rgba(148,163,184,.13) 0deg)`
                }}
                role="img"
                aria-label={`Sybil risk score ${score} out of 100`}
              >
                <div className="grid h-full w-full place-items-center rounded-full bg-card text-center">
                  <div>
                    <span className="block text-2xl font-bold tabular-nums text-white">{score}</span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Risk / 100</span>
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Sybil risk assessment</p>
                <p className="mt-1 text-sm leading-5 text-slate-400">{receipt.reason}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Rule summary</p>
              <RuleResult
                label="Target contract"
                passed={!allowlistEnabled || parseAllowedContracts(allowedContractsText).some((address) => address.toLowerCase() === targetContract.toLowerCase())}
              />
              <RuleResult
                label={valueMode === 'eth' ? 'Transaction budget' : 'x402 budget'}
                passed={Number(executionValue) <= Number(maxTxValueEth)}
              />
              <RuleResult label="zkTLS proof" passed={!requiredZkTlsProof || zkTlsProof !== undefined} />
              <RuleResult label="Sybil risk threshold" passed={receipt.riskScore < 70} />
              {receipt.reputationScore !== undefined ? (
                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm">
                  <span className="text-slate-400">Weighted reputation</span>
                  <span className="font-semibold tabular-nums text-white">{receipt.reputationScore.toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            <dl className="grid gap-3 border-t border-border/70 pt-5 text-xs sm:grid-cols-2">
              <ReceiptDatum label="Agent" value={agentAddress} mono />
              <ReceiptDatum label="Target" value={targetContract} mono />
              <ReceiptDatum
                label="Execution"
                value={`${executionValue} ${valueMode === 'eth' ? 'ETH' : 'USD'}`}
              />
              <ReceiptDatum label="Evaluated" value={new Date(receipt.timestamp).toLocaleString()} />
              {receipt.signature ? <ReceiptDatum label="Signature" value={receipt.signature} mono /> : null}
            </dl>
          </div>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center px-4 py-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-border bg-background/70 text-accent">
              <ShieldCheck size={24} />
            </div>
            <h3 className="mt-5 text-base font-semibold text-white">Ready to evaluate</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
              Submit the transaction context to receive a policy decision and Sybil-risk score.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
};

const RuleResult = ({ label, passed }: { label: string; passed: boolean }) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="text-slate-400">{label}</span>
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${passed ? 'text-emerald-200' : 'text-rose-200'}`}>
      {passed ? <Check size={14} /> : <ShieldX size={14} />}
      {passed ? 'Pass' : 'Triggered'}
    </span>
  </div>
);

const ReceiptDatum = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className="min-w-0">
    <dt className="text-slate-500">{label}</dt>
    <dd className={`mt-1 truncate text-slate-200 ${mono ? 'font-mono' : ''}`} title={value}>
      {value}
    </dd>
  </div>
);

export default PolicySimulator;