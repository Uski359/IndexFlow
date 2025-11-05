const Q96 = 2n ** 96n;

export const TICK_SPACING_BY_FEE: Record<number, number> = {
  100: 1,
  500: 10,
  3000: 60,
  10000: 200,
};

export function getTickSpacing(fee: number): number {
  const spacing = TICK_SPACING_BY_FEE[fee];
  if (!spacing) {
    throw new Error(`Unsupported fee tier ${fee}. Supported: ${Object.keys(TICK_SPACING_BY_FEE).join(", ")}`);
  }
  return spacing;
}

export function encodePriceSqrt(amount1: bigint, amount0: bigint): bigint {
  if (amount0 === 0n) {
    throw new Error("amount0 cannot be zero");
  }
  const ratioX192 = (amount1 << 192n) / amount0;
  return sqrtBigInt(ratioX192);
}

export function priceToSqrtPriceX96(price: number): bigint {
  if (price <= 0) {
    throw new Error("price must be positive");
  }
  const numerator = BigInt(Math.round(price * 1e12)) * (10n ** 24n);
  const denominator = 1n * (10n ** 24n);
  return encodePriceSqrt(numerator, denominator);
}

export function nearestUsableTick(tick: number, tickSpacing: number): number {
  if (tickSpacing <= 0) {
    throw new Error("tickSpacing must be positive");
  }
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  return rounded;
}

const LN_1_0001 = Math.log(1.0001);

export function priceToTick(price: number): number {
  if (price <= 0) {
    throw new Error("price must be positive");
  }
  const tick = Math.log(price) / LN_1_0001;
  return Math.round(tick);
}

export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

export function ratioToSqrtPriceX96(
  priceNumerator: bigint,
  priceDenominator: bigint,
  decimalsToken0: number,
  decimalsToken1: number,
  invert: boolean
): bigint {
  if (priceDenominator === 0n) {
    throw new Error("priceDenominator cannot be zero");
  }
  const scale0 = 10n ** BigInt(decimalsToken0);
  const scale1 = 10n ** BigInt(decimalsToken1);

  if (!invert) {
    const amount1 = scale1 * priceNumerator;
    const amount0 = scale0 * priceDenominator;
    return encodePriceSqrt(amount1, amount0);
  }
  const amount1 = scale1 * priceDenominator;
  const amount0 = scale0 * priceNumerator;
  return encodePriceSqrt(amount1, amount0);
}

export function sqrtBigInt(value: bigint): bigint {
  if (value < 0n) {
    throw new Error("sqrt only works on non-negative inputs");
  }
  if (value < 2n) {
    return value;
  }

  let x0 = value;
  let x1 = (value >> 1n) + 1n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (value / x1 + x1) >> 1n;
  }
  return x0;
}

export function tickFromPrice(price: number, tickSpacing: number): number {
  const rawTick = priceToTick(price);
  return nearestUsableTick(rawTick, tickSpacing);
}

export function priceFromTick(tick: number): number {
  return tickToPrice(tick);
}

export { Q96 };
