export type TransferCursorPayload = {
  id: string;
  blockNumber: number;
  txHash: string;
  logIndex?: number;
};

export const encodeCursor = (payload: TransferCursorPayload): string => {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
};

export const decodeCursor = (cursor: string): TransferCursorPayload => {
  const decoded = Buffer.from(cursor, "base64").toString("utf-8");

  let parsed: TransferCursorPayload;
  try {
    parsed = JSON.parse(decoded) as TransferCursorPayload;
  } catch {
    throw new Error("Invalid transfer cursor");
  }

  if (
    !parsed ||
    typeof parsed.id !== "string" ||
    typeof parsed.txHash !== "string" ||
    typeof parsed.blockNumber !== "number"
  ) {
    throw new Error("Invalid transfer cursor");
  }

  return parsed;
};

export const decodeCursorSafe = (cursor: string): TransferCursorPayload | null => {
  try {
    return decodeCursor(cursor);
  } catch {
    return null;
  }
};
