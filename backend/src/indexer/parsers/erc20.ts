import { Interface, type Log } from "ethers";

export const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const iface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

export interface ParsedTransfer {
  from: string;
  to: string;
  value: string;
}

export const parseTransfer = (log: Log): ParsedTransfer => {
  const parsed = iface.parseLog(log);

  if (!parsed || !parsed.args) {
    throw new Error("Failed to parse Transfer log");
  }

  const from = parsed.args.from as string;
  const to = parsed.args.to as string;
  const value = parsed.args.value.toString();

  return { from, to, value };
};
